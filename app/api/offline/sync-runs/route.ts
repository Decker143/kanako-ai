import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OfflineRun = {
  id?: string;
  agentId?: string;
  taskId?: string;
  output?: string;
  model?: string;
};

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again while online before syncing offline AI results." }, { status: 401 });

  const body = await request.json().catch(() => null) as { organizationId?: string; runs?: OfflineRun[] } | null;
  const organizationId = body?.organizationId;
  const runs = body?.runs;
  if (!organizationId || !Array.isArray(runs) || runs.length < 1 || runs.length > 50) {
    return NextResponse.json({ error: "A workspace and between 1 and 50 offline runs are required." }, { status: 400 });
  }

  const { data: membership } = await supabase.from("organization_members")
    .select("organization_id,role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can submit offline AI results for human review." }, { status: 403 });
  }

  const syncedIds: string[] = [];
  for (const item of runs) {
    const id = typeof item.id === "string" ? item.id : "";
    const agentId = typeof item.agentId === "string" ? item.agentId : "";
    const taskId = typeof item.taskId === "string" ? item.taskId : "";
    const output = typeof item.output === "string" ? item.output.trim().slice(0, 16000) : "";
    const model = typeof item.model === "string" ? item.model.slice(0, 120) : "local-model";
    if (!isUuid(id) || !isUuid(agentId) || !isUuid(taskId) || !output) continue;

    const { data: existing } = await supabase.from("agent_runs").select("id")
      .eq("organization_id", organizationId).filter("output->>offline_client_id", "eq", id).maybeSingle();
    if (existing) {
      syncedIds.push(id);
      continue;
    }

    const [{ data: agent }, { data: task }] = await Promise.all([
      supabase.from("ai_agents").select("id,capabilities,status").eq("id", agentId)
        .eq("organization_id", organizationId).maybeSingle(),
      supabase.from("tasks").select("id,title,description,status,assigned_agent_id")
        .eq("id", taskId).eq("organization_id", organizationId).maybeSingle(),
    ]);
    if (!agent || agent.status !== "active" || !Array.isArray(agent.capabilities) || !agent.capabilities.includes("task_execution")) {
      return NextResponse.json({ error: "An offline result refers to an employee who is no longer active or authorized." }, { status: 409 });
    }
    if (!task || !["queued", "blocked"].includes(task.status)) {
      return NextResponse.json({ error: "An offline result refers to a task that is no longer available for execution." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: run, error: runError } = await supabase.from("agent_runs").insert({
      organization_id: organizationId,
      agent_id: agentId,
      task_id: taskId,
      status: "succeeded",
      input: { task_title: task.title, task_description: task.description, offline: true },
      output: { text: output, model, offline_client_id: id, source: "device_local_inference" },
      created_by: user.id,
      started_at: now,
      finished_at: now,
    }).select("id").single();

    if (runError) {
      if (runError.code === "23505") {
        syncedIds.push(id);
        continue;
      }
      return NextResponse.json({ error: "An offline AI result could not be recorded. Successfully synced items can safely be retried." }, { status: 500 });
    }

    const { error: taskError } = await supabase.from("tasks").update({
      status: "in_review",
      assigned_agent_id: agentId,
      completed_at: null,
    }).eq("id", taskId).eq("organization_id", organizationId).in("status", ["queued", "blocked"]);
    if (taskError) {
      await supabase.from("agent_runs").update({
        status: "failed",
        error: "Offline result was recorded but the task could not enter human review.",
        finished_at: new Date().toISOString(),
      }).eq("id", run.id).eq("organization_id", organizationId);
      return NextResponse.json({ error: "An offline result was saved but its task could not enter human review. Please inspect the AI Workforce run history." }, { status: 409 });
    }

    await supabase.from("activity_logs").insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      actor_agent_id: agentId,
      action: "ai_agent.offline_run_synced",
      entity_type: "agent_run",
      entity_id: run.id,
      details: { task_id: taskId, model, local_run_id: id },
    });
    syncedIds.push(id);
  }

  return NextResponse.json({ syncedIds, count: syncedIds.length });
}
