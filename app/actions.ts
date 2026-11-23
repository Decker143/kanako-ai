"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getOrganizationContext } from "@/lib/supabase/organization-context";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { membership } = await getOrganizationContext(supabase, user.id);
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


export async function scanTaskRisks() {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) redirect("/?view=tasks&error=" + encodeURIComponent("Only an owner or admin can run the CEO risk scan."));
  const [{ data: tasks, error: taskError }, { data: updates, error: updateError }, { data: runs, error: runError }, { data: departments }] = await Promise.all([
    supabase.from("tasks").select("id,title,status,priority,due_at,updated_at,assigned_agent_id,department_id").eq("organization_id", organizationId).order("updated_at", { ascending: true }).limit(200),
    supabase.from("task_updates").select("id,task_id,event_type,message,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
    supabase.from("agent_runs").select("id,task_id,status,error,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    supabase.from("departments").select("id,name").eq("organization_id", organizationId),
  ]);
  if (taskError || updateError || runError) redirect("/?view=tasks&error=" + encodeURIComponent("CEO risk scan could not load all required workspace records."));
  const now = Date.now();
  const open = (tasks ?? []).filter(task => !["completed", "cancelled"].includes(task.status));
  const alerts: Array<{task_id:string;title:string;priority:string;type:string;detail:string;recommended_action:string;department:string}> = [];
  for (const task of open) {
    const taskUpdates = (updates ?? []).filter(update => update.task_id === task.id);
    const latestUpdate = taskUpdates[0];
    const latestRun = (runs ?? []).find(run => run.task_id === task.id);
    const department = (departments ?? []).find(item => item.id === task.department_id)?.name ?? "Unassigned";
    if (latestUpdate?.event_type === "blocker") alerts.push({ task_id:task.id,title:task.title,priority:task.priority,type:"reported_blocker",detail:latestUpdate.message,recommended_action:"Review the blocker and decide whether to provide resources, change scope, or approve a handoff.",department });
    if (task.due_at && new Date(task.due_at).getTime() < now) alerts.push({ task_id:task.id,title:task.title,priority:task.priority,type:"overdue",detail:"Due date passed on " + new Date(task.due_at).toLocaleString("en"),recommended_action:"Review the deadline and update the delivery plan.",department });
    const lastActivity = Math.max(new Date(task.updated_at).getTime(), latestUpdate ? new Date(latestUpdate.created_at).getTime() : 0, latestRun ? new Date(latestRun.created_at).getTime() : 0);
    if (["queued","in_progress","blocked"].includes(task.status) && now - lastActivity > 72*60*60*1000) alerts.push({ task_id:task.id,title:task.title,priority:task.priority,type:"stale_72h",detail:"No task, progress-update, or AI-run activity for more than 72 hours.",recommended_action:"Ask the assigned employee for a status update or reassign after checking capacity.",department });
    if (latestRun?.status === "failed") alerts.push({ task_id:task.id,title:task.title,priority:task.priority,type:"latest_ai_run_failed",detail:latestRun.error || "Latest AI execution failed.",recommended_action:"Inspect the failed run before retrying or changing the assigned model.",department });
  }
  const rank: Record<string,number> = { urgent:0, high:1, medium:2, low:3 };
  alerts.sort((x,y)=>(rank[x.priority]??4)-(rank[y.priority]??4) || x.type.localeCompare(y.type));
  const report = {
    summary: alerts.length ? alerts.length + " risk signals detected across " + new Set(alerts.map(item=>item.task_id)).size + " tasks." : "No overdue, stale, reported-blocker, or latest-run failure signals were detected in the scanned open tasks.",
    generated_mode:"deterministic_task_risk_scan",
    generated_at:new Date().toISOString(),
    coverage_note:"Rules-based scan of up to 200 open tasks, 500 task updates, and 200 AI runs. Stale means no recorded task/update/run activity for 72+ hours. A risk signal is advisory; this scan does not change task status, assign employees, or execute work.",
    metrics:{open_tasks:open.length,scanned_tasks:tasks?.length??0,risk_signals:alerts.length,affected_tasks:new Set(alerts.map(item=>item.task_id)).size,overdue:alerts.filter(item=>item.type==="overdue").length,stale_72h:alerts.filter(item=>item.type==="stale_72h").length,reported_blockers:alerts.filter(item=>item.type==="reported_blocker").length,latest_ai_run_failures:alerts.filter(item=>item.type==="latest_ai_run_failed").length},
    alerts,
  };
  const { data, error } = await supabase.from("reports").insert({organization_id:organizationId,title:"CEO Task Risk Scan · "+new Date().toLocaleString("en"),report_type:"operations",content:report,generated_by:user.id}).select("id").single();
  if (error || !data) redirect("/?view=tasks&error="+encodeURIComponent("Could not save CEO risk scan."));
  await log(supabase,organizationId,user.id,"ceo.task_risk_scan_completed","report",data.id);
  revalidatePath("/");
  redirect("/?view=tasks&message="+encodeURIComponent(alerts.length+" task risk signals detected. See the saved scan in Reports."));
}

export async function createTask(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) redirect("/?view=tasks&error=" + encodeURIComponent("Choose a valid due date."));
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
    due_at: dueDate ? dueDate + "T23:59:59.999Z" : null,
    department_id: departmentId, assigned_agent_id: assignedAgentId,
    created_by: user.id,
  }).select("id").single();
  if (error) redirect("/?view=tasks&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "task.created", "task", data.id);
  revalidatePath("/");
  redirect("/?view=tasks");
}

export async function updateTaskStatus(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  const id = String(formData.get("task_id") ?? "");
  const status = String(formData.get("status") ?? "queued");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) redirect("/?view=tasks&error=" + encodeURIComponent("Choose a valid due date."));
  const allowed = ["queued", "in_progress", "blocked", "in_review", "completed", "cancelled"];
  if (!id || !allowed.includes(status)) return;
  if (status === "completed") {
    const { data: taskForReview } = await supabase.from("tasks").select("id,status,assigned_agent_id")
      .eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (taskForReview?.status === "in_review" && taskForReview.assigned_agent_id && !["owner", "admin"].includes(role)) {
      redirect("/?view=agents&error=" + encodeURIComponent("Only a workspace owner or admin can complete an AI-assigned task after review."));
    }
    const { data: pendingRun } = await supabase.from("agent_runs").select("id,output")
      .eq("organization_id", organizationId).eq("task_id", id).eq("status", "succeeded")
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
    const review = pendingRun?.output && typeof pendingRun.output === "object" && !Array.isArray(pendingRun.output)
      ? (pendingRun.output as Record<string, unknown>).review as { decision?: string } | undefined
      : undefined;
    if (pendingRun && review?.decision !== "approved") {
      redirect("/?view=agents&error=" + encodeURIComponent("AI-generated work must be reviewed in AI Workforce before the task can be marked completed."));
    }
  }
  const { error } = await supabase.from("tasks").update({
    status,
    due_at: dueDate ? dueDate + "T23:59:59.999Z" : null,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  }).eq("id", id).eq("organization_id", organizationId);
  if (!error) await log(supabase, organizationId, user.id, "task.status_updated", "task", id);
  revalidatePath("/");
}

export async function createTaskUpdate(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const taskId = String(formData.get("task_id") ?? "");
  const eventType = String(formData.get("event_type") ?? "note");
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  const progressRaw = String(formData.get("progress_percent") ?? "");
  const targetAgentId = String(formData.get("target_agent_id") ?? "") || null;
  if (!taskId || !message || !["progress","note","blocker","handoff_requested"].includes(eventType)) {
    redirect("/?view=tasks&error=" + encodeURIComponent("Enter an update and choose a valid update type."));
  }
  const { data: task } = await supabase.from("tasks").select("id,status,assigned_agent_id")
    .eq("id", taskId).eq("organization_id", organizationId).maybeSingle();
  if (!task) redirect("/?view=tasks&error=" + encodeURIComponent("Task not found in this workspace."));
  if (["completed","cancelled"].includes(task.status) && eventType !== "note") {
    redirect("/?view=tasks&error=" + encodeURIComponent("Closed tasks only accept notes; reopen the task before adding progress, blockers, or handoffs."));
  }
  let progressPercent: number | null = null;
  if (eventType === "progress") {
    progressPercent = Number.parseInt(progressRaw, 10);
    if (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100) {
      redirect("/?view=tasks&error=" + encodeURIComponent("Progress must be between 0 and 100."));
    }
  }
  if (eventType === "handoff_requested") {
    if (!targetAgentId || targetAgentId === task.assigned_agent_id) {
      redirect("/?view=tasks&error=" + encodeURIComponent("Choose a different AI employee for the handoff request."));
    }
    const { data: target } = await supabase.from("ai_agents").select("id").eq("id", targetAgentId).eq("organization_id", organizationId).maybeSingle();
    if (!target) redirect("/?view=tasks&error=" + encodeURIComponent("The handoff target is not in this workspace."));
  }
  const { error } = await supabase.from("task_updates").insert({
    organization_id: organizationId, task_id: taskId, actor_user_id: user.id,
    event_type: eventType, message, progress_percent: progressPercent,
    target_agent_id: eventType === "handoff_requested" ? targetAgentId : null,
  });
  if (error) redirect("/?view=tasks&error=" + encodeURIComponent("Could not save task update."));
  if (eventType === "blocker" || eventType === "handoff_requested") {
    await supabase.from("tasks").update({ status: "blocked" }).eq("id", taskId).eq("organization_id", organizationId);
  } else if (eventType === "progress" && task.status === "queued") {
    await supabase.from("tasks").update({ status: "in_progress" }).eq("id", taskId).eq("organization_id", organizationId);
  }
  await log(supabase, organizationId, user.id, "task." + eventType, "task", taskId);
  revalidatePath("/");
  redirect("/?view=tasks&message=" + encodeURIComponent("Task update saved."));
}

export async function approveTaskHandoff(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner","admin"].includes(role)) redirect("/?view=tasks&error=" + encodeURIComponent("Only an owner or admin can approve a handoff."));
  const taskId = String(formData.get("task_id") ?? "");
  const updateId = String(formData.get("update_id") ?? "");
  if (!taskId || !updateId) return;
  const { data: request } = await supabase.from("task_updates").select("id,task_id,message,target_agent_id,event_type")
    .eq("id", updateId).eq("task_id", taskId).eq("organization_id", organizationId).eq("event_type", "handoff_requested").maybeSingle();
  if (!request?.target_agent_id) redirect("/?view=tasks&error=" + encodeURIComponent("Handoff request not found."));
  const { data: latest } = await supabase.from("task_updates").select("id,event_type,created_at")
    .eq("task_id", taskId).eq("organization_id", organizationId).in("event_type", ["handoff_requested","handoff_approved"])
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
  if (latest?.id !== request.id) redirect("/?view=tasks&error=" + encodeURIComponent("A newer handoff decision already exists."));
  const { data: result, error: assignError } = await supabase.rpc("approve_task_handoff", {
    p_task_id: taskId, p_request_id: updateId, p_organization_id: organizationId,
  });
  if (assignError || !result) redirect("/?view=tasks&error=" + encodeURIComponent(assignError?.message ?? "Handoff assignment failed."));
  await log(supabase, organizationId, user.id, "task.handoff_approved", "task", taskId);
  revalidatePath("/");
  redirect("/?view=tasks&message=" + encodeURIComponent("Handoff approved and employee reassigned."));
}

export async function createAgent(formData: FormData) {
  const { supabase, user, organizationId } = await context();
  const name = String(formData.get("name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const skills = [...new Set(String(formData.get("skills") ?? "").split(",").map(value => value.trim().toLowerCase()).filter(value => value.length > 0 && value.length <= 50))].slice(0, 20);
  const maxConcurrentTasks = Math.min(20, Math.max(1, Number.parseInt(String(formData.get("max_concurrent_tasks") ?? "2"), 10) || 2));
  const availabilityStatus = String(formData.get("availability_status") ?? "available");
  const modelName = String(formData.get("model_name") ?? "").trim();
  if (!["available", "busy", "unavailable"].includes(availabilityStatus)) redirect("/?view=agents&error=" + encodeURIComponent("Choose a valid availability status."));
  if (!name || !jobTitle) return;
  if (departmentId) {
    const { data: department } = await supabase.from("departments").select("id").eq("id", departmentId).eq("organization_id", organizationId).maybeSingle();
    if (!department) redirect("/?view=agents&error=" + encodeURIComponent("Invalid department selection."));
  }
  if (modelName && (!modelName.includes("/") || modelName.length > 120)) redirect("/?view=agents&error=" + encodeURIComponent("Use a valid AI Gateway model ID in provider/model format."));
  const { data, error } = await supabase.from("ai_agents").insert({
    organization_id: organizationId, department_id: departmentId, name, job_title: jobTitle,
    description: description || null, instructions: instructions || null,
    skills, max_concurrent_tasks: maxConcurrentTasks, availability_status: availabilityStatus,
    model_provider: modelName ? "vercel-ai-gateway" : null, model_name: modelName || null,
    status: "draft", created_by: user.id, capabilities: [], configuration: {},
  }).select("id").single();
  if (error) redirect("/?view=agents&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "agent.created_as_draft", "ai_agent", data.id);
  revalidatePath("/");
  redirect("/?view=agents");
}

export async function updateAgentProfile(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) {
    redirect("/?view=agents&error=" + encodeURIComponent("Only workspace owners and admins can edit AI employee profiles."));
  }
  const id = String(formData.get("agent_id") ?? "");
  const skills = [...new Set(String(formData.get("skills") ?? "").split(",").map(value => value.trim().toLowerCase()).filter(value => value.length > 0 && value.length <= 50))].slice(0, 20);
  const maxConcurrentTasks = Math.min(20, Math.max(1, Number.parseInt(String(formData.get("max_concurrent_tasks") ?? "2"), 10) || 2));
  const availabilityStatus = String(formData.get("availability_status") ?? "available");
  if (!id || !["available", "busy", "unavailable"].includes(availabilityStatus)) return;
  const { data: agent } = await supabase.from("ai_agents").select("id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (!agent) redirect("/?view=agents&error=" + encodeURIComponent("AI employee not found in this workspace."));
  const { error } = await supabase.from("ai_agents").update({
    skills, max_concurrent_tasks: maxConcurrentTasks, availability_status: availabilityStatus,
  }).eq("id", id).eq("organization_id", organizationId);
  if (error) redirect("/?view=agents&error=" + encodeURIComponent(error.message));
  await log(supabase, organizationId, user.id, "agent.profile_updated", "ai_agent", id);
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
  const allowed = new Set(["task_execution", "knowledge_read", "department_read", "internet_research", "local_execution"]);
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
  redirect("/?view=agents&success=" + encodeURIComponent("Permissions saved successfully. Your AI employee permissions are now up to date."));
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
  if (decision === "changes_requested" && !note) {
    redirect("/?view=agents&error=" + encodeURIComponent("Add a review note explaining what needs to be revised."));
  }

  const { data: run } = await supabase.from("agent_runs")
    .select("id,task_id,status,output,agent_id")
    .eq("id", runId).eq("organization_id", organizationId).maybeSingle();
  if (!run || run.status !== "succeeded" || !run.task_id) {
    redirect("/?view=agents&error=" + encodeURIComponent("This AI run is not available for review."));
  }
  const { data: latestRun } = await supabase.from("agent_runs").select("id")
    .eq("organization_id", organizationId).eq("task_id", run.task_id).eq("status", "succeeded")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
  if (latestRun?.id !== run.id) {
    redirect("/?view=agents&error=" + encodeURIComponent("A newer AI run exists for this task. Review the latest output instead."));
  }

  const { data: task } = await supabase.from("tasks")
    .select("id,status,title").eq("id", run.task_id)
    .eq("organization_id", organizationId).maybeSingle();
  if (!task || task.status !== "in_review") {
    redirect("/?view=agents&error=" + encodeURIComponent("The task is no longer waiting for review."));
  }

  const nextTaskStatus = decision === "approved" ? "completed" : "queued";
  const previousOutput = run.output && typeof run.output === "object" && !Array.isArray(run.output)
    ? run.output as { [key: string]: Json | undefined } : {};
  const reviewedAt = new Date().toISOString();
  const { data: updatedRun, error: runError } = await supabase.from("agent_runs").update({
    output: {
      ...previousOutput,
      review: { decision, note: note || null, reviewed_at: reviewedAt, reviewed_by: user.id },
    },
  }).eq("id", run.id).eq("organization_id", organizationId).eq("status", "succeeded")
    .select("id").maybeSingle();

  if (runError || !updatedRun) {
    redirect("/?view=agents&error=" + encodeURIComponent("Could not save the review record. Refresh and try again."));
  }

  const { data: updatedTask, error: taskError } = await supabase.from("tasks").update({
    status: nextTaskStatus,
    completed_at: decision === "approved" ? reviewedAt : null,
  }).eq("id", task.id).eq("organization_id", organizationId).eq("status", "in_review")
    .select("id").maybeSingle();
  if (taskError || !updatedTask) {
    await supabase.from("agent_runs").update({ output: previousOutput })
      .eq("id", run.id).eq("organization_id", organizationId).eq("status", "succeeded");
    redirect("/?view=agents&error=" + encodeURIComponent("The task changed before the review could be applied. The review record was rolled back."));
  }

  const { error: learningEventError } = await supabase.from("agent_learning_events").insert({
    organization_id: organizationId,
    agent_id: run.agent_id,
    task_id: task.id,
    agent_run_id: run.id,
    event_type: decision === "approved" ? "task_approved" : "revision_requested",
    feedback: note || null,
    lesson: decision === "approved"
      ? "A human reviewer accepted this task output. Reuse its approach only when the new task is materially similar."
      : note,
    created_by: user.id,
    metadata: { decision, task_title: task.title },
  });
  if (learningEventError) {
    redirect("/?view=agents&error=" + encodeURIComponent("The task review was saved, but the learning event could not be recorded. Please retry or inspect the activity log."));
  }

  if (decision === "changes_requested" && note) {
    const { error: memoryError } = await supabase.from("agent_memories").insert({
      organization_id: organizationId,
      agent_id: run.agent_id,
      memory_type: "correction",
      title: ("Correction: " + task.title).slice(0, 180),
      content: note,
      status: "pending",
      source_run_id: run.id,
      confidence: 0.8,
      created_by: user.id,
    });
    if (memoryError) {
      redirect("/?view=agents&error=" + encodeURIComponent("Revision was requested and recorded, but the reusable correction could not be queued for approval."));
    }
  }

  await log(supabase, organizationId, user.id,
    decision === "approved" ? "ai_agent.work_approved" : "ai_agent.revision_requested",
    "agent_run", run.id);
  revalidatePath("/");
  redirect("/?view=agents");
}

export async function reviewAgentMemory(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) {
    redirect("/?view=agents&error=" + encodeURIComponent("Only workspace owners and admins can review AI memories."));
  }

  const memoryId = String(formData.get("memory_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!memoryId || !["approved", "rejected"].includes(decision)) return;

  const { data: memory } = await supabase.from("agent_memories").select("id,title,status,agent_id")
    .eq("id", memoryId).eq("organization_id", organizationId).eq("status", "pending").maybeSingle();
  if (!memory) {
    redirect("/?view=agents&error=" + encodeURIComponent("This learning candidate is no longer pending."));
  }

  const reviewedAt = new Date().toISOString();
  const { data: updated, error } = await supabase.from("agent_memories").update({
    status: decision,
    reviewed_by: user.id,
    reviewed_at: reviewedAt,
    updated_at: reviewedAt,
  }).eq("id", memory.id).eq("organization_id", organizationId).eq("status", "pending")
    .select("id").maybeSingle();
  if (error || !updated) {
    redirect("/?view=agents&error=" + encodeURIComponent("Could not save the memory review. Refresh and try again."));
  }

  await log(supabase, organizationId, user.id,
    decision === "approved" ? "ai_agent.memory_approved" : "ai_agent.memory_rejected",
    "agent_memory", memory.id);
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

export async function generateExecutiveReport() {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) {
    redirect("/?view=overview&error=" + encodeURIComponent("Only workspace owners and admins can generate executive reports."));
  }

  const [{ data: tasks }, { data: agents }, { data: approvals }, { data: workflowRuns }, { data: agentRuns }, { data: departments }] = await Promise.all([
    supabase.from("tasks").select("id,title,status,priority,created_at,due_at,assigned_agent_id,department_id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    supabase.from("ai_agents").select("id,name,status,availability_status,max_concurrent_tasks").eq("organization_id", organizationId),
    supabase.from("approvals").select("id,title,status,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
    supabase.from("workflow_runs").select("id,status,error,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50),
    supabase.from("agent_runs").select("id,agent_id,status,error,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
    supabase.from("departments").select("id,name").eq("organization_id", organizationId),
  ]);

  const now = Date.now();
  const activeTasks = (tasks ?? []).filter(task => !["completed", "cancelled"].includes(task.status));
  const overdue = activeTasks.filter(task => task.due_at && new Date(task.due_at).getTime() < now);
  const blocked = activeTasks.filter(task => task.status === "blocked");
  const stale = activeTasks.filter(task => ["queued", "in_progress", "blocked"].includes(task.status) && new Date(task.created_at).getTime() < now - 72 * 60 * 60 * 1000);
  const unassigned = activeTasks.filter(task => !task.assigned_agent_id);
  const pendingApprovals = (approvals ?? []).filter(item => item.status === "pending");
  const agingApprovals = pendingApprovals.filter(item => new Date(item.created_at).getTime() < now - 48 * 60 * 60 * 1000);
  const activeAgents = (agents ?? []).filter(agent => agent.status === "active");
  const atCapacity = activeAgents.filter(agent => activeTasks.filter(task => task.assigned_agent_id === agent.id).length >= (agent.max_concurrent_tasks ?? 2));
  const failedAgentRuns = (agentRuns ?? []).filter(run => run.status === "failed");
  const failedWorkflowRuns = (workflowRuns ?? []).filter(run => run.status === "failed");
  const alerts = [
    ...overdue.map(task => ({ priority: "urgent", type: "overdue_task", title: task.title, recommendation: "Review due date, blocker, and owner; update the task plan." })),
    ...blocked.map(task => ({ priority: "high", type: "blocked_task", title: task.title, recommendation: "Identify the missing dependency or decision and assign an owner for resolution." })),
    ...stale.filter(task => !blocked.some(item => item.id === task.id)).map(task => ({ priority: "medium", type: "stale_task", title: task.title, recommendation: "Review the task created 72+ hours ago; request a status update or revise its scope and due date." })),
    ...agingApprovals.map(item => ({ priority: "medium", type: "aging_approval", title: item.title, recommendation: "Review the pending approval and record an explicit decision." })),
    ...failedAgentRuns.map(run => ({ priority: "high", type: "failed_agent_run", title: run.error || "AI employee run failed", recommendation: "Inspect the run output and logs before retrying." })),
    ...failedWorkflowRuns.map(run => ({ priority: "high", type: "failed_workflow_run", title: run.error || "Workflow run failed", recommendation: "Inspect completed steps and partial side effects before rerunning." })),
    ...atCapacity.map(agent => ({ priority: "medium", type: "employee_at_capacity", title: agent.name, recommendation: "Review workload distribution before assigning more tasks." })),
  ].slice(0, 40);

  const departmentWorkload = (departments ?? []).map(department => ({
    department: department.name,
    open_tasks: activeTasks.filter(task => task.department_id === department.id).length,
    completed_tasks: (tasks ?? []).filter(task => task.department_id === department.id && task.status === "completed").length,
  }));
  const metrics = {
    tasks_loaded: tasks?.length ?? 0,
    open_tasks: activeTasks.length,
    completed_tasks: (tasks ?? []).filter(task => task.status === "completed").length,
    overdue_tasks: overdue.length,
    blocked_tasks: blocked.length,
    stale_tasks_72h: stale.length,
    unassigned_tasks: unassigned.length,
    high_or_urgent_open_tasks: activeTasks.filter(task => ["high", "urgent"].includes(task.priority)).length,
    active_employees: activeAgents.length,
    available_employees: activeAgents.filter(agent => agent.availability_status === "available").length,
    employees_at_capacity: atCapacity.length,
    pending_approvals: pendingApprovals.length,
    approvals_older_than_48h: agingApprovals.length,
    failed_agent_runs_loaded: failedAgentRuns.length,
    failed_workflow_runs_loaded: failedWorkflowRuns.length,
  };
  const summary = alerts.length
    ? "Executive review identified " + alerts.length + " attention items across task delivery, workforce capacity, approvals, and execution health. Review the prioritized recommendations before delegating or retrying work."
    : "No immediate escalation signals were found in the latest records loaded. Continue routine monitoring and verify upcoming deadlines.";
  const reportDate = new Date().toISOString().slice(0, 10);
  const { data: report, error } = await supabase.from("reports").insert({
    organization_id: organizationId,
    title: "CEO Executive Operations Brief · " + reportDate,
    report_type: "executive",
    content: {
      summary,
      generated_mode: "deterministic_workspace_snapshot",
      generated_at: new Date().toISOString(),
      coverage_note: "Based on up to 200 latest tasks, 100 approvals, 100 AI runs, and 50 workflow runs. This is a rules-based snapshot, not an AI-generated analysis.",
      metrics,
      department_workload: departmentWorkload,
      alerts,
    },
    generated_by: user.id,
  }).select("id").single();
  if (error || !report) redirect("/?view=overview&error=" + encodeURIComponent("Could not save the executive report."));
  await log(supabase, organizationId, user.id, "ceo.executive_report_generated", "report", report.id);
  revalidatePath("/");
  redirect("/?view=reports&message=" + encodeURIComponent("Executive operations brief generated."));
}


export async function createProjectPlan(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) redirect("/?view=reports&error=" + encodeURIComponent("Only workspace owners and admins can propose project plans."));
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const objective = String(formData.get("objective") ?? "").trim().slice(0, 4000);
  const rawTasks = String(formData.get("tasks") ?? "").trim();
  const requestedDefaultPriority = String(formData.get("priority") ?? "medium").toLowerCase();
  const priorityDefault = ["low","medium","high","urgent"].includes(requestedDefaultPriority) ? requestedDefaultPriority : "medium";
  if (!title || !objective || !rawTasks) redirect("/?view=reports&error=" + encodeURIComponent("Add a project title, objective, and at least one task."));
  const tasks = rawTasks.split("\n").map(line => line.trim()).filter(Boolean).slice(0, 40).map((line, index) => {
    const [taskTitle, departmentName = "", priority = priorityDefault, description = ""] = line.split("|").map(value => value.trim());
    return { order: index + 1, title: taskTitle.slice(0, 180), department_name: departmentName.slice(0, 100), priority: ["low","medium","high","urgent"].includes(priority.toLowerCase()) ? priority.toLowerCase() : priorityDefault, description: description.slice(0, 2000) };
  }).filter(task => task.title.length > 0);
  if (!tasks.length) redirect("/?view=reports&error=" + encodeURIComponent("The task list is empty."));
  const { data, error } = await supabase.from("reports").insert({
    organization_id: organizationId,
    title: "Project Plan · " + title,
    report_type: "project_plan",
    content: { summary: objective, plan_status: "pending_approval", generated_mode: "owner_authored_structured_plan", generated_at: new Date().toISOString(), tasks },
    generated_by: user.id,
  }).select("id").single();
  if (error || !data) redirect("/?view=reports&error=" + encodeURIComponent("Could not save the project plan proposal."));
  await log(supabase, organizationId, user.id, "ceo.project_plan_proposed", "report", data.id);
  revalidatePath("/");
  redirect("/?view=reports&message=" + encodeURIComponent("Project plan saved for owner review."));
}

export async function approveProjectPlan(formData: FormData) {
  const { supabase, user, organizationId, role } = await context();
  if (!["owner", "admin"].includes(role)) redirect("/?view=reports&error=" + encodeURIComponent("Only workspace owners and admins can approve project plans."));
  const planId = String(formData.get("plan_id") ?? "");
  if (!planId) return;
  const { data: plan } = await supabase.from("reports").select("id,title,content")
    .eq("id", planId).eq("organization_id", organizationId).eq("report_type", "project_plan").maybeSingle();
  if (!plan) redirect("/?view=reports&error=" + encodeURIComponent("Project plan not found."));
  const content = plan.content as { summary?: string; plan_status?: string; tasks?: Array<{title:string;department_name?:string;priority?:string;description?:string;order?:number}>; created_task_ids?:string[] };
  if (content.plan_status !== "pending_approval" || !Array.isArray(content.tasks) || !content.tasks.length) {
    redirect("/?view=reports&error=" + encodeURIComponent("This plan is no longer awaiting approval or has no tasks."));
  }
  const { data: departments } = await supabase.from("departments").select("id,name").eq("organization_id", organizationId);
  const departmentMap = new Map((departments ?? []).map(item => [item.name.toLowerCase(), item.id]));
  const unknownDepartment = content.tasks.find(item => item.department_name && !departmentMap.has(item.department_name.toLowerCase()));
  if (unknownDepartment) redirect("/?view=reports&error=" + encodeURIComponent("Unknown department: " + unknownDepartment.department_name + ". Edit the proposal and use an exact workspace department name."));
  const { data: claimed, error: claimError } = await supabase.from("reports").update({
    content: { ...content, plan_status: "processing", approved_at: new Date().toISOString(), approved_by: user.id },
  }).eq("id", plan.id).eq("organization_id", organizationId).eq("content->>plan_status", "pending_approval").select("id").maybeSingle();
  if (claimError || !claimed) redirect("/?view=reports&error=" + encodeURIComponent("This plan was already handled. Refresh the page."));
  const rows = content.tasks.map(item => ({
    organization_id: organizationId,
    title: item.title,
    description: item.description || null,
    priority: ["low","medium","high","urgent"].includes(item.priority ?? "") ? item.priority : "medium",
    department_id: item.department_name ? departmentMap.get(item.department_name.toLowerCase())! : null,
    status: "queued",
    created_by: user.id,
    metadata: { project_plan_id: plan.id, project_plan_title: plan.title, plan_order: item.order ?? null },
  }));
  const { data: created, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error || !created || created.length !== rows.length) {
    await supabase.from("reports").update({ content: { ...content, plan_status: "failed", error: error?.message ?? "Task creation was incomplete." } }).eq("id", plan.id).eq("organization_id", organizationId);
    redirect("/?view=reports&error=" + encodeURIComponent("Plan approval started but task creation failed. The plan is marked for inspection; do not retry until checked."));
  }
  await supabase.from("reports").update({
    content: { ...content, plan_status: "approved", approved_at: new Date().toISOString(), approved_by: user.id, created_task_ids: created.map(item => item.id) },
  }).eq("id", plan.id).eq("organization_id", organizationId);
  await log(supabase, organizationId, user.id, "ceo.project_plan_approved_and_tasks_created", "report", plan.id);
  revalidatePath("/");
  redirect("/?view=tasks&message=" + encodeURIComponent(created.length + " project tasks created. Assignments remain pending."));
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


export async function setActiveOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/?error=" + encodeURIComponent("You do not have access to that workspace."));
  const cookieStore = await cookies();
  cookieStore.set("kanako_active_org", membership.organization_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/");
  redirect("/");
}
