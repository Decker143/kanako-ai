"use client";

import { useState } from "react";

export function AgentRunControl({ agentId, tasks }: { agentId: string; tasks: { id: string; title: string; status: string }[] }) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function run() {
    if (!taskId || busy) return;
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/agents/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, taskId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Agent run failed.");
      setResult(data.output || "Task run completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run this AI employee.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="agent-run-control">
    <select className="field compact" value={taskId} onChange={e => setTaskId(e.target.value)} disabled={!tasks.length || busy}>
      {!tasks.length && <option value="">No open tasks</option>}
      {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
    </select>
    <button className="btn" onClick={run} disabled={!taskId || busy}>{busy ? "Running…" : "Run task"}</button>
    {error && <p className="error full">{error}</p>}
    {result && <details className="run-output full"><summary>View agent output</summary><pre>{result}</pre></details>}
  </div>;
}
