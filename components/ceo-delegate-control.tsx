"use client";

import { useState } from "react";

export function CEODelegateControl({ taskId, disabled }: { taskId: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function delegate() {
    if (busy || disabled) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/ceo/delegate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "CEO delegation failed.");
      setMessage("Assigned to " + data.employeeName + ". Task not executed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delegate task.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="agent-run-control">
    <button className="btn secondary" onClick={delegate} disabled={disabled || busy}>
      {busy ? "Kanako is assigning…" : "Delegate to AI employee"}
    </button>
    {disabled && <span className="muted" style={{fontSize:11}}>AI execution approval is required.</span>}
    {error && <p className="error full">{error}</p>}
    {message && <p className="muted full" style={{fontSize:12}}>{message}</p>}
  </div>;
}
