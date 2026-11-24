import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in while online to prepare an offline workspace." }, { status: 401 });

  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Select a workspace first." }, { status: 400 });
  const { data: membership } = await supabase.from("organization_members")
    .select("organization_id,role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can prepare offline AI employee execution." }, { status: 403 });
  }
  const { data: organization } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  if (!organization) return NextResponse.json({ error: "The selected workspace could not be found." }, { status: 404 });

  const [{ data: agentRows }, { data: tasks }, { data: departments }] = await Promise.all([
    supabase.from("ai_agents").select("id,name,job_title,instructions,department_id,capabilities")
      .eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("tasks").select("id,title,description,status,priority,department_id,assigned_agent_id")
      .eq("organization_id", organizationId).in("status", ["queued", "blocked"])
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("departments").select("id,name,description").eq("organization_id", organizationId),
  ]);

  const agents = (agentRows ?? []).filter(agent =>
    Array.isArray(agent.capabilities) && agent.capabilities.includes("task_execution") && agent.capabilities.includes("local_execution")
  );
  const agentIds = agents.map(agent => agent.id);
  const canReadKnowledge = agents.some(agent => Array.isArray(agent.capabilities) && agent.capabilities.includes("knowledge_read"));
  const [{ data: memories }, { data: learningEvents }, { data: previousRuns }, { data: knowledgeDocuments }] = await Promise.all([
    agentIds.length
      ? supabase.from("agent_memories").select("agent_id,memory_type,title,content,confidence")
        .eq("organization_id", organizationId).in("agent_id", agentIds).eq("status", "approved")
        .order("updated_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as {agent_id:string;memory_type:string;title:string;content:string;confidence:number}[] }),
    agentIds.length
      ? supabase.from("agent_learning_events").select("agent_id,event_type,feedback,lesson,created_at")
        .eq("organization_id", organizationId).in("agent_id", agentIds)
        .order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] as {agent_id:string;event_type:string;feedback:string|null;lesson:string|null;created_at:string}[] }),
    agentIds.length
      ? supabase.from("agent_runs").select("agent_id,input,output,created_at")
        .eq("organization_id", organizationId).in("agent_id", agentIds).eq("status", "succeeded")
        .order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as {agent_id:string;input:unknown;output:unknown;created_at:string}[] }),
    canReadKnowledge
      ? supabase.from("knowledge_documents").select("title,content").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] as {title:string;content:string}[] }),
  ]);

  return NextResponse.json({
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
