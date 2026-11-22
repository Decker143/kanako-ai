import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type WorkflowStep = {
  id?: string;
  order?: number;
  type?: string;
  label?: string;
  title?: string;
  description?: string;
  query?: string;
};

const safeActions = new Set(["create_task", "request_approval", "search_knowledge", "log_activity"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { data: membership } = await supabase.from("organization_members")
    .select("organization_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: "No organization workspace was found." }, { status: 403 });
  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can run workflows." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { workflowId?: string } | null;
  if (!body?.workflowId) return NextResponse.json({ error: "Select a workflow." }, { status: 400 });

  const { data: workflow } = await supabase.from("automation_workflows")
    .select("id,name,status,trigger_config,steps")
    .eq("id", body.workflowId).eq("organization_id", membership.organization_id).maybeSingle();
  if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  if (workflow.status !== "active") return NextResponse.json({ error: "Activate this workflow before running it." }, { status: 409 });
  const trigger = workflow.trigger_config as { type?: string } | null;
  if (trigger?.type !== "manual") return NextResponse.json({ error: "Only manual-trigger workflows can run in this release." }, { status: 409 });

  const steps = Array.isArray(workflow.steps) ? workflow.steps as WorkflowStep[] : [];
  if (!steps.length || steps.length > 20 || steps.some(step => !step.type || !safeActions.has(step.type))) {
    return NextResponse.json({ error: "This workflow contains unsupported steps. Use only the four supported internal actions." }, { status: 409 });
  }

  const { data: existingRun } = await supabase.from("workflow_runs").select("id")
    .eq("workflow_id", workflow.id).eq("organization_id", membership.organization_id)
    .eq("status", "running").limit(1).maybeSingle();
  if (existingRun) return NextResponse.json({ error: "This workflow already has a run in progress." }, { status: 409 });

  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase.from("workflow_runs").insert({
    organization_id: membership.organization_id, workflow_id: workflow.id,
    status: "running", input: { trigger: "manual", requested_by: user.id },
    output: { steps: [] }, started_at: startedAt,
  }).select("id").single();
  if (runError || !run) return NextResponse.json({ error: "Could not create the workflow run record." }, { status: 500 });

  const results: Array<{ step: number; type: string; status: string; summary: string; data?: unknown }> = [];
  try {
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const title = (step.title || step.label || "").trim().slice(0, 160);
      if (step.type === "create_task") {
        if (!title) throw new Error("Step " + (index + 1) + " is missing a task title.");
        const { data, error } = await supabase.from("tasks").insert({
          organization_id: membership.organization_id, title,
          description: (step.description || "").trim().slice(0, 2000) || null,
          priority: "medium", status: "queued", created_by: user.id,
        }).select("id,title").single();
        if (error || !data) throw new Error("Step " + (index + 1) + " could not create its task.");
        results.push({ step: index + 1, type: step.type, status: "succeeded", summary: "Created task: " + data.title, data });
      } else if (step.type === "request_approval") {
        if (!title) throw new Error("Step " + (index + 1) + " is missing an approval title.");
        const { data, error } = await supabase.from("approvals").insert({
          organization_id: membership.organization_id, title,
          description: (step.description || "").trim().slice(0, 2000) || "Created by workflow " + workflow.name,
          request_type: "automation", payload: { workflow_id: workflow.id, workflow_run_id: run.id },
          status: "pending", requested_by: user.id,
        }).select("id,title").single();
        if (error || !data) throw new Error("Step " + (index + 1) + " could not create its approval request.");
        results.push({ step: index + 1, type: step.type, status: "succeeded", summary: "Submitted approval: " + data.title, data });
      } else if (step.type === "search_knowledge") {
        const query = (step.query || step.label || "").trim().slice(0, 200);
        if (!query) throw new Error("Step " + (index + 1) + " is missing a Knowledge Base search query.");
        const { data, error } = await supabase.from("knowledge_documents")
          .select("id,title,content").eq("organization_id", membership.organization_id)
          .ilike("title", "%" + query.replace(/[%_]/g, "\\$&") + "%").limit(5);
        if (error) throw new Error("Step " + (index + 1) + " could not search the Knowledge Base.");
        results.push({ step: index + 1, type: step.type, status: "succeeded", summary: "Found " + (data?.length ?? 0) + " matching documents.", data: (data ?? []).map(doc => ({ id: doc.id, title: doc.title, excerpt: (doc.content || "").slice(0, 500) })) });
      } else if (step.type === "log_activity") {
        const message = (step.label || step.description || "").trim().slice(0, 500);
        if (!message) throw new Error("Step " + (index + 1) + " is missing an activity message.");
        const { error } = await supabase.from("activity_logs").insert({
          organization_id: membership.organization_id, actor_user_id: user.id,
          action: "workflow.custom_activity", entity_type: "workflow", entity_id: workflow.id,
          details: { workflow_run_id: run.id, message },
        });
        if (error) throw new Error("Step " + (index + 1) + " could not write its activity log.");
        results.push({ step: index + 1, type: step.type, status: "succeeded", summary: message });
      }
      await supabase.from("workflow_runs").update({ output: { steps: results } })
        .eq("id", run.id).eq("organization_id", membership.organization_id);
    }

    const { error: finishError } = await supabase.from("workflow_runs").update({
      status: "succeeded", output: { steps: results }, finished_at: new Date().toISOString(),
    }).eq("id", run.id).eq("organization_id", membership.organization_id);
    if (finishError) throw new Error("Workflow actions ran, but the final run status could not be saved.");

    await supabase.from("activity_logs").insert({
      organization_id: membership.organization_id, actor_user_id: user.id,
      action: "workflow.run_succeeded", entity_type: "workflow", entity_id: workflow.id,
      details: { workflow_run_id: run.id, steps_completed: results.length },
    });
    return NextResponse.json({ runId: run.id, status: "succeeded", steps: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow execution failed.";
    await supabase.from("workflow_runs").update({
      status: "failed", error: message, output: { steps: results }, finished_at: new Date().toISOString(),
    }).eq("id", run.id).eq("organization_id", membership.organization_id);
    await supabase.from("activity_logs").insert({
      organization_id: membership.organization_id, actor_user_id: user.id,
      action: "workflow.run_failed", entity_type: "workflow", entity_id: workflow.id,
      details: { workflow_run_id: run.id, steps_completed: results.length, error: message },
    });
    return NextResponse.json({ runId: run.id, status: "failed", error: message, steps: results }, { status: 500 });
  }
}
