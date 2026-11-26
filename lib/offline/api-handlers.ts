import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type OfflineTask = { id?: string; title?: string; description?: string };
type OfflineRun = { id?: string; agentId?: string; taskId?: string; output?: string; model?: string };

const json = (body: unknown, status = 200) => Response.json(body, { status });
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function handleTaskSync(request: Request, supabase: Client) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in again while online before syncing local tasks." }, 401);

  const body = await request.json().catch(() => null) as { organizationId?: string; tasks?: OfflineTask[] } | null;
  const organizationId = body?.organizationId;
  const tasks = body?.tasks;
  if (!organizationId || !Array.isArray(tasks) || tasks.length < 1 || tasks.length > 50) {
    return json({ error: "A workspace and between 1 and 50 local tasks are required." }, 400);
  }

  const { data: membership, error: membershipError } = await supabase.from("organization_members")
    .select("organization_id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (membershipError) return json({ error: "Workspace access could not be verified." }, 500);
  if (!membership) return json({ error: "You do not have access to this workspace." }, 403);

  const syncedIds: string[] = [];
  for (const item of tasks) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim().slice(0, 4000) : "";
    if (!isUuid(id) || !title || title.length > 180) continue;

    const { data: existing, error: existingError } = await supabase.from("tasks").select("id")
      .eq("organization_id", organizationId).filter("metadata->>offline_client_id", "eq", id).maybeSingle();
    if (existingError) return json({ error: "A local task could not be checked safely. Please retry." , syncedIds }, 500);
    if (!existing) {
      const { error } = await supabase.from("tasks").insert({
        organization_id: organizationId,
        title,
        description: description || null,
        status: "queued",
        created_by: user.id,
        metadata: { offline_client_id: id, source: "kanako_offline_workspace" },
      });
      if (error && error.code !== "23505") {
        return json({ error: "A local task could not be synced. Successfully synced items can safely be retried.", syncedIds }, 500);
      }
    }
    syncedIds.push(id);
  }

  return json({ syncedIds, count: syncedIds.length });
}

export async function handleRunSync(request: Request, supabase: Client) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in again while online before syncing offline AI results." }, 401);

  const body = await request.json().catch(() => null) as { organizationId?: string; runs?: OfflineRun[] } | null;
  const organizationId = body?.organizationId;
  const runs = body?.runs;
  if (!organizationId || !Array.isArray(runs) || runs.length < 1 || runs.length > 50) {
    return json({ error: "A workspace and between 1 and 50 offline runs are required." }, 400);
  }

  const { data: membership, error: membershipError } = await supabase.from("organization_members")
    .select("organization_id,role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (membershipError) return json({ error: "Workspace access could not be verified." }, 500);
  if (!membership) return json({ error: "You do not have access to this workspace." }, 403);
  if (!["owner", "admin"].includes(membership.role)) {
    return json({ error: "Only workspace owners or admins can submit offline AI results for human review." }, 403);
  }

  const syncedIds: string[] = [];
  for (const item of runs) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const agentId = typeof item.agentId === "string" ? item.agentId : "";
    const taskId = typeof item.taskId === "string" ? item.taskId : "";
    const output = typeof item.output === "string" ? item.output.trim().slice(0, 16000) : "";
    const model = typeof item.model === "string" ? item.model.slice(0, 120) : "local-model";
    if (!isUuid(id) || !isUuid(agentId) || !isUuid(taskId) || !output) continue;

    const { error } = await supabase.rpc("sync_offline_agent_run", {
      p_organization_id: organizationId,
      p_offline_client_id: id,
      p_agent_id: agentId,
      p_task_id: taskId,
      p_output: output,
      p_model: model,
    });
    if (error) {
      return json({
        error: "An offline result could not be synchronized. Any earlier results in this batch are safe to retry.",
        syncedIds,
      }, 409);
    }
    syncedIds.push(id);
  }

  return json({ syncedIds, count: syncedIds.length });
}

export async function handleSnapshot(request: Request, supabase: Client) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in while online to prepare an offline workspace." }, 401);

  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return json({ error: "Select a workspace first." }, 400);
  const { data: membership, error: membershipError } = await supabase.from("organization_members")
    .select("organization_id,role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (membershipError) return json({ error: "The workspace access check could not be completed." }, 500);
  if (!membership) return json({ error: "You do not have access to this workspace." }, 403);
  if (!["owner", "admin"].includes(membership.role)) {
    return json({ error: "Only workspace owners or admins can prepare offline AI employee execution." }, 403);
  }
  const { data: organization, error: organizationError } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  if (organizationError) return json({ error: "The workspace details could not be loaded." }, 500);
  if (!organization) return json({ error: "The selected workspace could not be found." }, 404);

  const [agentsResult, tasksResult, departmentsResult] = await Promise.all([
    supabase.from("ai_agents").select("id,name,job_title,instructions,department_id,capabilities")
      .eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("tasks").select("id,title,description,status,priority,department_id,assigned_agent_id")
      .eq("organization_id", organizationId).in("status", ["queued", "blocked"])
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("departments").select("id,name,description").eq("organization_id", organizationId),
  ]);
  if (agentsResult.error || tasksResult.error || departmentsResult.error) {
    return json({ error: "The offline workspace snapshot could not be loaded completely. Please retry while online." }, 500);
  }
  const agentRows = agentsResult.data;
  const tasks = tasksResult.data;
  const departments = departmentsResult.data;

  const agents = (agentRows ?? []).filter(agent =>
    Array.isArray(agent.capabilities) && agent.capabilities.includes("task_execution") && agent.capabilities.includes("local_execution")
  );
  const agentIds = agents.map(agent => agent.id);
  const canReadKnowledge = agents.some(agent => Array.isArray(agent.capabilities) && agent.capabilities.includes("knowledge_read"));
  const [memoriesResult, learningEventsResult, previousRunsResult, knowledgeDocumentsResult] = await Promise.all([
    agentIds.length
      ? supabase.from("agent_memories").select("agent_id,memory_type,title,content,confidence")
        .eq("organization_id", organizationId).in("agent_id", agentIds).eq("status", "approved")
        .order("updated_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as {agent_id:string;memory_type:string;title:string;content:string;confidence:number}[], error: null }),
    agentIds.length
      ? supabase.from("agent_learning_events").select("agent_id,event_type,feedback,lesson,created_at")
        .eq("organization_id", organizationId).in("agent_id", agentIds)
        .order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] as {agent_id:string;event_type:string;feedback:string|null;lesson:string|null;created_at:string}[], error: null }),
    agentIds.length
      ? supabase.from("agent_runs").select("agent_id,input,output,created_at")
        .eq("organization_id", organizationId).in("agent_id", agentIds).eq("status", "succeeded")
        .order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as {agent_id:string;input:unknown;output:unknown;created_at:string}[], error: null }),
    canReadKnowledge
      ? supabase.from("knowledge_documents").select("title,content").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] as {title:string;content:string}[], error: null }),
  ]);
  if (memoriesResult.error || learningEventsResult.error || previousRunsResult.error || knowledgeDocumentsResult.error) {
    return json({ error: "The offline workspace snapshot could not be loaded completely. Please retry while online." }, 500);
  }
  const memories = memoriesResult.data;
  const learningEvents = learningEventsResult.data;
  const previousRuns = previousRunsResult.data;
  const knowledgeDocuments = knowledgeDocumentsResult.data;

  return json({
    organizationId,
    organizationName: organization.name,
    preparedAt: new Date().toISOString(),
    agents,
    tasks: tasks ?? [],
    departments: departments ?? [],
    memories: memories ?? [],
    learningEvents: learningEvents ?? [],
    knowledgeDocuments: (knowledgeDocuments ?? []).map(document => ({ title: document.title, content: (document.content ?? "").slice(0, 5000) })),
    previousRuns: (previousRuns ?? []).filter(run => {
      const output = run.output && typeof run.output === "object" && !Array.isArray(run.output) ? run.output as { review?: { decision?: string } } : {};
      return output.review?.decision === "approved";
    }).slice(0, 20),
  });
}
