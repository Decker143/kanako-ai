"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 100);
  const organizationName = String(formData.get("organization_name") ?? "").trim().slice(0, 120);
  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) redirect("/?error=" + encodeURIComponent("Enter a valid email address."));
  if (password.length < 8) redirect("/?error=" + encodeURIComponent("Use at least 8 characters for your password."));
  if (!fullName) redirect("/?error=" + encodeURIComponent("Enter your name to create the owner account."));
  if (!organizationName) redirect("/?error=" + encodeURIComponent("Enter your company or workspace name."));
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = requestHeaders.get("origin") ?? (host ? `${protocol}://${host}` : "http://localhost:3000");
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: fullName, organization_name: organizationName },
    },
  });
  if (error) redirect("/?error=" + encodeURIComponent(error.message));
  if (!data.user) redirect("/?error=" + encodeURIComponent("Account creation could not be confirmed. Please try again."));
  if (!data.session) redirect("/?message=" + encodeURIComponent("Owner account created. Check your email to verify it. Your company workspace will be created automatically after verification."));
  const { error: workspaceError } = await supabase.rpc("create_organization", { org_name: organizationName });
  if (workspaceError) redirect("/?error=" + encodeURIComponent("Your account was created, but workspace setup needs attention: " + workspaceError.message));
  revalidatePath("/");
  redirect("/?message=" + encodeURIComponent("Owner account and company workspace created successfully."));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/?error=" + encodeURIComponent("Organization name is required."));
  const { error } = await supabase.rpc("create_organization", { org_name: name });
  if (error) redirect("/?error=" + encodeURIComponent(error.message));
  revalidatePath("/");
  redirect("/");
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const organizationId = String(formData.get("organization_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  if (!organizationId || !title) redirect("/?error=" + encodeURIComponent("Task title is required."));
  const { error } = await supabase.from("tasks").insert({ organization_id: organizationId, title, description: description || null, priority, created_by: user.id });
  if (error) redirect("/?error=" + encodeURIComponent(error.message));
  revalidatePath("/");
  redirect("/");
}

export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("task_id") ?? "");
  const status = String(formData.get("status") ?? "queued");
  const allowed = ["queued", "in_progress", "blocked", "in_review", "completed", "cancelled"];
  if (!id || !allowed.includes(status)) return;
  await supabase.from("tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/");
}
