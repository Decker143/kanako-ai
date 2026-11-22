"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/?error=" + encodeURIComponent("Use at least 8 characters for your password."));
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/?error=" + encodeURIComponent(error.message));
  if (!data.session) redirect("/?message=" + encodeURIComponent("Check your email to confirm your account, then sign in."));
  redirect("/");
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
