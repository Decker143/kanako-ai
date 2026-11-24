import { NextResponse } from "next/server";
import { checkKanakoGitHubConnection, checkKanakoGitHubWritePermissions } from "@/lib/github-app";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationContext } from "@/lib/supabase/organization-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, error: "Please sign in first." }, { status: 401 });

  const { membership } = await getOrganizationContext(supabase, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ connected: false, error: "Only workspace owners and admins can inspect the GitHub connection." }, { status: 403 });
  }

  const enabled = process.env.KANAKO_GITHUB_EXECUTION_ENABLED === "true";

  try {
    // Verify the GitHub App with a read-only installation token.
    // Connection health checks must not require enabling repository writes.
    const connection = await checkKanakoGitHubConnection();
    const verifyWritePermissions = new URL(request.url).searchParams.get("verifyWritePermissions") === "1";
    const writeCheck = verifyWritePermissions ? await checkKanakoGitHubWritePermissions() : null;
    return NextResponse.json({
      ...connection,
      ...(writeCheck ? { writePermissionCheck: writeCheck } : {}),
      enabled,
      message: enabled ? "GitHub connection verified." : "GitHub connection verified. Code execution remains disabled.",
    });
  } catch {
    return NextResponse.json({ connected: false, enabled, error: "GitHub App authentication failed. Check the server-side configuration and installation access." }, { status: 503 });
  }
}
