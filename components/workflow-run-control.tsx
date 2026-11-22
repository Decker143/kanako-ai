"use client";

import { useState } from "react";

export function WorkflowRunControl({ workflowId, enabled }: { workflowId: string; enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run() {
    if (busy || !enabled) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/workflows/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Workflow run failed.");
      setMessage("Completed " + (data.steps?.length ?? 0) + " step(s). Refresh to view the run log.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run workflow.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="agent-run-control">
    <button className="btn" onClick={run} disabled={!enabled || busy}>{busy ? "Running…" : "Run manually"}</button>
    {!enabled && <span className="muted" style={{fontSize:11}}>Activate a valid manual workflow to run.</span>}
    {error && <p className="error full">{error}</p>}
    {message && <p className="muted full" style={{fontSize:12}}>{message}</p>}
  </div>;
}
