"use client";

import { useEffect, useState } from "react";

type FlashNoticeProps = {
  success?: string;
  error?: string;
};

export function FlashNotice({ success, error }: FlashNoticeProps) {
  const kind = error ? "error" : success ? "success" : "";
  const message = error || success || "";
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    // Reset visibility when the incoming flash message changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(Boolean(message));
    if (!message) return;
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [message, kind]);

  if (!visible || !message) return null;

  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 10000,
        width: "min(440px, calc(100vw - 36px))",
        padding: "14px 16px",
        borderRadius: 12,
        border: isError ? "1px solid #dc6262" : "1px solid #23845b",
        background: isError ? "#351f24" : "#17372c",
        color: "#fff",
        boxShadow: "0 12px 36px rgba(0,0,0,.24)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 800 }}>{isError ? "!" : "✓"}</span>
      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss notification"
        style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </div>
  );
}
