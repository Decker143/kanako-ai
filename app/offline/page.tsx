import Link from "next/link";
import { OfflineAIWorkspace } from "@/components/offline-ai-workspace";

export const dynamic = "force-static";
export const metadata = {
  title: "KANAKO AI — Offline Workspace",
  description: "Device-local AI workspace with a separate secure online owner workspace.",
};

export default function OfflinePage() {
  return <main className="offline-page">
    <header className="offline-header">
      <div className="brand"><div className="brand-mark">K</div><span>KANAKO AI</span></div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span className="pill">Offline mode</span><Link className="btn secondary" href="/">Connect online</Link></div>
    </header>
    <div className="offline-intro">
      <div className="eyebrow">LOCAL MODE</div>
      <h1>Your private local AI workspace.</h1>
      <p className="muted">Use this workspace when you are offline. For cloud departments, company records, and online AI services, connect to your secure owner workspace. Local chats and drafts currently remain in this browser and are not yet synchronized with cloud data.</p>
    </div>
    <OfflineAIWorkspace />
    <footer className="muted" style={{fontSize:11,marginTop:24}}>KANAKO AI · Hybrid workspace · Offline mode</footer>
  </main>;
}
