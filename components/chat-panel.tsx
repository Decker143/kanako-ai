"use client";

import { useState, type FormEvent } from "react";

type ChatMessage = { id: string; role: string; content: string; created_at: string };

export function ChatPanel({ conversationId, initialMessages }: { conversationId: string; initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    setContent("");
    const temporaryId = crypto.randomUUID();
    setMessages(current => [...current, { id: temporaryId, role: "user", content: text, created_at: new Date().toISOString() }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The AI service is not available.");
      setMessages(current => [...current, result.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="message-list">
      {messages.map(message => <div className={`message ${message.role === "user" ? "user-message" : ""}`} key={message.id}>
        <div className="eyebrow">{message.role === "assistant" ? "KANAKO AI" : message.role}</div>
        <p>{message.content}</p>
      </div>)}
      {!messages.length && <div className="empty">Send a message to start your conversation.</div>}
      {busy && <div className="message"><div className="eyebrow">KANAKO AI</div><p>Thinking…</p></div>}
    </div>
    {error && <p className="error">{error}</p>}
    <form onSubmit={submit} className="form-stack">
      <textarea className="field" rows={3} required value={content} onChange={event => setContent(event.target.value)} placeholder="Ask Kanako AI about your operations, plans, or next steps…" />
      <div className="row-between"><span className="muted" style={{fontSize:11}}>Messages are stored in your organization workspace.</span><button className="btn" disabled={busy || !content.trim()}>{busy ? "Sending…" : "Send message"}</button></div>
    </form>
  </>;
}
