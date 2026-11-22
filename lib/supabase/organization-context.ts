import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getOrganizationContext(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId);

  if (error || !memberships?.length) {
    return { membership: null, memberships: [] as typeof memberships };
  }

  const cookieStore = await cookies();
  const requestedOrganizationId = cookieStore.get("kanako_active_org")?.value;
  const membership =
    memberships.find(item => item.organization_id === requestedOrganizationId) ??
    memberships[0];

  return { membership, memberships };
}
