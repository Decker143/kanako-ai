import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorize(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, userId: string) {
  const { data } = await supabase.from("organization_members").select("role")
    .eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return !!data && ["owner", "admin"].includes(data.role);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a meeting." }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    organizationId?: string; title?: string; agenda?: string; scheduledFor?: string | null; agentIds?: string[];
  } | null;
  const organizationId = body?.organizationId ?? "";
  const title = body?.title?.trim() ?? "";
  const agenda = body?.agenda?.trim() ?? "";
  const agentIds = Array.isArray(body?.agentIds) ? [...new Set(body.agentIds)] : [];
  const scheduledFor = body?.scheduledFor || null;
  if (!uuid.test(organizationId) || title.length < 1 || title.length > 120 || agenda.length > 4000 ||
      agentIds.length < 1 || agentIds.length > 6 || agentIds.some(id => !uuid.test(id)) ||
      (scheduledFor && Number.isNaN(Date.parse(scheduledFor)))) {
    return NextResponse.json({ error: "Enter a meeting title, choose 1–6 employees, and check the agenda/date." }, { status: 400 });
  }
  if (!await authorize(supabase, organizationId, user.id)) {
    return NextResponse.json({ error: "Only the workspace owner or admin can schedule meetings." }, { status: 403 });
  }
  const { data: agents, error: agentsError } = await supabase.from("ai_agents").select("id")
    .eq("organization_id", organizationId).in("id", agentIds);
  if (agentsError || (agents?.length ?? 0) !== agentIds.length) {
    return NextResponse.json({ error: "One or more selected employees do not belong to this workspace." }, { status: 400 });
  }
  const { data: meeting, error } = await supabase.from("office_meetings").insert({
    organization_id: organizationId, title, agenda, scheduled_for: scheduledFor,
    created_by: user.id,
  }).select("id,title,agenda,status,scheduled_for,created_at").single();
  if (error || !meeting) return NextResponse.json({ error: "The meeting could not be saved." }, { status: 500 });

  const { error: attendeeError } = await supabase.from("office_meeting_attendees").insert(agentIds.map(agent_id => ({
    organization_id: organizationId, meeting_id: meeting.id, agent_id,
  })));
  if (attendeeError) {
    await supabase.from("office_meetings").delete().eq("id", meeting.id).eq("organization_id", organizationId);
    return NextResponse.json({ error: "The attendee list could not be saved. No meeting was created." }, { status: 500 });
  }
  return NextResponse.json({ meeting }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage meetings." }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    organizationId?: string; meetingId?: string; action?: string;
    notes?: string; decisions?: string; actionItems?: unknown[];
  } | null;
  const organizationId = body?.organizationId ?? "";
  const meetingId = body?.meetingId ?? "";
  if (!uuid.test(organizationId) || !uuid.test(meetingId) || !await authorize(supabase, organizationId, user.id)) {
    return NextResponse.json({ error: "You do not have permission to manage this meeting." }, { status: 403 });
  }
  const { data: meeting, error: meetingError } = await supabase.from("office_meetings")
    .select("id,status").eq("id", meetingId).eq("organization_id", organizationId).maybeSingle();
  if (meetingError || !meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });

  if (body?.action === "save_notes") {
    const notes = body.notes ?? "";
    const decisions = body.decisions ?? "";
    const actionItems = Array.isArray(body.actionItems) ? body.actionItems.slice(0, 30) : [];
    if (notes.length > 12000 || decisions.length > 12000 ||
        actionItems.some(item => typeof item !== "object" || item === null ||
          typeof (item as { text?: unknown }).text !== "string" ||
          ((item as { text: string }).text.length > 500))) {
      return NextResponse.json({ error: "Meeting notes or action items exceed the allowed limits." }, { status: 400 });
    }
    const { error } = await supabase.from("office_meetings").update({
      notes, decisions, action_items: actionItems, updated_at: new Date().toISOString(),
    }).eq("id", meetingId).eq("organization_id", organizationId);
    if (error) return NextResponse.json({ error: "Meeting notes could not be saved." }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body?.action !== "start" && body?.action !== "complete" && body?.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported meeting action." }, { status: 400 });
  }
  if (body.action === "start") {
    if (meeting.status !== "scheduled") return NextResponse.json({ error: "Only scheduled meetings can be started." }, { status: 409 });
    const { data: attendees } = await supabase.from("office_meeting_attendees").select("agent_id")
      .eq("meeting_id", meetingId).eq("organization_id", organizationId);
    const agentIds = (attendees ?? []).map(item => item.agent_id);
    if (!agentIds.length) return NextResponse.json({ error: "This meeting has no attendees." }, { status: 409 });
    await supabase.from("office_commands").update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("organization_id", organizationId).in("agent_id", agentIds).in("status", ["pending", "in_progress"]);
    const { error: moveError } = await supabase.from("office_commands").insert(agentIds.map(agent_id => ({
      organization_id: organizationId, agent_id, command: "call_to_meeting",
      destination: "collaboration_hub", created_by: user.id,
    })));
    if (moveError) return NextResponse.json({ error: "Meeting could not start because employee movement commands could not be saved." }, { status: 500 });
    const now = new Date().toISOString();
    const { error } = await supabase.from("office_meetings").update({ status: "in_progress", started_at: now, updated_at: now })
      .eq("id", meetingId).eq("organization_id", organizationId);
    if (error) return NextResponse.json({ error: "Employees were called, but the meeting status could not be updated. Refresh and check the meeting." }, { status: 500 });
    await supabase.from("office_meeting_attendees").update({ attendance_status: "attending" }).eq("meeting_id", meetingId);
    return NextResponse.json({ success: true, status: "in_progress" });
  }

  const nextStatus = body.action === "complete" ? "completed" : "cancelled";
  const now = new Date().toISOString();
  const { error } = await supabase.from("office_meetings").update({
    status: nextStatus, ended_at: now, updated_at: now,
  }).eq("id", meetingId).eq("organization_id", organizationId);
  if (error) return NextResponse.json({ error: "Meeting status could not be updated." }, { status: 500 });
  if (body.action === "complete") {
    await supabase.from("office_meeting_attendees").update({ attendance_status: "attended" }).eq("meeting_id", meetingId);
  }
  const { data: attendees } = await supabase.from("office_meeting_attendees").select("agent_id")
    .eq("meeting_id", meetingId).eq("organization_id", organizationId);
  const agentIds = (attendees ?? []).map(item => item.agent_id);
  if (agentIds.length) {
    await supabase.from("office_commands").update({ status: "completed", completed_at: now })
      .eq("organization_id", organizationId).in("agent_id", agentIds).in("status", ["pending", "in_progress"]);
    await supabase.from("office_commands").insert(agentIds.map(agent_id => ({
      organization_id: organizationId, agent_id, command: "return_to_workstation",
      destination: "workstation", created_by: user.id,
    })));
  }
  return NextResponse.json({ success: true, status: nextStatus });
}
