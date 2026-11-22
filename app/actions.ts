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
  if (!title) return;
  const { data, error } = await supabase.from("tasks").insert({
    organization_id: organizationId, title, description: description || null,
    priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
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
  if (!name || !jobTitle) return;
  const { data, error } = await supabase.from("ai_agents").insert({
    organization_id: organizationId, department_id: departmentId, name, job_title: jobTitle,
    description: description || null, instructions: instructions || null,
    status: "draft", created_by: user.id, capabilities: [], configuration: {},
  }).select("id").single();
  if (error) redirect("/?view=agents&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "agent.created_as_draft", "ai_agent", data.id);
  revalidatePath("/");
  redirect("/?view=agents");
}

export async function updateAgentStatus(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const id = String(formData.get("agent_id") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (!id || !["draft", "paused"].includes(status)) return;
  const { error } = await supabase.from("ai_agents").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (!error) await log(supabase, organizationId, user.id, "agent.status_updated", "ai_agent", id);
  revalidatePath("/");
}

export async function createWorkflow(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const trigger = String(formData.get("trigger") ?? "manual");
  const stepsText = String(formData.get("steps") ?? "").trim();
  if (!name) return;
  const steps = stepsText.split("\n").map(s => s.trim()).filter(Boolean).map((label, index) => ({ id: crypto.randomUUID(), order: index + 1, type: "manual", label }));
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
  const { supabase, user, organizationId } = await context();
  const id = String(formData.get("workflow_id") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (!id || !["draft", "paused"].includes(status)) return;
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
