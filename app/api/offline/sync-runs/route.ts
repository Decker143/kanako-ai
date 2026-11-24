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

    const { error } = await supabase.rpc("sync_offline_agent_run", {
      p_organization_id: organizationId,
      p_offline_client_id: id,
      p_agent_id: agentId,
      p_task_id: taskId,
      p_output: output,
      p_model: model,
    });
    if (error) {
      return NextResponse.json({
        error: "An offline result could not be synchronized. Any earlier results in this batch are safe to retry.",
        syncedIds,
      }, { status: 409 });
    }
    syncedIds.push(id);
  }

  return NextResponse.json({ syncedIds, count: syncedIds.length });
}
