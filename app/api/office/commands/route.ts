import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to control the virtual office." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    organizationId?: string; agentIds?: string[]; command?: string;
  } | null;
  const organizationId = body?.organizationId ?? "";
  const agentIds = Array.isArray(body?.agentIds) ? [...new Set(body.agentIds)] : [];
  const command = body?.command;
  if (!uuid.test(organizationId) || agentIds.length < 1 || agentIds.length > 15 ||
      agentIds.some(id => !uuid.test(id)) ||
      !["call_to_meeting", "return_to_workstation"].includes(command ?? "")) {
    return NextResponse.json({ error: "Choose valid employees and an office command." }, { status: 400 });
  }

  const { data: membership } = await supabase.from("organization_members")
    .select("role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only the workspace owner or admin can move AI employees." }, { status: 403 });
  }

  const { data: validAgents, error: agentsError } = await supabase.from("ai_agents")
    .select("id").eq("organization_id", organizationId).in("id", agentIds);
  if (agentsError || (validAgents?.length ?? 0) !== agentIds.length) {
    return NextResponse.json({ error: "One or more selected employees do not belong to this workspace." }, { status: 400 });
  }

  const { error: closeError } = await supabase.from("office_commands")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("organization_id", organizationId).in("agent_id", agentIds)
    .in("status", ["pending", "in_progress"]);
  if (closeError) return NextResponse.json({ error: "The previous movement command could not be closed." }, { status: 500 });

  const validCommand = command === "call_to_meeting" ? "call_to_meeting" : "return_to_workstation";
  const destination = validCommand === "call_to_meeting" ? "collaboration_hub" : "workstation";
  const rows = agentIds.map(agent_id => ({
    organization_id: organizationId, agent_id, command: validCommand, destination, created_by: user.id,
  }));
  const { data, error } = await supabase.from("office_commands").insert(rows).select("id,agent_id,status,destination");
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "One or more employees already have an active movement command. Wait for it to finish before sending another." }, { status: 409 });
    return NextResponse.json({ error: "The office command could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ commands: data ?? [], count: data?.length ?? 0 });
}
