"use client";

import { useEffect, useRef, useState } from "react";

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DB_NAME = "kanako-ai-local";
const DB_VERSION = 2;

type LocalMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type LocalTask = { id: string; title: string; description: string; createdAt: string; syncedAt?: string };
type OfflineAgent = { id: string; name: string; job_title: string; instructions: string | null; department_id: string | null; capabilities: unknown };
type OfflineCloudTask = { id: string; title: string; description: string | null; status: string; priority: string; department_id: string | null; assigned_agent_id: string | null };
type OfflineMemory = { agent_id: string; memory_type: string; title: string; content: string; confidence: number };
type OfflineLearningEvent = { agent_id: string; event_type: string; feedback: string | null; lesson: string | null; created_at: string };
type OfflinePreviousRun = { agent_id: string; input: unknown; output: unknown; created_at: string };
type OfflineSnapshot = {
  id: string;
  organizationId: string;
  preparedAt: string;
  agents: OfflineAgent[];
  tasks: OfflineCloudTask[];
  departments: { id: string; name: string; description: string | null }[];
  memories: OfflineMemory[];
  learningEvents: OfflineLearningEvent[];
  previousRuns: OfflinePreviousRun[];
  knowledgeDocuments: { title: string; content: string }[];
};
type LocalRun = { id: string; agentId: string; taskId: string; output: string; model: string; createdAt: string; syncedAt?: string; quality?: { status: "ready_for_review" | "needs_revision"; wordCount: number; issues: string[] } };

function reviewLocalOutput(output: string, taskTitle: string, allowedDepartments: string[] = []) {
  const text = output.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const issues: string[] = [];
  if (words.length < 100) issues.push(`The result contains only ${words.length} words and may need more task-specific detail.`);
  if (words.length > 700) issues.push("The result is overly long; review it for repetition and unnecessary detail.");
  const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
  const headings = lines.filter(line => /^#{1,6}\s|^\*\*[^*]+\*\*$/.test(line))
    .map(line => line.replace(/^#{1,6}\s*/, "").replace(/^\*\*|\*\*$/g, "").replace(/:$/, "").toLowerCase());
  const repeated = headings.filter((heading, index) => headings.indexOf(heading) !== index);
  if (repeated.length) issues.push("One or more section headings are repeated.");
  const requiredHeadings = ["task summary", "proposed work product", "implementation details", "acceptance checklist", "risks and missing information", "owner review required"];
  const missingHeadings = requiredHeadings.filter(heading => !headings.some(actual => actual.includes(heading)));
  if (missingHeadings.length) issues.push(`Missing required sections: ${missingHeadings.join(", ")}.`);
  const departmentMentions = [...text.matchAll(/Department\s+\d+\s*:\s*([^\n*]+)/gi)].map(match => match[1].trim());
  const allowed = new Set(allowedDepartments.map(name => name.toLowerCase().trim()));
  const inventedDepartments = departmentMentions.filter(name => !allowed.has(name.toLowerCase()));
  if (inventedDepartments.length) issues.push("The result names departments that are not in the approved workspace roster: " + inventedDepartments.join(", ") + ".");
  const meaningfulTerms = taskTitle.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 3);
  const lower = text.toLowerCase();
  const matchedTerms = meaningfulTerms.filter(term => lower.includes(term));
  if (!meaningfulTerms.length || matchedTerms.length < Math.min(2, meaningfulTerms.length)) {
    issues.push("The output does not clearly reference the assigned task.");
  }
  const bodyLines = lines.filter(line => !/^#{1,6}\s|^\*\*[^*]+\*\*$/.test(line));
  const normalized = bodyLines.map(line => line.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()).filter(line => line.length > 35);
  if (normalized.some((line, index) => normalized.indexOf(line) !== index)) issues.push("One or more content lines are repeated.");
  if (/\b(i have (built|implemented|deployed|updated)|successfully (built|implemented|deployed))\b/i.test(text)) {
    issues.push("The output may claim implementation work that a text-only local run cannot perform.");
  }
  const status = issues.length ? "needs_revision" as const : "ready_for_review" as const;
  return { status, wordCount: words.length, issues };
}type StoreName = "messages" | "tasks" | "snapshots" | "runs";
type LocalEngine = {
  chat: {
    completions: {
      create: (args: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        stream?: boolean;
        temperature?: number;
      }) => Promise<AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>>;
    };
  };
};

function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["messages", "tasks", "snapshots", "runs"]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord<T extends { id: string }>(store: StoreName, value: T) {
  const db = await openLocalDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readRecords<T>(store: StoreName): Promise<T[]> {
  const db = await openLocalDb();
  const values = await new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return values;
}

export function OfflineAIWorkspace() {
  const engineRef = useRef<LocalEngine | null>(null);
  const [online, setOnline] = useState(true);
  const [organizationId, setOrganizationId] = useState("");
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelMessage, setModelMessage] = useState("Model not downloaded on this device.");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [runs, setRuns] = useState<LocalRun[]>([]);
  const [prompt, setPrompt] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);
  const [runStatus, setRunStatus] = useState("");

  async function refreshSnapshot(orgId: string) {
    if (!orgId) {
      setSyncMessage("The cloud workspace ID is not available on this device yet. Open the signed-in owner workspace, wait for it to finish loading, then return here and try again.");
      return;
    }
    if (!navigator.onLine) {
      setSyncMessage("You are offline. Connect to the internet before refreshing the cloud snapshot.");
      return;
    }
    if (refreshingSnapshot || busy) return;
    setRefreshingSnapshot(true);
    setSyncMessage("Connecting to your cloud workspace and preparing the offline snapshot…");
    try {
      const response = await fetch("/api/offline/snapshot?organizationId=" + encodeURIComponent(orgId), { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as Partial<Omit<OfflineSnapshot, "id">> & { error?: string };
      if (!response.ok) throw new Error(data.error || "Snapshot request failed (HTTP " + response.status + ").");
      if (!Array.isArray(data.agents) || !Array.isArray(data.tasks)) {
        throw new Error("The cloud response was incomplete. No new snapshot was saved.");
      }
      const next: OfflineSnapshot = { ...data as Omit<OfflineSnapshot, "id">, id: "active" };
      await saveRecord("snapshots", next);
      setSnapshot(next);
      setSelectedAgentId(current => current || next.agents[0]?.id || "");
      setSelectedTaskId(current => current || next.tasks[0]?.id || "");
      setSyncMessage("Offline snapshot refreshed successfully: " + next.agents.length + " eligible AI employee(s), " + next.tasks.length + " queued or blocked task(s).");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Could not refresh the offline employee and task snapshot. The last saved snapshot remains available.");
    } finally {
      setRefreshingSnapshot(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        try {
          const orgId = localStorage.getItem("kanako-ai-active-org") ?? "";
          if (orgId) void refreshSnapshot(orgId);
        } catch {
          // The offline workspace remains available without cloud context.
        }
      }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    Promise.all([
      readRecords<LocalMessage>("messages"),
      readRecords<LocalTask>("tasks"),
      readRecords<OfflineSnapshot>("snapshots"),
      readRecords<LocalRun>("runs"),
    ]).then(([savedMessages, savedTasks, savedSnapshots, savedRuns]) => {
      if (disposed) return;
      try { setOrganizationId(localStorage.getItem("kanako-ai-active-org") ?? ""); } catch { setOrganizationId(""); }
      setMessages(savedMessages.sort((a,b) => a.createdAt.localeCompare(b.createdAt)));
      setTasks(savedTasks.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      setSnapshot(savedSnapshots.find(item => item.id === "active") ?? null);
      setRuns(savedRuns.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    }).catch(() => setSyncMessage("Local storage is unavailable in this browser."));

    return () => {
      disposed = true;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function prepareModel() {
    if (loadingModel || engineRef.current) return;
    if (!("gpu" in navigator)) {
      setModelMessage("WebGPU is not available in this browser. Use a current Chrome or Edge browser with compatible graphics hardware.");
      return;
    }
    setLoadingModel(true);
    setModelMessage(navigator.onLine
      ? "Loading the local model. If this is the first use, model files will download and may take several minutes."
      : "Trying to load the model already cached on this device. If it has never been downloaded here, connect once first.");
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          setModelProgress(Math.round((report.progress ?? 0) * 100));
          setModelMessage(report.text || "Downloading model files…");
        },
      });
      engineRef.current = engine as unknown as LocalEngine;
      setModelReady(true);
      setModelProgress(100);
      setModelMessage("Local AI model is ready. The model files are cached on this device.");
    } catch (error) {
      setModelMessage(error instanceof Error ? error.message : "Could not load the local model. Check WebGPU and available memory.");
    } finally {
      setLoadingModel(false);
    }
  }

  async function sendLocalMessage() {
    const text = prompt.trim();
    const engine = engineRef.current;
    if (!text || !engine || busy) return;
    setBusy(true);
    setPrompt("");
    const userMessage: LocalMessage = { id: crypto.randomUUID(), role: "user", content: text, createdAt: new Date().toISOString() };
    const assistantMessage: LocalMessage = { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: new Date().toISOString() };
    setMessages(current => [...current, userMessage, assistantMessage]);
    await saveRecord("messages", userMessage);
    try {
      const stream = await engine.chat.completions.create({
        messages: [
          { role: "system", content: "You are KANAKO AI running locally on this device. You are offline. Use only the user's prompt and locally saved context. Never pretend to have internet access, current facts, cloud access, or external system access. Be clear when information may be outdated or when a task must wait for synchronization." },
          ...messages.slice(-12).map(message => ({ role: message.role, content: message.content })),
          { role: "user", content: text },
        ],
        stream: true,
        temperature: 0.5,
      });
      let output = "";
      for await (const chunk of stream) {
        output += chunk.choices[0]?.delta?.content ?? "";
        setMessages(current => current.map(message => message.id === assistantMessage.id ? { ...message, content: output } : message));
      }
      await saveRecord("messages", { ...assistantMessage, content: output });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Local generation failed.";
      const failedMessage = { ...assistantMessage, content: "Local AI error: " + message };
      setMessages(current => current.map(item => item.id === assistantMessage.id ? failedMessage : item));
      await saveRecord("messages", failedMessage);
    } finally {
      setBusy(false);
    }
  }

  async function runOfflineAgent() {
    const engine = engineRef.current;
    const agent = snapshot?.agents.find(item => item.id === selectedAgentId);
    const task = snapshot?.tasks.find(item => item.id === selectedTaskId && (!item.assigned_agent_id || item.assigned_agent_id === selectedAgentId));
    if (busy) { setRunStatus("Another local AI operation is already running. Wait for it to finish."); return; }
    if (!engine) { setRunStatus("Local AI engine is not loaded in memory. Click the local model button to load it again, then retry."); return; }
    if (!agent) { setRunStatus("No cached employee is selected. Refresh the offline snapshot and select an employee."); return; }
    if (!task) { setRunStatus("No eligible cached task is selected for this employee. Check the task assignment or refresh the snapshot."); return; }
    if (runs.some(run => run.taskId === task.id && !run.syncedAt)) {
      setRunStatus("This task already has a local result waiting to sync. Review or sync that result before running it again.");
      return;
    }
    setBusy(true);
    setRunOutput("");
    setRunStatus("Starting offline run for " + agent.name + "…");
    setSyncMessage("Running " + agent.name + " locally. No cloud AI request is being made.");
    try {
      const memories = (snapshot?.memories ?? []).filter(memory => memory.agent_id === agent.id);
      const learning = (snapshot?.learningEvents ?? []).filter(event => event.agent_id === agent.id).slice(0, 8);
      const capabilities = Array.isArray(agent.capabilities) ? agent.capabilities : [];
      const department = capabilities.includes("department_read") ? snapshot?.departments.find(item => item.id === agent.department_id) : null;
      const knowledge = capabilities.includes("knowledge_read") ? (snapshot?.knowledgeDocuments ?? []).map(document => ({ title: document.title, content: document.content.slice(0, 2500) })) : [];
      const system = [
        "You are " + agent.name + ", " + agent.job_title + ", an AI employee of KANAKO AI.",
        "You are executing locally on the user's device with no internet access. Do not claim to browse the web, access cloud services, or change external systems.",
        "Follow your role instructions unless they conflict with the safety rules: " + (agent.instructions || "Use professional judgment."),
        "Department context (only available when permission is granted): " + JSON.stringify(department ?? null),
        "Approved organization knowledge documents (only available when Read Knowledge Base permission is granted): " + JSON.stringify(knowledge),
        "Human-approved memories: " + JSON.stringify(memories.map(memory => ({ type: memory.memory_type, title: memory.title, content: memory.content }))),
        "Recent reviewer feedback and outcomes: " + JSON.stringify(learning.map(event => ({ outcome: event.event_type, feedback: event.feedback, lesson: event.lesson }))),
        "Examples of this employee's previously approved work (reuse the method only when relevant; do not copy old customer facts): " + JSON.stringify((snapshot?.previousRuns ?? []).filter(run => run.agent_id === agent.id).slice(0, 3).map(run => {
          const input = run.input && typeof run.input === "object" ? run.input as { task_title?: string } : {};
          const output = run.output && typeof run.output === "object" ? run.output as { text?: string } : {};
          return { previous_task: input.task_title, approved_example: typeof output.text === "string" ? output.text.slice(0, 900) : "" };
        })),

        "The approved department roster for this organization is exactly: " + (snapshot?.departments ?? []).map(item => item.name).join("; ") + ". Use these exact names only. Never invent, rename, replace, or add departments. If the roster is empty, say the department roster is unavailable; do not guess.",
        "Use the approved memories and feedback only when relevant. Treat the assigned task description, approved department roster, and supplied workspace snapshot as the only sources of truth. Separate verified facts from proposals and assumptions.",
        "This is a software-planning task. Produce a concise implementation specification for the actual KANAKO AI workspace, not a generic essay, imaginary product, or list of capabilities. Do not invent sample departmental tasks, employees, database tables, APIs, files, existing features, or completed work. If a technical detail is not present in the snapshot, label it as a proposed design, not an existing fact.",
        "You can only produce text in this local workspace. You cannot edit source code, databases, files, websites, or external systems. Clearly state that the specification is NOT IMPLEMENTED.",
        "Output exactly these six Markdown headings, each on its own line, in this exact order, with no other headings: ## Task summary; ## Proposed work product; ## Implementation details; ## Acceptance checklist; ## Risks and missing information; ## Owner review required.",
        "Under Proposed work product, give a compact task-register specification tied to the owner's stated requirements. Under Implementation details, list only the next concrete engineering steps. In Acceptance checklist, give testable pass/fail checks. In Risks and missing information, list only genuine unknowns. Under Owner review required, state only decisions the owner must make.",
        "Keep the entire answer between 180 and 350 words. Do not repeat content. Do not add generic security, encryption, backup, API integration, deployment, or maintenance sections unless directly required by the task.",
        "Do not send messages, spend money, access accounts, or make irreversible changes. Prepare recommendations for human review.",
      ].join("\n\n");
      setRunStatus("Kanako is preparing the task instructions and local context…");
      const stream = await engine.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Assigned task: " + task.title + "\nPriority: " + task.priority + "\nDescription: " + (task.description || "No additional description.") },
        ],
        stream: true,
        temperature: 0.35,
      });
      let output = "";
      for await (const chunk of stream) {
        output += chunk.choices[0]?.delta?.content ?? "";
        setRunOutput(output);
        setRunStatus("Kanako is working locally… " + output.length + " characters generated.");
      }
      if (!output.trim()) throw new Error("The local model returned an empty result. Please try again.");
      const quality = reviewLocalOutput(output, task.title, (snapshot?.departments ?? []).map(item => item.name));
      const localRun: LocalRun = {
        id: crypto.randomUUID(),
        agentId: agent.id,
        taskId: task.id,
        output,
        model: MODEL_ID,
        createdAt: new Date().toISOString(),
        quality,
      };
      await saveRecord("runs", localRun);
      setRuns(current => [localRun, ...current]);
      setRunStatus("Offline run completed successfully. " + agent.name + " generated a result for “" + task.title + "” and saved it on this device. Human review is still required.");
      setSyncMessage("Local result saved on this device. It is not yet in the cloud and still needs human review after synchronization.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The local AI employee could not run this task.";
      setRunStatus("Offline run failed: " + message);
      setSyncMessage(message);
    } finally {
      setBusy(false);
    }
  }

  async function addOfflineTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    const task: LocalTask = {
      id: crypto.randomUUID(),
      title,
      description: taskDescription.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveRecord("tasks", task);
    setTasks(current => [task, ...current]);
    setTaskTitle("");
    setTaskDescription("");
    setSyncMessage("Saved on this device. It has not been sent to the cloud.");
  }

  async function syncTasks() {
    const pending = tasks.filter(task => !task.syncedAt);
    if (!pending.length || !online || busy) return;
    if (!organizationId) { setSyncMessage("Open the main KANAKO workspace once while online so this device can remember the target workspace."); return; }
    setBusy(true);
    setSyncMessage("Syncing local task drafts…");
    try {
      const response = await fetch("/api/offline/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, tasks: pending }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sync failed.");
      const syncedIds = new Set<string>(data.syncedIds ?? []);
      const updated = tasks.map(task => syncedIds.has(task.id) ? { ...task, syncedAt: new Date().toISOString() } : task);
      await Promise.all(updated.filter(task => syncedIds.has(task.id)).map(task => saveRecord("tasks", task)));
      setTasks(updated);
      await refreshSnapshot(organizationId);
      setSyncMessage("Synced " + syncedIds.size + " task(s) to the cloud. Local copies remain on this device.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Could not sync local tasks.");
    } finally {
      setBusy(false);
    }
  }

  async function syncOfflineRuns() {
    const pending = runs.filter(run => !run.syncedAt);
    if (!pending.length || !online || busy) return;
    if (!organizationId) { setSyncMessage("Open the main KANAKO workspace once while online so this device can remember the target workspace."); return; }
    setBusy(true);
    setSyncMessage("Uploading local AI results for human review…");
    try {
      const response = await fetch("/api/offline/sync-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, runs: pending.map(run => ({ id: run.id, agentId: run.agentId, taskId: run.taskId, output: run.output, model: run.model })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Offline result sync failed.");
      const syncedIds = new Set<string>(data.syncedIds ?? []);
      const updated = runs.map(run => syncedIds.has(run.id) ? { ...run, syncedAt: new Date().toISOString() } : run);
      await Promise.all(updated.filter(run => syncedIds.has(run.id)).map(run => saveRecord("runs", run)));
      setRuns(updated);
      await refreshSnapshot(organizationId);
      setSyncMessage("Synced " + syncedIds.size + " AI result(s). They are now in the cloud AI Workforce review queue.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Could not sync offline AI results.");
    } finally {
      setBusy(false);
    }
  }

  const availableTasks = (snapshot?.tasks ?? []).filter(task => (!task.assigned_agent_id || task.assigned_agent_id === selectedAgentId) && !runs.some(run => run.taskId === task.id && !run.syncedAt));
  const availableAgents = snapshot?.agents ?? [];

  return <div className="offline-workspace">
    <div className="panel">
      <div className="row-between"><div><div className="eyebrow">DEVICE-LOCAL AI</div><h2 style={{margin:"8px 0"}}>Local intelligence</h2></div><span className="pill">{online ? "Online" : "Offline"}</span></div>
      <p className="muted" style={{fontSize:13}}>A small language model runs directly in your browser. Download it once while connected; after its files are cached, local chat and cached AI employee tasks can run without sending prompts to a cloud AI provider.</p>
      <div className="row-between" style={{gap:12,flexWrap:"wrap"}}><div><strong style={{fontSize:13}}>Llama 3.2 1B · 4-bit</strong><div className="muted" style={{fontSize:11}}>Estimated graphics memory requirement: about 0.9 GB</div></div><button className="btn" onClick={prepareModel} disabled={loadingModel || modelReady}>{loadingModel ? "Preparing…" : modelReady ? "Local model ready" : "Download / load local model"}</button></div>
      {(loadingModel || modelProgress>0)&&<div style={{height:7,background:"#202a39",borderRadius:8,marginTop:14,overflow:"hidden"}}><div style={{height:"100%",width:modelProgress+"%",background:"#8b7cff",transition:"width .2s"}}/></div>}
      <p className="muted" style={{fontSize:11,marginBottom:0}}>{modelMessage}</p>
    </div>

    <div className="offline-columns">
      <div className="panel">
        <div className="eyebrow">LOCAL CHAT</div><h3>Talk to local KANAKO</h3>
        <div className="offline-chat-history">{messages.map(message=><div className={`offline-message ${message.role}`} key={message.id}><strong>{message.role==="user"?"You":"KANAKO · Local"}</strong><p>{message.content || "…"}</p></div>)}{!messages.length&&<div className="empty">Local conversations will be saved on this device.</div>}</div>
        <form onSubmit={event=>{event.preventDefault();void sendLocalMessage();}} className="form-stack"><textarea className="field" value={prompt} onChange={event=>setPrompt(event.target.value)} rows={3} placeholder="Ask a question or work on a draft offline…" disabled={!modelReady || busy}/><button className="btn" disabled={!modelReady || !prompt.trim() || busy}>{busy?"Working…":"Send to local AI"}</button></form>
      </div>
      <div className="panel">
        <div className="eyebrow">OFFLINE AI EMPLOYEES</div><h3>Run a cached employee locally</h3>
        <p className="muted" style={{fontSize:12}}>Sign in to the online owner workspace while connected, then prepare a workspace snapshot here. Approved employees, tasks, and learning context can then be cached on this device for local execution.</p>
        <div className="form-stack">
          <select className="field" value={selectedAgentId} onChange={event=>setSelectedAgentId(event.target.value)} disabled={!availableAgents.length || busy}>
            {!availableAgents.length&&<option value="">No cached active employees</option>}
            {availableAgents.map(agent=><option key={agent.id} value={agent.id}>{agent.name} · {agent.job_title}</option>)}
          </select>
          <select className="field" value={selectedTaskId} onChange={event=>setSelectedTaskId(event.target.value)} disabled={!availableTasks.length || busy}>
            {!availableTasks.length&&<option value="">No cached queued tasks</option>}
            {availableTasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
          <button className="btn" onClick={runOfflineAgent} disabled={!modelReady || !selectedAgentId || !selectedTaskId || !availableTasks.some(task=>task.id===selectedTaskId) || busy}>{busy?"Running offline…":"Run selected employee offline"}</button>
          {runStatus && <div role={runStatus.startsWith("Offline run failed:") ? "alert" : "status"} aria-live="polite" className="notice" style={{marginTop:10}}>{runStatus}</div>}
        </div>
        {runOutput&&<details className="run-output" open><summary>Current local result</summary><pre>{runOutput}</pre></details>}
        <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{runs.filter(run=>!run.syncedAt).length} results waiting · {runs.filter(run=>run.syncedAt).length} synced</span><button className="btn secondary" onClick={syncOfflineRuns} disabled={!online || !organizationId || !runs.some(run=>!run.syncedAt)}>Sync results</button></div>
        <div className="offline-task-list">{runs.map(run=><div className="offline-task" key={run.id}><div className="row-between"><strong>{availableAgents.find(agent=>agent.id===run.agentId)?.name ?? "AI employee"}</strong><span className="pill">{run.syncedAt?"Sent for review":"Local only"}</span><span className="pill">{run.quality?.status === "ready_for_review" ? "Quality checks passed" : run.quality ? "Needs revision" : "Not reviewed"}</span></div>{run.quality?.issues.length ? <ul className="muted" style={{fontSize:11,margin:"6px 0",paddingLeft:18}}>{run.quality.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul> : null}<p className="muted" style={{fontSize:11,margin:"5px 0"}}>{snapshot?.tasks.find(task=>task.id===run.taskId)?.title ?? "Task"} · {new Date(run.createdAt).toLocaleString()}</p><details><summary>View local output</summary><pre className="document-content">{run.output}</pre></details></div>)}{!runs.length&&<div className="empty">No offline employee runs yet.</div>}</div>
        <button className="btn secondary" style={{marginTop:10}} onClick={()=>void refreshSnapshot(organizationId)} disabled={!online || !organizationId || refreshingSnapshot || busy}>{refreshingSnapshot ? "Refreshing snapshot…" : snapshot ? "Refresh offline snapshot" : "Prepare offline snapshot"}</button>
      </div>
    </div>

    <div className="panel">
      <div className="eyebrow">LOCAL TASK DRAFTS</div><h3>Capture work offline</h3>
      <form onSubmit={addOfflineTask} className="form-stack"><input className="field" value={taskTitle} onChange={event=>setTaskTitle(event.target.value)} placeholder="Task title" maxLength={180} required/><textarea className="field" value={taskDescription} onChange={event=>setTaskDescription(event.target.value)} rows={3} placeholder="Task details"/><button className="btn">Save on this device</button></form>
      <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{tasks.filter(task=>!task.syncedAt).length} pending · {tasks.filter(task=>task.syncedAt).length} synced</span><button className="btn secondary" onClick={syncTasks} disabled={!online || !organizationId || !tasks.some(task=>!task.syncedAt)}>Sync tasks</button></div>
      <div className="offline-task-list">{tasks.map(task=><div className="offline-task" key={task.id}><div className="row-between"><strong>{task.title}</strong><span className="pill">{task.syncedAt?"Synced":"Local only"}</span></div>{task.description&&<p className="muted" style={{fontSize:12,margin:"6px 0 0"}}>{task.description}</p>}</div>)}{!tasks.length&&<div className="empty">No offline tasks saved yet.</div>}</div>
    </div>
    {syncMessage&&<p className="muted" style={{fontSize:11}}>{syncMessage}</p>}
    <div className="notice">Hybrid mode keeps the local model, chats, task drafts, employee snapshots, and offline results in this browser. Connect online and sign in to refresh the employee snapshot or sync drafts and results to your cloud workspace. Online research, live integrations, and approvals require an internet connection. Device-local data does not automatically sync; use the Sync controls while online. Browser storage may be cleared or evicted, so keep important work synchronized.</div>
  </div>;
}
