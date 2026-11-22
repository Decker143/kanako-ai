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
    .select("organization_id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });

  const [{ data: agentRows }, { data: tasks }, { data: departments }] = await Promise.all([
    supabase.from("ai_agents").select("id,name,job_title,instructions,department_id,capabilities")
      .eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("tasks").select("id,title,description,status,priority,department_id")
      .eq("organization_id", organizationId).in("status", ["queued", "blocked"])
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("departments").select("id,name,description").eq("organization_id", organizationId),
  ]);

  const agents = (agentRows ?? []).filter(agent =>
    Array.isArray(agent.capabilities) && agent.capabilities.includes("task_execution")
  );
  const agentIds = agents.map(agent => agent.id);
  const { data: memories } = agentIds.length
    ? await supabase.from("agent_memories").select("agent_id,memory_type,title,content,confidence")
      .eq("organization_id", organizationId).in("agent_id", agentIds).eq("status", "approved")
      .order("updated_at", { ascending: false }).limit(200)
    : { data: [] as {agent_id:string;memory_type:string;title:string;content:string;confidence:number}[] };

  return NextResponse.json({
    organizationId,
    preparedAt: new Date().toISOString(),
    agents,
    tasks: tasks ?? [],
    departments: departments ?? [],
    memories: memories ?? [],
  });
}
