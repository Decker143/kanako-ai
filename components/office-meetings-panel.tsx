"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AgentOption = { id: string; name: string; jobTitle: string; departmentId: string | null };
type Meeting = {
  id: string; title: string; agenda: string; status: string; scheduledFor: string | null;
  notes: string; decisions: string; actionItems: { text: string; completed?: boolean }[];
  createdAt: string; attendees: { agentId: string; attendanceStatus: string }[];
};

type LocalMeetingEngine = {
  chat: {
    completions: {
      create: (args: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{ choices: Array<{ message?: { content?: string } }> }>;
    };
  };
  interruptGenerate?: () => void;
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
  const localEngineRef = useRef<LocalMeetingEngine | null>(null);
  const [localModelReady, setLocalModelReady] = useState(false);
  const [loadingLocalModel, setLoadingLocalModel] = useState(false);
  const [localModelProgress, setLocalModelProgress] = useState(0);
  const [localModelMessage, setLocalModelMessage] = useState("Free local AI model is not loaded on this device.");
  const [localGenerationSeconds, setLocalGenerationSeconds] = useState(0);

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
  async function generateMeetingDraft(meeting: Meeting) {
    const existing = getDraft(meeting);
    setBusy(true); setMessage("");
    try {
      const result = await request("/api/office/meetings/facilitate", "POST", { organizationId, meetingId: meeting.id });
      const separator = "\n\n---\n\n";
      setDrafts(current => ({
        ...current,
        [meeting.id]: {
          notes: existing.notes ? existing.notes + separator + result.notes : result.notes,
          decisions: existing.decisions ? existing.decisions + separator + result.decisions : result.decisions,
          actions: [existing.actions, ...(result.actionItems ?? []).map((item: { text: string }) => item.text)].filter(Boolean).join("\n"),
        },
      }));
      setMessage("AI discussion draft prepared. Review and edit it before saving; it is not a transcript or an approved decision.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "AI meeting draft could not be generated."); }
    finally { setBusy(false); }
  }
  async function prepareLocalMeetingModel() {
    if (loadingLocalModel || localEngineRef.current) return;
    if (!("gpu" in navigator)) {
      setLocalModelMessage("WebGPU is unavailable. Use an updated Chrome or Edge browser with compatible graphics hardware.");
      return;
    }
    setLoadingLocalModel(true);
    setLocalModelMessage("Downloading and preparing the free local model. First-time setup may take several minutes and uses about 0.9 GB of graphics memory.");
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC", {
        initProgressCallback: (report) => {
          setLocalModelProgress(Math.round((report.progress ?? 0) * 100));
          setLocalModelMessage(report.text || "Downloading local model files…");
        },
      });
      localEngineRef.current = engine as unknown as LocalMeetingEngine;
      setLocalModelReady(true);
      setLocalModelProgress(100);
      setLocalModelMessage("Free local AI is ready on this device. Prompts are processed in your browser, not sent to Vercel AI Gateway.");
    } catch (error) {
      setLocalModelMessage(error instanceof Error ? error.message : "Could not load the local model. Check WebGPU support and available memory.");
    } finally {
      setLoadingLocalModel(false);
    }
  }

  async function generateLocalMeetingDraft(meeting: Meeting) {
    const engine = localEngineRef.current;
    if (!engine || busy) return;
    const attendeeContext = meeting.attendees.map(item => ({
      name: agentMap.get(item.agentId)?.name ?? "AI employee",
      role: agentMap.get(item.agentId)?.jobTitle ?? "Team member",
      attendance: item.attendanceStatus,
    }));
    setBusy(true);
    setLocalGenerationSeconds(0);
    setMessage("Local AI is generating the meeting draft on this device. Please keep this tab open.");
    setLocalModelMessage("Generating locally. The draft is limited to a concise brief (maximum 512 tokens).");
    const generationStartedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      setLocalGenerationSeconds(Math.floor((Date.now() - generationStartedAt) / 1000));
    }, 1000);
    let timeoutId: number | undefined;
    try {
      const generationRequest = engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content: [
              "You are Kanako, the practical AI CEO and meeting facilitator for KANAKO AI.",
              "Write a concise MEETING PREPARATION BRIEF for the company owner. This is a planning aid, never meeting minutes, dialogue, a transcript, or a claim that anyone spoke.",
              "Use only the meeting title, agenda, and listed invitees supplied by the user. Invitees are not proof of attendance or contribution.",
              "Do not invent tasks, priorities, company facts, metrics, progress, opinions, agreements, or completed work.",
              "If the agenda mentions tasks or priorities but no task list or status details are supplied, clearly say that the actual task list was not provided. Do not pretend to know what the tasks are.",
              "Be specific about what the owner should examine for each agenda item. Avoid generic filler and do not repeat the same point in multiple sections.",
              "For proposed decisions, give practical decision options or criteria for choosing; do not merely turn the agenda into questions. Mark all decisions as pending owner approval.",
              "Suggested next steps must be concrete preparation steps, recommendations only, and not assigned to employees.",
              "List only genuine missing information needed to make decisions. Do not repeat the agenda as an information gap.",
              "If Kanako is the only invitee, call it a CEO planning brief and state that it is an individual planning exercise, not a team discussion.",
              "Use exactly these headings once each: Meeting purpose; Agenda breakdown; Key questions; Options to consider; Proposed decisions for owner review; Suggested next steps (not assigned); Information gaps.",
              "Under each heading give useful, non-duplicative bullets. Keep the entire brief under 250 words. Never add a second Information Gaps section.",
              "If the agenda is empty, state that clearly and provide only a few useful questions to help the owner define it.",
            ].join("\\n\\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              meeting: { title: meeting.title, agenda: meeting.agenda, status: meeting.status },
              invitedAttendees: attendeeContext,
              instruction: "Prepare a draft for the owner to review. Do not imply that the listed attendees actually spoke.",
            }),
          },
        ],
        temperature: 0.2,
        max_tokens: 512,
      });
      const completion = await Promise.race([
        generationRequest,
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            engine.interruptGenerate?.();
            reject(new Error("Local AI took longer than 120 seconds and was stopped. Your meeting notes were not changed. Try again after closing other heavy browser tabs or checking available graphics memory."));
          }, 120000);
        }),
      ]);
      const output = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!output) throw new Error("The local model completed but returned an empty response. Please try again.");
      setDrafts(current => {
        const existing = getDraft(meeting);
        return { ...current, [meeting.id]: { ...existing, notes: "LOCAL AI-GENERATED MEETING PREPARATION BRIEF — NOT A TRANSCRIPT\n\n" + output } };
      });
      setLocalModelMessage("Local AI draft generated successfully. It is ready for your review."); 
      setMessage("Free local AI meeting preparation brief generated. It used the meeting title, agenda, and invitee list only; it did not access the live task list or record a real discussion. Review and save it yourself.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Local AI could not prepare this meeting draft.";
      const gpuDeviceLost = /mapAsync|GPUBuffer|external Instance|device lost|WebGPU/i.test(errorMessage);
      if (gpuDeviceLost) {
        // A lost WebGPU device leaves the current WebLLM engine unusable.
        // Require a page reload so the browser can create a fresh GPU context.
        localEngineRef.current = null;
        setLocalModelReady(false);
        setLocalModelProgress(0);
        setLocalModelMessage("The browser's GPU session was lost. Refresh this page, then prepare the free local AI model again. The model should remain cached, so it may not need a full download.");
        setMessage("Local AI stopped because the browser lost its GPU session. Your existing meeting record was not changed. Refresh this page, then prepare free local AI again.");
      } else {
        setLocalModelMessage(errorMessage);
        setMessage(errorMessage);
      }
    } finally {
      window.clearInterval(progressTimer);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setBusy(false);
    }
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
      <div><div className="eyebrow">COLLABORATION HUB</div><h2>Meetings & decisions</h2><p className="muted">Schedule meetings, bring employees to the hub, and prepare AI-assisted discussion drafts for your review.</p></div>
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
            <div className="office-meeting-attendees"><b>Attendee attendance</b><div>{attendees.map(attendee => <span className="office-attendee-row" key={attendee.agent.id}><b>{attendee.agent.name}</b><strong className={"office-attendance-status " + attendee.attendanceStatus}>{pretty(attendee.attendanceStatus)}</strong></span>)}</div></div>
            <div className="office-meeting-actions">
              {meeting.status === "scheduled" && <button className="btn primary" disabled={busy} onClick={() => changeStatus(meeting, "start")}>Start meeting & call attendees</button>}
              {meeting.status === "in_progress" && <button className="btn primary" disabled={busy} onClick={() => changeStatus(meeting, "complete")}>Complete meeting</button>}
              {(meeting.status === "scheduled" || meeting.status === "in_progress") && <button className="btn secondary" disabled={busy} onClick={() => changeStatus(meeting, "cancel")}>Cancel</button>}
            </div>
            {(meeting.status === "in_progress" || meeting.status === "completed") && <div className="office-meeting-ai-draft">
              <button className="btn secondary" disabled={busy} onClick={() => generateMeetingDraft(meeting)}>{busy ? "Preparing…" : "Generate AI discussion draft"}</button>
              <small>Cloud AI uses Vercel AI Gateway and may require provider billing verification. The free local option below does not use AI Gateway.</small>
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn secondary" type="button" disabled={loadingLocalModel || localModelReady || busy} onClick={() => void prepareLocalMeetingModel()}>
                    {loadingLocalModel ? "Preparing local AI…" : localModelReady ? "Free local AI ready" : "Prepare free local AI"}
                  </button>
                  <button className="btn secondary" type="button" disabled={!localModelReady || busy} onClick={() => void generateLocalMeetingDraft(meeting)}>
                    {busy ? "Preparing…" : "Generate with local AI"}
                  </button>
                </div>
                {(loadingLocalModel || localModelProgress > 0) && <div style={{ height: 6, background: "#263244", borderRadius: 8, overflow: "hidden" }}><div style={{ height: "100%", width: localModelProgress + "%", background: "#8b7cff", transition: "width .2s" }} /></div>}
                <small>{busy && localModelReady ? `${localModelMessage} · ${Math.floor(localGenerationSeconds / 60).toString().padStart(2, "0")}:${(localGenerationSeconds % 60).toString().padStart(2, "0")} elapsed` : localModelMessage}</small>
              </div>
              <small>All AI-generated content is a proposal only — not a recording, transcript, real-time conversation, or approved decision.</small>
            </div>}
            <label>Meeting notes<textarea rows={4} value={draft.notes} onChange={e => setDrafts(current => ({ ...current, [meeting.id]: { ...draft, notes: e.target.value } }))} placeholder="Record what happened. Clearly label AI-generated drafts and verify them before saving." /></label>
            <label>Decisions<textarea rows={3} value={draft.decisions} onChange={e => setDrafts(current => ({ ...current, [meeting.id]: { ...draft, decisions: e.target.value } }))} placeholder="Record confirmed decisions and approvals." /></label>
            <label>Action items (one per line)<textarea rows={3} value={draft.actions} onChange={e => setDrafts(current => ({ ...current, [meeting.id]: { ...draft, actions: e.target.value } }))} placeholder="Review suggested next steps and owners…" /></label>
            <button className="btn secondary" disabled={busy} onClick={() => saveNotes(meeting)}>Save meeting record</button>
          </div>}
        </article>;
      })}
    </div>
    {message && <p className="office-meeting-message" role="alert" style={{ marginTop: 16, padding: "12px 14px", border: "1px solid var(--border, #39465a)", borderRadius: 10, background: "var(--panel, #151e2b)", color: "var(--text, #e8edf5)", lineHeight: 1.5 }}>{message}</p>}
  </section>;
}
