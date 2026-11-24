import { NextResponse } from "next/server";
import { checkKanakoGitHubConnection } from "@/lib/github-app";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationContext } from "@/lib/supabase/organization-context";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, error: "Please sign in first." }, { status: 401 });

  const { membership } = await getOrganizationContext(supabase, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ connected: false, error: "Only workspace owners and admins can inspect the GitHub connection." }, { status: 403 });
  }

  if (process.env.KANAKO_GITHUB_EXECUTION_ENABLED !== "true") {
    return NextResponse.json({ connected: false, enabled: false, message: "GitHub code execution is disabled. The connection can be enabled after secure configuration." });
  }

  try {
    const connection = await checkKanakoGitHubConnection();
    return NextResponse.json({ ...connection, enabled: true });
  } catch {
    return NextResponse.json({ connected: false, enabled: true, error: "GitHub App authentication failed. Check the server-side configuration and installation access." }, { status: 503 });
  }
}
