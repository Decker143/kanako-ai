import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorize(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, userId: string) {
  const { data } = await supabase.from("organization_members").select("role")
    .eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return !!data && ["owner", "admin"].includes(data.role);
}

type MeetingDraft = {
  discussion?: unknown;
  decisions?: unknown;
  actionItems?: unknown;
  openQuestions?: unknown;
};

function cleanText(value: unknown, max = 3000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to prepare an AI meeting draft." }, { status: 401 });
  if (process.env.KANAKO_AI_EXECUTION_ENABLED !== "true") {
    return NextResponse.json({ error: "AI meeting assistance is locked until model usage is enabled by the workspace owner." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { organizationId?: string; meetingId?: string } | null;
  const organizationId = body?.organizationId ?? "";
  const meetingId = body?.meetingId ?? "";
  if (!uuid.test(organizationId) || !uuid.test(meetingId)) {
    return NextResponse.json({ error: "A valid workspace and meeting are required." }, { status: 400 });
  }
  if (!await authorize(supabase, organizationId, user.id)) {
    return NextResponse.json({ error: "Only the workspace owner or admin can generate an AI meeting draft." }, { status: 403 });
  }

  const { data: meeting } = await supabase.from("office_meetings")
    .select("id,title,agenda,status").eq("id", meetingId).eq("organization_id", organizationId).maybeSingle();
  if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  if (meeting.status === "scheduled") {
    return NextResponse.json({ error: "Start the meeting and call its attendees before preparing a discussion draft." }, { status: 409 });
  }

  const { data: attendeeRows, error: attendeeError } = await supabase.from("office_meeting_attendees")
    .select("agent_id,attendance_status").eq("meeting_id", meetingId).eq("organization_id", organizationId);
  if (attendeeError || !attendeeRows?.length) {
    return NextResponse.json({ error: "No meeting attendees were found." }, { status: 409 });
  }
  const agentIds = attendeeRows.map(row => row.agent_id);
  const [{ data: agents, error: agentError }, { data: openTasks }] = await Promise.all([
    supabase.from("ai_agents").select("id,name,job_title,description,instructions,skills,status")
      .eq("organization_id", organizationId).in("id", agentIds),
    supabase.from("tasks").select("title,description,status,priority")
      .eq("organization_id", organizationId).not("status", "in", '("completed","cancelled")')
      .order("updated_at", { ascending: false }).limit(15),
  ]);
  if (agentError || !agents?.length || agents.length !== agentIds.length) {
    return NextResponse.json({ error: "The attendee employee profiles could not be loaded safely." }, { status: 500 });
  }

  const attendeeContext = agents.map(agent => ({
    name: agent.name,
    role: agent.job_title,
    description: agent.description ?? "",
    skills: Array.isArray(agent.skills) ? agent.skills.filter((item): item is string => typeof item === "string").slice(0, 12) : [],
    instructions: agent.instructions ?? "",
    profileStatus: agent.status,
    attendance: attendeeRows.find(row => row.agent_id === agent.id)?.attendance_status ?? "unknown",
  }));

  try {
    const result = await generateText({
      model: process.env.KANAKO_AI_MODEL || "openai/gpt-4.1-mini",
      system: [
        "You are Kanako, AI CEO and meeting facilitator for KANAKO AI.",
        "Prepare a clearly labeled AI-generated meeting discussion draft from the agenda, attendee profiles, and supplied workspace task snapshot.",
        "CRITICAL: This is not a transcript. No live speech or independent agent responses were captured. Never write that an attendee said, agreed, approved, completed, or promised something.",
        "Do not invent company facts, metrics, events, task progress, or employee capabilities. Use only supplied records. Mark missing information as an open question.",
        "Use attendee role and skills only to frame a proposed perspective, not to impersonate a real conversation. If there is only one attendee, create a CEO planning reflection and explicitly say that no team roundtable occurred.",
        "Every decision must be labeled as a proposal requiring owner approval. Action items are suggestions only; do not claim they have been assigned or create tasks.",
        "Keep the discussion practical and concise. Distinguish known workspace facts, analysis, and recommendations.",
        "Return exactly one valid JSON object with this shape and no markdown: {\"discussion\":\"string\",\"decisions\":[\"string\"],\"actionItems\":[{\"text\":\"string\",\"suggestedOwner\":\"string or Unassigned\"}],\"openQuestions\":[\"string\"]}.",
      ].join("\n\n"),
      prompt: JSON.stringify({
        meeting: { title: meeting.title, agenda: meeting.agenda ?? "", status: meeting.status },
        attendees: attendeeContext,
        openWorkspaceTasks: openTasks ?? [],
      }),
      maxOutputTokens: 1400,
    });

    const raw = result.text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
    const parsed = JSON.parse(raw) as MeetingDraft;
    const discussion = cleanText(parsed.discussion, 6500);
    const decisions = Array.isArray(parsed.decisions) ? parsed.decisions.slice(0, 10).map(item => cleanText(item, 500)).filter(Boolean) : [];
    const actionItems = Array.isArray(parsed.actionItems) ? parsed.actionItems.slice(0, 15).map(item => {
      const row = item && typeof item === "object" ? item as { text?: unknown; suggestedOwner?: unknown } : {};
      const text = cleanText(row.text, 400);
      const owner = cleanText(row.suggestedOwner, 100) || "Unassigned";
      return text ? { text: text + " (suggested owner: " + owner + ")" } : null;
    }).filter((item): item is { text: string } => item !== null) : [];
    const openQuestions = Array.isArray(parsed.openQuestions) ? parsed.openQuestions.slice(0, 10).map(item => cleanText(item, 400)).filter(Boolean) : [];

    if (!discussion) throw new Error("The model returned an empty discussion draft.");
    const notes = [
      "AI-GENERATED DISCUSSION DRAFT — NOT A RECORD OF A LIVE CONVERSATION",
      "",
      discussion,
      openQuestions.length ? "\nOpen questions:\n" + openQuestions.map(item => "• " + item).join("\n") : "",
    ].filter(Boolean).join("\n");
    const decisionNotes = [
      "PROPOSED DECISIONS — NOT APPROVED BY THE OWNER",
      ...decisions.map((item, index) => (index + 1) + ". " + item),
    ].join("\n");

    await supabase.from("activity_logs").insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      action: "office_meeting.ai_draft_generated",
      entity_type: "office_meeting",
      entity_id: meetingId,
      details: { attendee_count: attendeeContext.length, model: process.env.KANAKO_AI_MODEL || "openai/gpt-4.1-mini" },
    });

    return NextResponse.json({ notes, decisions: decisionNotes, actionItems, openQuestions, draftOnly: true });
  } catch (error) {
    console.error("KANAKO AI meeting draft failed", error);
    return NextResponse.json({ error: "Kanako could not prepare the meeting draft. Check AI Gateway access and model configuration." }, { status: 502 });
  }
}
