"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AgentOption = { id: string; name: string; jobTitle: string; departmentId: string | null };
type Meeting = {
  id: string; title: string; agenda: string; status: string; scheduledFor: string | null;
  notes: string; decisions: string; actionItems: { text: string; completed?: boolean }[];
  createdAt: string; attendees: { agentId: string; attendanceStatus: string }[];
};

function pretty(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()); }

export function OfficeMeetingsPanel({ organizationId, agents, meetings }: {
  organizationId: string; agents: AgentOption[]; meetings: Meeting[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(meetings.find(m => m.status === "in_progress")?.id ?? meetings[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, { notes: string; decisions: string; actions: string }>>({});

  const agentMap = useMemo(() => new Map(agents.map(agent => [agent.id, agent])), [agents]);
  async function request(url: string, method: "POST" | "PATCH", payload: Record<string, unknown>) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Meeting request failed.");
    return result;
  }
  async function createMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedAgents.length < 1) { setMessage("Choose at least one AI employee."); return; }
    setBusy(true); setMessage("");
    try {
      const result = await request("/api/office/meetings", "POST", {
        organizationId, title, agenda, scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        agentIds: selectedAgents,
      });
      setTitle(""); setAgenda(""); setScheduledFor(""); setSelectedAgents([]);
      setExpanded(result.meeting.id); setMessage("Meeting saved. Start it when you're ready to call the attendees.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Meeting could not be saved."); }
    finally { setBusy(false); }
  }
  async function changeStatus(meeting: Meeting, action: "start" | "complete" | "cancel") {
    setBusy(true); setMessage("");
    try {
      await request("/api/office/meetings", "PATCH", { organizationId, meetingId: meeting.id, action });
      setMessage(action === "start" ? "Meeting started. Attendees have been called to the Collaboration Hub." : action === "complete" ? "Meeting completed. Attendees were sent back to their workstations." : "Meeting cancelled.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Meeting update failed."); }
    finally { setBusy(false); }
  }
  function getDraft(meeting: Meeting) {
    return drafts[meeting.id] ?? {
      notes: meeting.notes ?? "", decisions: meeting.decisions ?? "",
      actions: (meeting.actionItems ?? []).map(item => item.text).join("\n"),
    };
  }
  async function saveNotes(meeting: Meeting) {
    const draft = getDraft(meeting);
    const actionItems = draft.actions.split("\n").map(text => text.trim()).filter(Boolean).slice(0, 30).map(text => ({ text, completed: false }));
    setBusy(true); setMessage("");
    try {
      await request("/api/office/meetings", "PATCH", {
        organizationId, meetingId: meeting.id, action: "save_notes",
        notes: draft.notes, decisions: draft.decisions, actionItems,
      });
      setMessage("Meeting notes, decisions, and action items saved.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Notes could not be saved."); }
    finally { setBusy(false); }
  }

  return <section className="office-meetings">
    <div className="office-meetings-heading">
      <div><div className="eyebrow">COLLABORATION HUB</div><h2>Meetings & decisions</h2><p className="muted">Schedule a team meeting, call employees into the hub, and record the outcome.</p></div>
      <span className="office-meeting-count">{meetings.filter(m => m.status === "scheduled" || m.status === "in_progress").length} OPEN</span>
    </div>
    <form className="office-meeting-create" onSubmit={createMeeting}>
      <div className="office-meeting-form-title"><strong>Schedule a meeting</strong><span>Maximum 6 attendees per meeting</span></div>
      <label>Meeting title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. Weekly Operations Review" /></label>
      <label>Agenda<textarea value={agenda} onChange={e => setAgenda(e.target.value)} maxLength={4000} rows={3} placeholder="What should the team cover?" /></label>
      <label>Schedule (optional)<input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} /></label>
      <div className="office-attendee-picker"><span className="office-field-label">Invite employees ({selectedAgents.length}/6)</span>
        <div className="office-attendee-options">{agents.map(agent => <label key={agent.id} className={selectedAgents.includes(agent.id) ? "selected" : ""}>
          <input type="checkbox" checked={selectedAgents.includes(agent.id)} disabled={!selectedAgents.includes(agent.id) && selectedAgents.length >= 6} onChange={e => setSelectedAgents(current => e.target.checked ? [...current, agent.id] : current.filter(id => id !== agent.id))} />
          <span><b>{agent.name}</b><small>{agent.jobTitle}</small></span>
        </label>)}</div>
      </div>
      <button className="btn primary" type="submit" disabled={busy || !title.trim() || agents.length === 0}>{busy ? "Saving…" : "Create meeting"}</button>
    </form>

    <div className="office-meeting-list">
      <div className="office-meeting-list-title"><strong>Meeting room activity</strong><span>{meetings.length} saved</span></div>
      {!meetings.length && <div className="empty">No meetings yet. Create your first meeting above.</div>}
      {meetings.map(meeting => {
        const draft = getDraft(meeting);
        const attendees = meeting.attendees.map(item => ({ agent: agentMap.get(item.agentId), attendanceStatus: item.attendanceStatus })).filter((item): item is { agent: AgentOption; attendanceStatus: string } => !!item.agent);
        return <article className="office-meeting-card" key={meeting.id}>
          <button type="button" className="office-meeting-summary" onClick={() => setExpanded(expanded === meeting.id ? null : meeting.id)}>
            <span><b>{meeting.title}</b><small>{meeting.scheduledFor ? new Date(meeting.scheduledFor).toLocaleString() : "Unscheduled"} · {attendees.length} attendees</small></span>
            <span className={"office-meeting-status " + meeting.status}>{pretty(meeting.status)}</span>
          </button>
          {expanded === meeting.id && <div className="office-meeting-detail">
            {meeting.agenda && <div className="office-meeting-agenda"><b>Agenda</b><p>{meeting.agenda}</p></div>}
            <div className="office-meeting-attendees"><b>Attendees</b><div>{attendees.map(attendee => <span key={attendee.agent.id}>{attendee.agent.name} <small>· {pretty(attendee.attendanceStatus)}</small></span>)}</div></div>
            <div className="office-meeting-actions">
              {meeting.status === "scheduled" && <button className="btn primary" disabled={busy} onClick={() => changeStatus(meeting, "start")}>Start meeting & call attendees</button>}
              {meeting.status === "in_progress" && <button className="btn primary" disabled={busy} onClick={() => changeStatus(meeting, "complete")}>Complete meeting</button>}
              {(meeting.status === "scheduled" || meeting.status === "in_progress") && <button className="btn secondary" disabled={busy} onClick={() => changeStatus(meeting, "cancel")}>Cancel</button>}
            </div>
            <label>Meeting notes<textarea rows={4} value={draft.notes} onChange={e => setDrafts(current => ({ ...current, [meeting.id]: { ...draft, notes: e.target.value } }))} placeholder="Record what happened. Do not leave this as an AI-generated claim unless verified." /></label>
            <label>Decisions<textarea rows={3} value={draft.decisions} onChange={e => setDrafts(current => ({ ...current, [meeting.id]: { ...draft, decisions: e.target.value } }))} placeholder="Record confirmed decisions and approvals." /></label>
            <label>Action items (one per line)<textarea rows={3} value={draft.actions} onChange={e => setDrafts(current => ({ ...current, [meeting.id]: { ...draft, actions: e.target.value } }))} placeholder="Follow up on the agreed next steps…" /></label>
            <button className="btn secondary" disabled={busy} onClick={() => saveNotes(meeting)}>Save meeting record</button>
          </div>}
        </article>;
      })}
    </div>
    {message && <p className="office-meeting-message" role="status">{message}</p>}
  </section>;
}
