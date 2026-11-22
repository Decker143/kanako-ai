"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/");
  return { supabase, user, organizationId: membership.organization_id, role: membership.role };
}

async function log(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, userId: string, action: string, entityType: string, entityId?: string) {
  await supabase.from("activity_logs").insert({
    organization_id: organizationId,
    actor_user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
  });
}

export async function createTask(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const departmentId = String(formData.get("department_id") ?? "") || null;
  const assignedAgentId = String(formData.get("assigned_agent_id") ?? "") || null;
  if (!title) return;
  if (departmentId) {
    const { data: department } = await supabase.from("departments").select("id").eq("id", departmentId).eq("organization_id", organizationId).maybeSingle();
    if (!department) redirect("/?view=tasks&error=" + encodeURIComponent("Invalid department selection."));
  }
  if (assignedAgentId) {
    const { data: agent } = await supabase.from("ai_agents").select("id").eq("id", assignedAgentId).eq("organization_id", organizationId).maybeSingle();
    if (!agent) redirect("/?view=tasks&error=" + encodeURIComponent("Invalid AI employee selection."));
  }
  const { data, error } = await supabase.from("tasks").insert({
    organization_id: organizationId, title, description: description || null,
    priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
    department_id: departmentId, assigned_agent_id: assignedAgentId,
    created_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=tasks&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "task.created", "task", data.id);
  revalidatePath("/");
  redirect("/?view=tasks");
}

export async function updateTaskStatus(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const id = String(formData.get("task_id") ?? "");
  const status = String(formData.get("status") ?? "queued");
  const allowed = ["queued", "in_progress", "blocked", "in_review", "completed", "cancelled"];
  if (!id || !allowed.includes(status)) return;
  const { error } = await supabase.from("tasks").update({
    status, completed_at: status === "completed" ? new Date().toISOString() : null,
  }).eq("id", id).eq("organization_id", organizationId);
  if (!error) await log(supabase, organizationId, user.id, "task.status_updated", "task", id);
  revalidatePath("/");
}

export async function createAgent(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const name = String(formData.get("name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const modelName = String(formData.get("model_name") ?? "").trim();
  if (!name || !jobTitle) return;
  if (departmentId) {
    const { data: department } = await supabase.from("departments").select("id").eq("id", departmentId).eq("organization_id", organizationId).maybeSingle();
    if (!department) redirect("/?view=agents&error=" + encodeURIComponent("Invalid department selection."));
  }
  if (modelName && (!modelName.includes("/") || modelName.length > 120)) redirect("/?view=agents&error=" + encodeURIComponent("Use a valid AI Gateway model ID in provider/model format."));
  const { data, error } = await supabase.from("ai_agents").insert({
    organization_id: organizationId, department_id: departmentId, name, job_title: jobTitle,
    description: description || null, instructions: instructions || null,
    model_provider: modelName ? "vercel-ai-gateway" : null, model_name: modelName || null,
    status: "draft", created_by: user.id, capabilities: [], configuration: {},
  }).select("id").single();
  if (error) redirect("/?view=agents&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "agent.created_as_draft", "ai_agent", data.id);
  revalidatePath("/");
  redirect("/?view=agents");
}

export async function updateAgentCapabilities(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) {
    redirect("/?view=agents&error=" + encodeURIComponent("Only workspace owners and admins can change AI employee permissions."));
  }
  const id = String(formData.get("agent_id") ?? "");
  const requested = formData.getAll("capabilities").map(value => String(value));
  const allowed = new Set(["task_execution", "knowledge_read", "department_read"]);
  const capabilities = [...new Set(requested)].filter(value => allowed.has(value));
  if (!id) return;
  const { data: agent } = await supabase.from("ai_agents").select("id").eq("id", id)
    .eq("organization_id", organizationId).maybeSingle();
  if (!agent) redirect("/?view=agents&error=" + encodeURIComponent("AI employee not found."));
  const { error } = await supabase.from("ai_agents").update({ capabilities }).eq("id", id)
    .eq("organization_id", organizationId);
  if (error) redirect("/?view=agents&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "agent.capabilities_updated", "ai_agent", id);
  revalidatePath("/");
  redirect("/?view=agents");
}

export async function updateAgentStatus(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const id = String(formData.get("agent_id") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (!id || !["draft", "paused", "active"].includes(status)) return;
  if (status === "active") {
    if (process.env.KANAKO_AI_EXECUTION_ENABLED !== "true") redirect("/?view=agents&error=" + encodeURIComponent("AI execution is locked until model usage is approved."));
    const { data: agent } = await supabase.from("ai_agents").select("model_name,capabilities").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!agent?.model_name) redirect("/?view=agents&error=" + encodeURIComponent("Add an AI Gateway model ID before activating this employee."));
    const capabilities = Array.isArray(agent.capabilities) ? agent.capabilities : [];
    if (!capabilities.includes("task_execution")) redirect("/?view=agents&error=" + encodeURIComponent("Grant the Task execution permission before activating this employee."));
  }
  const { error } = await supabase.from("ai_agents").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (!error) await log(supabase, organizationId, user.id, "agent.status_updated", "ai_agent", id);
  revalidatePath("/");
}

export async function reviewAgentRun(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) {
    redirect("/?view=agents&error=" + encodeURIComponent("Only workspace owners and admins can review AI employee work."));
  }

  const runId = String(formData.get("run_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("review_note") ?? "").trim().slice(0, 1000);
  if (!runId || !["approved", "changes_requested"].includes(decision)) return;

  const { data: run } = await supabase.from("agent_runs")
    .select("id,task_id,status,output,agent_id")
    .eq("id", runId).eq("organization_id", organizationId).maybeSingle();
  if (!run || run.status !== "succeeded" || !run.task_id) {
    redirect("/?view=agents&error=" + encodeURIComponent("This AI run is not available for review."));
  }

  const { data: task } = await supabase.from("tasks")
    .select("id,status").eq("id", run.task_id)
    .eq("organization_id", organizationId).maybeSingle();
  if (!task || task.status !== "in_review") {
    redirect("/?view=agents&error=" + encodeURIComponent("The task is no longer waiting for review."));
  }

  const nextTaskStatus = decision === "approved" ? "completed" : "queued";
  const { data: updatedTask, error: taskError } = await supabase.from("tasks").update({
    status: nextTaskStatus,
    completed_at: decision === "approved" ? new Date().toISOString() : null,
  }).eq("id", task.id).eq("organization_id", organizationId).eq("status", "in_review")
    .select("id").maybeSingle();
  if (taskError || !updatedTask) {
    redirect("/?view=agents&error=" + encodeURIComponent("The task changed before the review could be saved. Refresh and try again."));
  }

  const previousOutput = run.output && typeof run.output === "object" && !Array.isArray(run.output)
    ? run.output as Record<string, unknown> : {};
  const reviewedAt = new Date().toISOString();
  const { error: runError } = await supabase.from("agent_runs").update({
    output: {
      ...previousOutput,
      review: { decision, note: note || null, reviewed_at: reviewedAt, reviewed_by: user.id },
    },
  }).eq("id", run.id).eq("organization_id", organizationId).eq("status", "succeeded");

  if (runError) {
    await supabase.from("tasks").update({ status: "in_review", completed_at: null })
      .eq("id", task.id).eq("organization_id", organizationId).eq("status", nextTaskStatus);
    redirect("/?view=agents&error=" + encodeURIComponent("Could not save the review record. The task was returned to review."));
  }

  await log(supabase, organizationId, user.id,
    decision === "approved" ? "ai_agent.work_approved" : "ai_agent.revision_requested",
    "agent_run", run.id);
  revalidatePath("/");
  redirect("/?view=agents");
}

export async function createWorkflow(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const trigger = String(formData.get("trigger") ?? "manual");
  const stepsText = String(formData.get("steps") ?? "").trim();
  if (!name) return;
  const allowedTypes = new Set(["create_task", "request_approval", "search_knowledge", "log_activity"]);
  const steps = stepsText.split("\n").map(s => s.trim()).filter(Boolean).map((line, index) => {
    const [rawType, ...parts] = line.split("|").map(part => part.trim());
    const type = allowedTypes.has(rawType) ? rawType : "manual";
    const value = parts.join(" | ");
    return {
      id: crypto.randomUUID(), order: index + 1, type, label: value || line,
      ...(type === "create_task" || type === "request_approval" ? { title: parts[0] || "", description: parts.slice(1).join(" | ") } : {}),
      ...(type === "search_knowledge" ? { query: value } : {}),
    };
  });
  const { data, error } = await supabase.from("automation_workflows").insert({
    organization_id: organizationId, name, description: description || null,
    trigger_config: { type: trigger }, steps, status: "draft", created_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=workflows&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "workflow.created_as_draft", "workflow", data.id);
  revalidatePath("/");
  redirect("/?view=workflows");
}

export async function updateWorkflowStatus(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  const id = String(formData.get("workflow_id") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (!id || !["draft", "paused", "active"].includes(status)) return;
  if (status === "active") {
    if (!["owner", "admin"].includes(role)) redirect("/?view=workflows&error=" + encodeURIComponent("Only workspace owners and admins can activate workflows."));
    const { data: workflow } = await supabase.from("automation_workflows").select("trigger_config,steps").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    const trigger = workflow?.trigger_config as { type?: string } | null;
    const steps = Array.isArray(workflow?.steps) ? workflow.steps as {type?:string;title?:string;query?:string;label?:string}[] : [];
    const allowed = new Set(["create_task", "request_approval", "search_knowledge", "log_activity"]);
    const valid = trigger?.type === "manual" && steps.length > 0 && steps.length <= 20 && steps.every(step =>
      !!step.type && allowed.has(step.type) &&
      (step.type === "create_task" || step.type === "request_approval" ? !!step.title?.trim() :
       step.type === "search_knowledge" ? !!(step.query || step.label)?.trim() : !!step.label?.trim())
    );
    if (!valid) redirect("/?view=workflows&error=" + encodeURIComponent("Only manual workflows with 1–20 valid internal-action steps can be activated."));
  }
  if (!["owner", "admin"].includes(role)) redirect("/?view=workflows&error=" + encodeURIComponent("Only workspace owners and admins can change workflow status."));
  const { error } = await supabase.from("automation_workflows").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (!error) await log(supabase, organizationId, user.id, "workflow.status_updated", "workflow", id);
  revalidatePath("/");
}

export async function createApproval(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "general");
  if (!title) return;
  const { data, error } = await supabase.from("approvals").insert({
    organization_id: organizationId, title, description: description || null,
    request_type: requestType, payload: {}, status: "pending", requested_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=approvals&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "approval.requested", "approval", data.id);
  revalidatePath("/");
  redirect("/?view=approvals");
}

export async function decideApproval(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) redirect("/?view=approvals&error=Only%20workspace%20owners%20and%20admins%20can%20decide%20approvals.");
  const id = String(formData.get("approval_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("decision_note") ?? "").trim();
  if (!id || !["approved", "rejected"].includes(status)) return;
  const { error } = await supabase.from("approvals").update({
    status, decision_note: note || null, decided_by: user.id, decided_at: new Date().toISOString(),
  }).eq("id", id).eq("organization_id", organizationId).eq("status", "pending");
  if (!error) await log(supabase, organizationId, user.id, "approval." + status, "approval", id);
  revalidatePath("/");
}

export async function createKnowledgeDocument(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return;
  const { data, error } = await supabase.from("knowledge_documents").insert({
    organization_id: organizationId, title, content, source_type: "manual",
    metadata: { character_count: content.length }, created_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=knowledge&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "knowledge_document.created", "knowledge_document", data.id);
  revalidatePath("/");
  redirect("/?view=knowledge");
}

export async function createReport(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const title = String(formData.get("title") ?? "").trim();
  const reportType = String(formData.get("report_type") ?? "operations");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!title || !summary) return;
  const { data, error } = await supabase.from("reports").insert({
    organization_id: organizationId, title, report_type: reportType,
    content: { summary, generated_mode: "manual", generated_at: new Date().toISOString() },
    generated_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=reports&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "report.created", "report", data.id);
  revalidatePath("/");
  redirect("/?view=reports");
}

export async function createConversation(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const title = String(formData.get("title") ?? "New conversation").trim() || "New conversation";
  const { data, error } = await supabase.from("conversations").insert({
    organization_id: organizationId, title, created_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=chat&error=" + encodeURIComponent(error.message));
  revalidatePath("/");
  redirect("/?view=chat&conversation=" + data.id);
}

export async function saveChatMessage(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const conversationId = String(formData.get("conversation_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!conversationId || !content) return;
  const { data: conversation } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("organization_id", organizationId).maybeSingle();
  if (!conversation) redirect("/?view=chat&error=Conversation%20not%20found");
  const { error } = await supabase.from("messages").insert({
    organization_id: organizationId, conversation_id: conversationId, role: "user", content,
    metadata: { source: "workspace_note" },
  });
  if (error) redirect("/?view=chat&conversation=" + conversationId + "&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "chat.message_saved", "conversation", conversationId);
  revalidatePath("/");
  redirect("/?view=chat&conversation=" + conversationId);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
