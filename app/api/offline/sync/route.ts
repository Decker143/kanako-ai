import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OfflineTask = {
  id?: string;
  title?: string;
  description?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again while online before syncing local tasks." }, { status: 401 });

  const body = await request.json().catch(() => null) as { organizationId?: string; tasks?: OfflineTask[] } | null;
  const organizationId = body?.organizationId;
  const tasks = body?.tasks;
  if (!organizationId || !Array.isArray(tasks) || tasks.length < 1 || tasks.length > 50) {
    return NextResponse.json({ error: "A workspace and between 1 and 50 local tasks are required." }, { status: 400 });
  }

  const { data: membership } = await supabase.from("organization_members")
    .select("organization_id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });

  const syncedIds: string[] = [];
  for (const item of tasks) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim().slice(0, 4000) : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !title || title.length > 180) {
      continue;
    }

    const { data: existing } = await supabase.from("tasks").select("id")
      .eq("organization_id", organizationId).filter("metadata->>offline_client_id", "eq", id).maybeSingle();
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
        return NextResponse.json({ error: "A local task could not be synced. Successfully synced items can safely be retried." }, { status: 500 });
      }
    }
    syncedIds.push(id);
  }

  return NextResponse.json({ syncedIds, count: syncedIds.length });
}
