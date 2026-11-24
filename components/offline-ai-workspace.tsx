"use client";

import { useEffect, useRef, useState } from "react";

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DB_NAME = "kanako-ai-local";
const DB_VERSION = 2;

type LocalMessage = { id: string; organizationId: string; role: "user" | "assistant"; content: string; createdAt: string };
type LocalTask = { id: string; organizationId: string; title: string; description: string; createdAt: string; syncedAt?: string };
type OfflineAgent = { id: string; name: string; job_title: string; instructions: string | null; department_id: string | null; capabilities: unknown };
type OfflineCloudTask = { id: string; title: string; description: string | null; status: string; priority: string; department_id: string | null; assigned_agent_id: string | null };
type OfflineMemory = { agent_id: string; memory_type: string; title: string; content: string; confidence: number };
type OfflineLearningEvent = { agent_id: string; event_type: string; feedback: string | null; lesson: string | null; created_at: string };
type OfflinePreviousRun = { agent_id: string; input: unknown; output: unknown; created_at: string };
type OfflineSnapshot = {
  id: string;
  organizationId: string;
  organizationName: string;
  preparedAt: string;
  agents: OfflineAgent[];
  tasks: OfflineCloudTask[];
  departments: { id: string; name: string; description: string | null }[];
  memories: OfflineMemory[];
  learningEvents: OfflineLearningEvent[];
  previousRuns: OfflinePreviousRun[];
  knowledgeDocuments: { title: string; content: string }[];
};
type LocalRun = { id: string; organizationId: string; agentId: string; taskId: string; output: string; model: string; createdAt: string; syncedAt?: string; quality?: { status: "ready_for_review" | "needs_revision"; wordCount: number; issues: string[] } };

function buildTaskRegisterSpecification(taskTitle: string) {
  return [
    "## Task summary",
    "Extend the existing KANAKO AI Task Center; this is a specification only and is NOT IMPLEMENTED.",
    "",
    "## Proposed work product",
    "Improve the current owner-facing register instead of creating a second task system. Keep the existing task record as the source of truth: tasks.organization_id, tasks.title, tasks.description, tasks.status, tasks.priority, tasks.due_at, tasks.department_id, and tasks.assigned_agent_id. Preserve the six statuses: queued, in_progress, blocked, in_review, completed, and cancelled. Show department, assigned employee (or Unassigned), priority, due date, current status, and recent task activity in each task view.",
    "",
    "## Implementation details",
    "In app/page.tsx, extend the existing Task Center list and edit controls to expose the verified fields, filter by department/status/assignee, and show task_updates history. In app/actions.ts, build on createTask, updateTaskStatus, createTaskUpdate, and approveTaskHandoff rather than adding duplicate actions. Keep every read and mutation scoped by organization_id from the authenticated membership. Validate department_id against departments.organization_id and assigned_agent_id against ai_agents.organization_id. Record task events in task_updates and actions in activity_logs. Keep due_at as the existing deadline field; do not add a separate schedule field unless the owner later requests time-of-day scheduling.",
    "",
    "## Acceptance checklist",
    "1. Create a task with and without department_id and assigned_agent_id; both valid cases save under the current organization.",
    "2. Edit priority and due_at and confirm the updated values appear after refresh.",
    "3. Verify queued, in_progress, blocked, in_review, completed, and cancelled are displayed and only valid transitions are accepted.",
    "4. Add a progress note and blocker; confirm task_updates and activity_logs contain the matching organization_id and task reference.",
    "5. Attempt to use another organization's department or AI employee ID; the action must reject it.",
    "",
    "## Risks and missing information",
    "The current task form supports a date-only due_at value, not a scheduled time. Confirm whether time-of-day scheduling is actually required. Confirm whether task deletion is required; no delete action is established by the reviewed task actions. Department and employee assignment may remain optional, so the UI must display Unassigned clearly.",
    "",
    "## Owner review required",
    "Confirm whether task deletion and time-of-day scheduling are in scope. No new database table or column is recommended for the currently stated requirements."
  ].join("\n");
}

function reviewLocalOutput(output: string, taskTitle: string, allowedDepartments: string[] = []) {
  const text = output.trim().replace(/\\(?=#{1,6}\\s)/g, "");
  const words = text.split(/\s+/).filter(Boolean);
  const issues: string[] = [];
  if (words.length < 180) issues.push("The specification is too short; include concrete implementation and test details.");
  if (words.length > 450) issues.push("The result is too long; remove repetition and unrelated detail.");
  const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
  const headings = lines.filter(line => /^#{1,6}\s/.test(line)).map(line => line.replace(/^#{1,6}\s*/, "").toLowerCase());
  const required = ["task summary", "proposed work product", "implementation details", "acceptance checklist", "risks and missing information", "owner review required"];
  const missing = required.filter(heading => !headings.includes(heading));
  if (missing.length) issues.push("Missing required sections: " + missing.join(", ") + ".");
  if (headings.length !== 6 || required.some((heading, index) => headings[index] !== heading)) issues.push("Use exactly the six required headings in the required order.");
  const lower = text.toLowerCase();
  const meaningfulTerms = taskTitle.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 3);
  if (!meaningfulTerms.length || meaningfulTerms.filter(term => lower.includes(term)).length < Math.min(2, meaningfulTerms.length)) issues.push("The output does not clearly reference the assigned task.");
  const allowed = new Set(allowedDepartments.map(name => name.toLowerCase().trim()));
  const departmentMentions = [...text.matchAll(/Department\s+\d+\s*:\s*([^\n*]+)/gi)].map(match => match[1].trim());
  if (departmentMentions.some(name => !allowed.has(name.toLowerCase()))) issues.push("The result names departments outside the approved workspace roster.");
  const normalized = lines.map(line => line.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()).filter(line => line.length > 40);
  if (normalized.some((line, index) => normalized.indexOf(line) !== index)) issues.push("One or more content lines are repeated.");

  if (/centralized\s+task\s+register/i.test(taskTitle)) {
    const requiredArchitecture = ["app/page.tsx", "app/actions.ts", "tasks.organization_id", "tasks.due_at", "tasks.department_id", "tasks.assigned_agent_id", "task_updates", "activity_logs", "queued", "in_progress", "blocked", "in_review", "completed", "cancelled"];
    const normalizedArchitectureText = lower.replace(/[^a-z0-9]+/g, "");
    const missingArchitecture = requiredArchitecture.filter(token => !normalizedArchitectureText.includes(token.toLowerCase().replace(/[^a-z0-9]+/g, "")));
    if (missingArchitecture.length) issues.push("Missing verified architecture details: " + missingArchitecture.join(", ") + ".");
    const implementation = lower.split("## implementation details")[1]?.split("## acceptance checklist")[0] ?? "";
    if (!implementation.includes("app/page.tsx") || !implementation.includes("app/actions.ts")) issues.push("Implementation details must describe changes to app/page.tsx and app/actions.ts.");
    if (!implementation.includes("organization_id")) issues.push("Explain organization-scoped validation in implementation details.");
  }
  if (/\b(i have (built|implemented|deployed|updated)|successfully (built|implemented|deployed))\b/i.test(text)) issues.push("The output may claim implementation work that a text-only local run cannot perform.");
  return { status: issues.length ? "needs_revision" as const : "ready_for_review" as const, wordCount: words.length, issues };
}

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

async function saveRecord<T extends { id: string; organizationId: string }>(store: StoreName, value: T) {
  const db = await openLocalDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put({ ...value, recordId: value.id, id: value.organizationId + ":" + value.id });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readRecords<T extends { id: string; organizationId: string }>(store: StoreName, organizationId: string): Promise<T[]> {
  const db = await openLocalDb();
  const values = await new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve((request.result as Array<T & { recordId?: string }>).filter(item => item.organizationId === organizationId && item.id.startsWith(organizationId + ":")).map(item => ({ ...item, id: item.recordId ?? item.id.slice(organizationId.length + 1) })) as T[]);
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
    if (refreshingSnapshot || busy) {
      setSyncMessage("A local AI operation is already running. Wait for it to finish, then refresh the snapshot.");
      return;
    }
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
      setSelectedAgentId(current => next.agents.some(agent => agent.id === current) ? current : next.agents[0]?.id || "");
      setSelectedTaskId(current => next.tasks.some(task => task.id === current) ? current : next.tasks[0]?.id || "");
      setSyncMessage("Offline snapshot refreshed successfully: " + next.agents.length + " eligible AI employee(s), " + next.tasks.length + " queued or blocked task(s).");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Could not refresh the offline employee and task snapshot. The last saved snapshot remains available.");
    } finally {
      setRefreshingSnapshot(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    let currentOrganizationId: string | null = null;

    const loadWorkspace = (nextOrganizationId: string) => {
      if (currentOrganizationId === nextOrganizationId) return;
      currentOrganizationId = nextOrganizationId;
      // Clear the previous workspace immediately so its cached data is never shown
      // while the newly selected workspace is loading.
      setOrganizationId(nextOrganizationId);
      setSnapshot(null);
      setMessages([]);
      setTasks([]);
      setRuns([]);
      setSelectedAgentId("");
      setSelectedTaskId("");
      setRunOutput("");
      setSyncMessage(nextOrganizationId ? "Loading this workspace's device-local records…" : "No active cloud workspace selected.");

      const storageOrganizationId = nextOrganizationId || "device-local";
      Promise.all([
        readRecords<LocalMessage>("messages", storageOrganizationId),
        readRecords<LocalTask>("tasks", storageOrganizationId),
        readRecords<OfflineSnapshot>("snapshots", storageOrganizationId),
        readRecords<LocalRun>("runs", storageOrganizationId),
      ]).then(([savedMessages, savedTasks, savedSnapshots, savedRuns]) => {
        if (disposed || currentOrganizationId !== nextOrganizationId) return;
        setMessages(savedMessages.sort((a,b) => a.createdAt.localeCompare(b.createdAt)));
        setTasks(savedTasks.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
        setSnapshot(savedSnapshots.find(item => item.id === "active") ?? null);
        setRuns(savedRuns.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
        if (navigator.onLine && nextOrganizationId) void refreshSnapshot(nextOrganizationId);
      }).catch(() => {
        if (!disposed && currentOrganizationId === nextOrganizationId) {
          setSyncMessage("Local storage is unavailable in this browser.");
        }
      });
    };

    const readActiveWorkspace = () => {
      let nextOrganizationId = "";
      try { nextOrganizationId = localStorage.getItem("kanako-ai-active-org") ?? ""; } catch {
        // Keep the device-local workspace available if browser storage is blocked.
      }
      loadWorkspace(nextOrganizationId);
    };
    const updateConnectivity = () => setOnline(navigator.onLine);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "kanako-ai-active-org" || event.key === null) readActiveWorkspace();
    };

    updateConnectivity();
    readActiveWorkspace();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", readActiveWorkspace);

    return () => {
      disposed = true;
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", readActiveWorkspace);
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
    const userMessage: LocalMessage = { id: crypto.randomUUID(), organizationId: organizationId || "device-local", role: "user", content: text, createdAt: new Date().toISOString() };
    const assistantMessage: LocalMessage = { id: crypto.randomUUID(), organizationId: organizationId || "device-local", role: "assistant", content: "", createdAt: new Date().toISOString() };
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
        "This is a software-planning task for the EXISTING KANAKO AI application. Do not design a replacement app or pretend the Task Center is empty. Verified architecture facts: Next.js application; Task Center is rendered in app/page.tsx; task mutations are server actions in app/actions.ts; Supabase stores records in tasks, task_updates, and activity_logs. Existing task fields include organization_id, title, description, status, priority, due_at, department_id, and assigned_agent_id. Existing task statuses are queued, in_progress, blocked, in_review, completed, and cancelled. These are verified existing facts, not suggestions.",
        "For the task register, explain how to EXTEND and validate the existing Task Center rather than rebuilding it. Do not invent migrations, columns, APIs, files, employees, or completed work. If you propose a new field or table, label it clearly as a proposal and explain why existing fields cannot meet the requirement.",
        "Use the approved department roster supplied above. Never substitute generic department names. Do not claim all nine departments are fully configured unless the supplied roster confirms it.",
        "You can only produce text in this local workspace. You cannot edit source code, databases, files, websites, or external systems. Clearly state that this specification is NOT IMPLEMENTED.",
        "Output exactly these six Markdown headings, each on its own line, in this exact order, with no other headings: ## Task summary; ## Proposed work product; ## Implementation details; ## Acceptance checklist; ## Risks and missing information; ## Owner review required.",
        "In Proposed work product, describe the existing Task Center improvements the owner requested. In Implementation details, explicitly reference app/page.tsx and app/actions.ts, and map each change to the verified task fields and existing tables. Explain status transition and organization-scoping validation. Do not claim code changes have already happened.",
        "In Acceptance checklist, provide at least four observable pass/fail tests: create a task in each department; assign or leave unassigned; edit priority and due date; verify all six statuses; verify task update history and activity log are scoped to the same organization. In Risks and missing information, mention only real unknowns or edge cases, not generic security slogans. Under Owner review required, list only decisions that genuinely require the owner.",
        "Keep the entire answer between 200 and 420 words. Avoid repeating the task description. No generic security, encryption, backup, integration, deployment, or maintenance sections unless directly required.",
        "Do not send messages, spend money, access accounts, or make irreversible changes. Prepare recommendations for human review.",
      ].join("\n\n");
      if (/centralized\s+task\s+register/i.test(task.title)) {
        setRunStatus("Kanako is preparing a verified specification from the existing Task Center architecture…");
        const output = buildTaskRegisterSpecification(task.title);
        const quality = reviewLocalOutput(output, task.title, (snapshot?.departments ?? []).map(item => item.name));
        const localRun: LocalRun = {
          id: crypto.randomUUID(),
          organizationId,
          agentId: agent.id,
          taskId: task.id,
          output,
          model: "verified-local-template",
          createdAt: new Date().toISOString(),
          quality,
        };
        await saveRecord("runs", localRun);
        setRuns(current => [localRun, ...current]);
        setRunOutput(output);
        setRunStatus("Offline run completed successfully. " + agent.name + " prepared a verified architecture-based specification for “" + task.title + "”. Human review is still required.");
        setSyncMessage("Local specification saved on this device. It is not implemented and has not been synced.");
        return;
      }
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
        organizationId,
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
      organizationId: organizationId || "device-local",
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

  const availableTasks = (snapshot?.organizationId === organizationId ? snapshot.tasks : []).filter(task => (!task.assigned_agent_id || task.assigned_agent_id === selectedAgentId) && !runs.some(run => run.taskId === task.id && !run.syncedAt));
  const availableAgents = snapshot?.organizationId === organizationId ? snapshot.agents : [];

  return <div className="offline-workspace">
    <div className="panel">
      <div className="row-between"><div><div className="eyebrow">DEVICE-LOCAL AI</div><h2 style={{margin:"8px 0"}}>Local intelligence</h2><p className="muted" style={{fontSize:11,margin:0}}>{snapshot?.organizationId === organizationId ? "Active workspace: " + snapshot.organizationName : organizationId ? "Active workspace selected · snapshot not prepared" : "No active online workspace selected"}</p></div><span className="pill">{online ? "Online" : "Offline"}</span></div>
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
            {!availableTasks.length&&<option value="">{runs.some(run => !run.syncedAt && run.agentId === selectedAgentId) ? "No eligible tasks · local result waiting for review/sync" : "No cached queued tasks"}</option>}
            {availableTasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
          <button className="btn" onClick={runOfflineAgent} disabled={!modelReady || !selectedAgentId || !selectedTaskId || !availableTasks.some(task=>task.id===selectedTaskId) || busy}>{busy?"Running offline…":"Run selected employee offline"}</button>
          {runStatus && <div role={runStatus.startsWith("Offline run failed:") ? "alert" : "status"} aria-live="polite" className="notice" style={{marginTop:10}}>{runStatus}</div>}
        </div>
        {runOutput&&<details className="run-output" open><summary>Current local result</summary><pre>{runOutput}</pre></details>}
        <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{runs.filter(run=>!run.syncedAt).length} results waiting · {runs.filter(run=>run.syncedAt).length} synced</span><button className="btn secondary" onClick={syncOfflineRuns} disabled={!online || !organizationId || !runs.some(run=>!run.syncedAt)}>Sync results</button></div>
        <div className="offline-task-list">{runs.map(run=><div className="offline-task" key={run.id}><div className="row-between"><strong>{availableAgents.find(agent=>agent.id===run.agentId)?.name ?? "AI employee"}</strong><span className="pill">{run.syncedAt?"Sent for review":"Local only"}</span><span className="pill">{run.quality?.status === "ready_for_review" ? "Structure checks passed · review required" : run.quality ? "Needs revision" : "Not reviewed"}</span></div>{run.quality?.issues.length ? <ul className="muted" style={{fontSize:11,margin:"6px 0",paddingLeft:18}}>{run.quality.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul> : null}<p className="muted" style={{fontSize:11,margin:"5px 0"}}>{snapshot?.tasks.find(task=>task.id===run.taskId)?.title ?? "Task"} · {new Date(run.createdAt).toLocaleString()}</p><details><summary>View local output</summary><pre className="document-content">{run.output}</pre></details></div>)}{!runs.length&&<div className="empty">No offline employee runs yet.</div>}</div>
        <button className="btn secondary" style={{marginTop:10}} onClick={()=>void refreshSnapshot(organizationId)} disabled={!online || !organizationId || refreshingSnapshot || busy}>{refreshingSnapshot ? "Refreshing snapshot…" : snapshot ? "Refresh offline snapshot" : "Prepare offline snapshot"}</button>
        {!online ? <p className="muted" role="status" style={{fontSize:12,marginBottom:0}}>Connect to the internet to refresh the cloud snapshot.</p> : !organizationId ? <p className="muted" role="status" style={{fontSize:12,marginBottom:0}}>Workspace not detected yet. Open the signed-in KANAKO workspace once, then return here.</p> : syncMessage ? <p className="muted" role="status" aria-live="polite" style={{fontSize:12,marginBottom:0}}>{syncMessage}</p> : null}
      </div>
    </div>

    <div className="panel">
      <div className="eyebrow">LOCAL TASK DRAFTS</div><h3>Capture work offline</h3>
      <form onSubmit={addOfflineTask} className="form-stack"><input className="field" value={taskTitle} onChange={event=>setTaskTitle(event.target.value)} placeholder="Task title" maxLength={180} required/><textarea className="field" value={taskDescription} onChange={event=>setTaskDescription(event.target.value)} rows={3} placeholder="Task details"/><button className="btn">Save on this device</button></form>
      <div className="row-between" style={{marginTop:18}}><span className="muted" style={{fontSize:12}}>{tasks.filter(task=>!task.syncedAt).length} pending · {tasks.filter(task=>task.syncedAt).length} synced</span><button className="btn secondary" onClick={syncTasks} disabled={!online || !organizationId || !tasks.some(task=>!task.syncedAt)}>Sync tasks</button></div>
      <div className="offline-task-list">{tasks.map(task=><div className="offline-task" key={task.id}><div className="row-between"><strong>{task.title}</strong><span className="pill">{task.syncedAt?"Synced":"Local only"}</span></div>{task.description&&<p className="muted" style={{fontSize:12,margin:"6px 0 0"}}>{task.description}</p>}</div>)}{!tasks.length&&<div className="empty">No offline tasks saved yet.</div>}</div>
    </div>
    <div className="notice">Hybrid mode keeps the local model, chats, task drafts, employee snapshots, and offline results in this browser. Connect online and sign in to refresh the employee snapshot or sync drafts and results to your cloud workspace. Online research, live integrations, and approvals require an internet connection. Device-local data does not automatically sync; use the Sync controls while online. Browser storage may be cleared or evicted, so keep important work synchronized.</div>
  </div>;
}
