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
};
type LocalRun = { id: string; agentId: string; taskId: string; output: string; model: string; createdAt: string; syncedAt?: string };
type StoreName = "messages" | "tasks" | "snapshots" | "runs";
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

  async function refreshSnapshot(orgId: string) {
    if (!orgId || !navigator.onLine) return;
    try {
      const response = await fetch("/api/offline/snapshot?organizationId=" + encodeURIComponent(orgId));
      if (!response.ok) return;
      const data = await response.json() as Omit<OfflineSnapshot, "id">;
      const next: OfflineSnapshot = { ...data, id: "active" };
      await saveRecord("snapshots", next);
      setSnapshot(next);
      setSelectedAgentId(current => current || next.agents[0]?.id || "");
      setSelectedTaskId(current => current || next.tasks[0]?.id || "");
    } catch {
      setSyncMessage("Could not refresh the offline employee and task snapshot. The last saved snapshot remains available.");
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
    try { setOrganizationId(localStorage.getItem("kanako-ai-active-org") ?? ""); } catch { setOrganizationId(""); }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    Promise.all([
      readRecords<LocalMessage>("messages"),
      readRecords<LocalTask>("tasks"),
      readRecords<OfflineSnapshot>("snapshots"),
      readRecords<LocalRun>("runs"),
    ]).then(([savedMessages, savedTasks, savedSnapshots, savedRuns]) => {
      if (disposed) return;
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
    if (!engine || !agent || !task || busy) return;
    if (runs.some(run => run.taskId === task.id)) {
      setSyncMessage("This task already has a local result waiting to sync.");
      return;
    }
    setBusy(true);
    setRunOutput("");
    setSyncMessage("Running " + agent.name + " locally. No cloud AI request is being made.");
    try {
      const memories = (snapshot?.memories ?? []).filter(memory => memory.agent_id === agent.id);
      const learning = (snapshot?.learningEvents ?? []).filter(event => event.agent_id === agent.id).slice(0, 8);
      const department = snapshot?.departments.find(item => item.id === agent.department_id);
      const system = [
        "You are " + agent.name + ", " + agent.job_title + ", an AI employee of KANAKO AI.",
        "You are executing locally on the user's device with no internet access. Do not claim to browse the web, access cloud services, or change external systems.",
        "Follow your role instructions unless they conflict with the safety rules: " + (agent.instructions || "Use professional judgment."),
        "Department context: " + JSON.stringify(department ?? null),
        "Human-approved memories: " + JSON.stringify(memories.map(memory => ({ type: memory.memory_type, title: memory.title, content: memory.content }))),
        "Recent reviewer feedback and outcomes: " + JSON.stringify(learning.map(event => ({ outcome: event.event_type, feedback: event.feedback, lesson: event.lesson }))),
        "Examples of this employee's previously approved work (reuse the method only when relevant; do not copy old customer facts): " + JSON.stringify((snapshot?.previousRuns ?? []).filter(run => run.agent_id === agent.id).slice(0, 3).map(run => {
          const input = run.input && typeof run.input === "object" ? run.input as { task_title?: string } : {};
          const output = run.output && typeof run.output === "object" ? run.output as { text?: string } : {};
          return { previous_task: input.task_title, approved_example: typeof output.text === "string" ? output.text.slice(0, 900) : "" };
        })),

        "Use the approved memories and feedback to improve your approach. Do not copy old facts blindly. State limitations, assumptions, deliverables, and next steps.",
        "Do not send messages, spend money, access accounts, or make irreversible changes. Prepare recommendations for human review.",
      ].join("\n\n");
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
      }
      const localRun: LocalRun = {
        id: crypto.randomUUID(),
        agentId: agent.id,
        taskId: task.id,
        output,
        model: MODEL_ID,
        createdAt: new Date().toISOString(),
      };
      await saveRecord("runs", localRun);
      setRuns(current => [localRun, ...current]);
      setSyncMessage("Local result saved on this device. It is not yet in the cloud and still needs human review after synchronization.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "The local AI employee could not run this task.");
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

  const availableTasks = (snapshot?.tasks ?? []).filter(task => (!task.assigned_agent_id || task.assigned_agent_id === selectedAgentId) && !runs.some(run => run.taskId === task.id));
  const availableAgents = snapshot?.agents ?? [];

  return <div className="offline-workspace">
    <div className="panel">
      <div className="row-between"><div><div className="eyebrow">DEVICE-LOCAL AI</div><h2 style={{margin:"8px 0"}}>Offline intelligence</h2></div><span className="pill">{online ? "Online" : "Offline"}</span></div>
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
        <p className="muted" style={{fontSize:12}}>Prepare a workspace snapshot while online. Cached employees use their role instructions and approved memories. Local results stay on this device until you sync them for human review.</p>
        <div className="form-stack">
          <select className="field" value={selectedAgentId} onChange={event=>setSelectedAgentId(event.target.value)} disabled={!availableAgents.length || busy}>
            {!availableAgents.length&&<option value="">No cached active employees</option>}
            {availableAgents.map(agent=><option key={agent.id} value={agent.id}>{agent.name} · {agent.job_title}</option>)}
          </select>
          <select className="field" value={selectedTaskId} onChange={event=>setSelectedTaskId(event.target.value)} disabled={!availableTasks.length || busy}>
            {!availableTasks.length&&<option value="">No cached queued tasks</option>}
            {availableTasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
          <button className="btn" onClick={runOfflineAgent} disabled={!modelReady || !selectedAgentId || !selectedTaskId || !availableTasks.some(task=>task.id===selectedTaskId) || busy}>{busy?"Working…":"Run selected employee offline"}</button>
        </div>
        {runOutput&&<details className="run-output" open><summary>Current local result</summary><pre>{runOutput}</pre></details>}
        <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{runs.filter(run=>!run.syncedAt).length} results waiting · {runs.filter(run=>run.syncedAt).length} synced</span><button className="btn secondary" onClick={syncOfflineRuns} disabled={!online || busy || !runs.some(run=>!run.syncedAt)}>Sync AI results</button></div>
        <div className="offline-task-list">{runs.map(run=><div className="offline-task" key={run.id}><div className="row-between"><strong>{availableAgents.find(agent=>agent.id===run.agentId)?.name ?? "AI employee"}</strong><span className="pill">{run.syncedAt?"Sent for review":"Local only"}</span></div><p className="muted" style={{fontSize:11,margin:"5px 0"}}>{snapshot?.tasks.find(task=>task.id===run.taskId)?.title ?? "Task"} · {new Date(run.createdAt).toLocaleString()}</p><details><summary>View local output</summary><pre className="document-content">{run.output}</pre></details></div>)}{!runs.length&&<div className="empty">No offline employee runs yet.</div>}</div>
        <button className="btn secondary" style={{marginTop:10}} onClick={()=>organizationId&&void refreshSnapshot(organizationId)} disabled={!online || busy}>Refresh employee &amp; task snapshot</button>
      </div>
    </div>

    <div className="panel">
      <div className="eyebrow">LOCAL TASK DRAFTS</div><h3>Capture work offline</h3>
      <form onSubmit={addOfflineTask} className="form-stack"><input className="field" value={taskTitle} onChange={event=>setTaskTitle(event.target.value)} placeholder="Task title" maxLength={180} required/><textarea className="field" value={taskDescription} onChange={event=>setTaskDescription(event.target.value)} rows={3} placeholder="Task details"/><button className="btn">Save on this device</button></form>
      <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{tasks.filter(task=>!task.syncedAt).length} pending · {tasks.filter(task=>task.syncedAt).length} synced</span><button className="btn secondary" onClick={syncTasks} disabled={!online || busy || !tasks.some(task=>!task.syncedAt)}>Sync task drafts</button></div>
      <div className="offline-task-list">{tasks.map(task=><div className="offline-task" key={task.id}><div className="row-between"><strong>{task.title}</strong><span className="pill">{task.syncedAt?"Synced":"Local only"}</span></div>{task.description&&<p className="muted" style={{fontSize:12,margin:"6px 0 0"}}>{task.description}</p>}</div>)}{!tasks.length&&<div className="empty">No offline tasks saved yet.</div>}</div>
    </div>
    {syncMessage&&<p className="muted" style={{fontSize:11}}>{syncMessage}</p>}
    <div className="notice">Offline mode uses a cached workspace snapshot and device-local model. Web research, shared live data, external integrations, and approvals need an internet connection. Syncing an offline employee result creates a cloud AI run in the human-review queue; it does not complete the task automatically. Browser storage may be cleared or evicted, so sync important work when possible.</div>
  </div>;
}
