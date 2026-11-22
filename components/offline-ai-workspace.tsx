"use client";

import { useEffect, useRef, useState } from "react";

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DB_NAME = "kanako-ai-local";
const DB_VERSION = 1;

type LocalMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type LocalTask = { id: string; title: string; description: string; createdAt: string; syncedAt?: string };
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
      if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id" });
      if (!db.objectStoreNames.contains("tasks")) db.createObjectStore("tasks", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord<T extends { id: string }>(store: "messages" | "tasks", value: T) {
  const db = await openLocalDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readRecords<T>(store: "messages" | "tasks"): Promise<T[]> {
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
  const [modelReady, setModelReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelMessage, setModelMessage] = useState("Model not downloaded on this device.");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [prompt, setPrompt] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    try { setOrganizationId(localStorage.getItem("kanako-ai-active-org") ?? ""); } catch { setOrganizationId(""); }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    Promise.all([readRecords<LocalMessage>("messages"), readRecords<LocalTask>("tasks")])
      .then(([savedMessages, savedTasks]) => {
        setMessages(savedMessages.sort((a,b) => a.createdAt.localeCompare(b.createdAt)));
        setTasks(savedTasks.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch(() => setSyncMessage("Local storage is unavailable in this browser."));
    return () => {
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
    const next = [...messages, userMessage, assistantMessage];
    setMessages(next);
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
      setMessages(current => current.map(item => item.id === assistantMessage.id ? { ...item, content: "Local AI error: " + message } : item));
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
      setSyncMessage(`Synced ${syncedIds.size} task(s) to the cloud. Local copies remain on this device.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Could not sync local tasks.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="offline-workspace">
    <div className="panel">
      <div className="row-between"><div><div className="eyebrow">DEVICE-LOCAL AI</div><h2 style={{margin:"8px 0"}}>Offline intelligence</h2></div><span className="pill">{online ? "Online" : "Offline"}</span></div>
      <p className="muted" style={{fontSize:13}}>A small language model runs directly in your browser. Download it once while connected; after its files are cached, local chat can run without sending prompts to a cloud AI provider.</p>
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
        <div className="eyebrow">LOCAL TASK DRAFTS</div><h3>Capture work offline</h3>
        <form onSubmit={addOfflineTask} className="form-stack"><input className="field" value={taskTitle} onChange={event=>setTaskTitle(event.target.value)} placeholder="Task title" maxLength={180} required/><textarea className="field" value={taskDescription} onChange={event=>setTaskDescription(event.target.value)} rows={3} placeholder="Task details"/><button className="btn">Save on this device</button></form>
        <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{tasks.filter(task=>!task.syncedAt).length} pending · {tasks.filter(task=>task.syncedAt).length} synced</span><button className="btn secondary" onClick={syncTasks} disabled={!online || busy || !tasks.some(task=>!task.syncedAt)}>Sync tasks</button></div>
        <div className="offline-task-list">{tasks.map(task=><div className="offline-task" key={task.id}><div className="row-between"><strong>{task.title}</strong><span className="pill">{task.syncedAt?"Synced":"Local only"}</span></div>{task.description&&<p className="muted" style={{fontSize:12,margin:"6px 0 0"}}>{task.description}</p>}</div>)}{!tasks.length&&<div className="empty">No offline tasks saved yet.</div>}</div>
        {syncMessage&&<p className="muted" style={{fontSize:11}}>{syncMessage}</p>}
      </div>
    </div>
    <div className="notice">Offline mode is device-local. Cloud conversations, shared company data, web research, external integrations, and approvals need an internet connection. Local AI quality and speed depend on your browser, graphics hardware, and available memory. Model download happens only when you press the button.</div>
  </div>;
}
