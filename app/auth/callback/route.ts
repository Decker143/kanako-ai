import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (error) return NextResponse.redirect(new URL("/?error=" + encodeURIComponent(error), url.origin));
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return NextResponse.redirect(new URL("/?error=" + encodeURIComponent(exchangeError.message), url.origin));
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.redirect(new URL("/?error=" + encodeURIComponent("Email verified, but the owner session could not be loaded. Please sign in."), url.origin));
    const organizationName = typeof user.user_metadata?.organization_name === "string" ? user.user_metadata.organization_name.trim().slice(0, 120) : "";
    if (organizationName) {
      const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (membershipError) return NextResponse.redirect(new URL("/?error=" + encodeURIComponent("Email verified. Workspace membership could not be checked; please retry by signing in."), url.origin));
      if (!membership) {
        const { error: workspaceError } = await supabase.rpc("create_organization", { org_name: organizationName });
        if (workspaceError) return NextResponse.redirect(new URL("/?error=" + encodeURIComponent("Email verified, but workspace setup failed: " + workspaceError.message), url.origin));
      }
    }
    return NextResponse.redirect(new URL("/?message=" + encodeURIComponent("Email verified. Your owner workspace is ready."), url.origin));
  }

  return NextResponse.redirect(new URL("/?error=" + encodeURIComponent("Verification link is invalid or expired."), url.origin));
}
