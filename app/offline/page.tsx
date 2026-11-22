import { OfflineAIWorkspace } from "@/components/offline-ai-workspace";

export const dynamic = "force-static";
export const metadata = {
  title: "KANAKO AI — Offline Workspace",
  description: "Device-local AI chat and offline task capture.",
};

export default function OfflinePage() {
  return <main className="offline-page">
    <header className="offline-header">
      <div className="brand"><div className="brand-mark">K</div><span>KANAKO AI</span></div>
      <span className="pill">Offline-ready workspace</span>
    </header>
    <div className="offline-intro">
      <div className="eyebrow">LOCAL MODE</div>
      <h1>Work continues, even offline.</h1>
      <p className="muted">Use a model stored on this device, keep private drafts locally, and sync task drafts when your connection returns.</p>
    </div>
    <OfflineAIWorkspace />
    <footer className="muted" style={{fontSize:11,marginTop:24}}>KANAKO AI · Local device workspace · Cloud sync is optional and requires connectivity</footer>
  </main>;
}
