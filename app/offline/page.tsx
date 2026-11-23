import { OfflineAIWorkspace } from "@/components/offline-ai-workspace";

export const dynamic = "force-static";
export const metadata = {
  title: "KANAKO AI — Local Workspace",
  description: "No-login, device-local AI workspace.",
};

export default function OfflinePage() {
  return <main className="offline-page">
    <header className="offline-header">
      <div className="brand"><div className="brand-mark">K</div><span>KANAKO AI</span></div>
      <span className="pill">Local-only mode</span>
    </header>
    <div className="offline-intro">
      <div className="eyebrow">LOCAL MODE</div>
      <h1>Your private local AI workspace.</h1>
      <p className="muted">No account, login, email confirmation, or cloud synchronization. Your local chats and drafts stay in this browser on this device.</p>
    </div>
    <OfflineAIWorkspace />
    <footer className="muted" style={{fontSize:11,marginTop:24}}>KANAKO AI · Local-only device workspace</footer>
  </main>;
}
