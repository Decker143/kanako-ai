import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";
import {
  createAgent, createApproval, createConversation, createKnowledgeDocument,
  createReport, createTask, createWorkflow, decideApproval,
  signOut, updateAgentStatus, updateTaskStatus, updateWorkflowStatus,
} from "@/app/actions";
import { ChatPanel } from "@/components/chat-panel";
import { AgentRunControl } from "@/components/agent-run-control";

const nav = [
  ["overview","Overview","◫"],["agents","AI Workforce","✧"],["departments","Departments","▦"],
  ["tasks","Task Center","✓"],["chat","AI Chat","◉"],["workflows","Workflows","⌘"],
  ["approvals","Approvals","◇"],["knowledge","Knowledge Base","▤"],
  ["reports","Reports","▥"],["activity","Activity Logs","↗"],
] as const;

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export default async function Home({ searchParams }: { searchParams: Promise<{error?:string;message?:string;view?:string;conversation?:string}> }) {
  const params = await searchParams;
  const view = nav.some(item => item[0] === params.view) ? (params.view ?? "overview") : "overview";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <AuthForm error={params.error} message={params.message} />;

  const { data: memberships } = await supabase.from("organization_members").select("organization_id,role").eq("user_id", user.id);
  const orgIds = (memberships ?? []).map(m => m.organization_id);
  const { data: organizations } = orgIds.length
    ? await supabase.from("organizations").select("id,name").in("id", orgIds).order("created_at")
    : { data: [] as {id:string;name:string}[] };
  const activeOrg = organizations?.[0];
  const orgId = activeOrg?.id;
  const role = memberships?.find(m => m.organization_id === orgId)?.role ?? "member";
  const aiExecutionEnabled = process.env.KANAKO_AI_EXECUTION_ENABLED === "true";

  if (!activeOrg) {
    return <div className="auth-wrap"><div className="panel auth-card"><div className="eyebrow">First-time setup</div><h1>Create your organization</h1><p className="muted">Your organization is the secure workspace for departments, tasks, AI agents and company knowledge.</p><form action={async (formData: FormData) => { "use server"; const client = await createClient(); const name = String(formData.get("name") ?? "").trim(); if (!name) return; const { error } = await client.rpc("create_organization", { org_name: name }); if (error) redirect("/?error=" + encodeURIComponent(error.message)); revalidatePath("/"); redirect("/"); }} className="form-stack"><input className="field" name="name" required maxLength={120} placeholder="e.g. Kanako Global"/><button className="btn">Create organization</button></form></div></div>;
  }

  const [{data:departments},{data:tasks},{data:agents},{data:approvals},{data:workflows},{data:documents},{data:reports},{data:activity},{data:conversations},{data:agentRuns}] = await Promise.all([
    supabase.from("departments").select("id,name,description,color").eq("organization_id",orgId).order("name"),
    supabase.from("tasks").select("id,title,description,status,priority,created_at,due_at,department_id,assigned_agent_id").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100),
    supabase.from("ai_agents").select("id,name,job_title,description,instructions,status,model_provider,model_name,department_id,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}),
    supabase.from("approvals").select("id,title,description,request_type,status,requested_by,decision_note,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100),
    supabase.from("automation_workflows").select("id,name,description,trigger_config,steps,status,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}),
    supabase.from("knowledge_documents").select("id,title,content,source_type,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}),
    supabase.from("reports").select("id,title,report_type,content,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}),
    supabase.from("activity_logs").select("id,action,entity_type,created_at,details").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(50),
    supabase.from("conversations").select("id,title,created_at").eq("organization_id",orgId).order("updated_at",{ascending:false}),
    supabase.from("agent_runs").select("id,agent_id,task_id,status,error,created_at,output").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(50),
  ]);

  const openTasks = (tasks ?? []).filter(t => !["completed","cancelled"].includes(t.status)).length;
  const pendingApprovals = (approvals ?? []).filter(a => a.status === "pending").length;
  const activeConversation = (conversations ?? []).find(c => c.id === params.conversation) ?? conversations?.[0];
  const {data:messages} = activeConversation
    ? await supabase.from("messages").select("id,role,content,created_at").eq("conversation_id",activeConversation.id).eq("organization_id",orgId).order("created_at")
    : {data:[] as {id:string;role:string;content:string;created_at:string}[]};

  const heading: Record<string,string> = {
    overview:"Command Center",agents:"AI Workforce",departments:"Departments",tasks:"Task Center",
    chat:"AI Chat",workflows:"Workflow Automation",approvals:"Approval Center",
    knowledge:"Knowledge Base",reports:"Reports & Analytics",activity:"Activity Logs",
  };

  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><div className="brand-mark">K</div><span>KANAKO AI</span></Link>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([key,label,icon])=><Link key={key} className={`nav-link ${view===key?"active":""}`} href={key==="overview"?"/":`/?view=${key}`}><span>{icon}</span>{label}{key==="approvals"&&pendingApprovals>0?<span className="nav-count">{pendingApprovals}</span>:null}</Link>)}
      <div className="nav-label">SYSTEM</div><a className="nav-link" href="#system-status">⚙ System status</a>
      <div className="sidebar-user"><div className="muted" style={{fontSize:10,marginBottom:7}}>SIGNED IN</div><div style={{fontSize:12,overflowWrap:"anywhere"}}>{user.email}</div><span className="pill" style={{marginTop:8}}>{role}</span><form action={signOut}><button className="btn secondary" style={{marginTop:12,width:"100%"}}>Sign out</button></form></div>
    </aside>
    <main className="main">
      <div className="topline"><div><div className="eyebrow">KANAKO AI / {heading[view]}</div><h1>{activeOrg.name}</h1><p className="muted" style={{margin:0}}>Your company operations, coordinated in one intelligent workspace.</p></div><span className="pill">● Supabase connected</span></div>
      {params.error&&<div className="panel error" style={{marginBottom:18}}>{params.error}</div>}
      {view==="overview"&&<>
        <div className="grid">
          <div className="panel stat"><div className="muted">Departments</div><strong>{departments?.length??0}</strong><span className="muted">Configured teams</span></div>
          <div className="panel stat"><div className="muted">AI Employees</div><strong>{agents?.length??0}</strong><span className="muted">Definitions saved</span></div>
          <div className="panel stat"><div className="muted">Open Tasks</div><strong>{openTasks}</strong><span className="muted">Live database records</span></div>
          <div className="panel stat"><div className="muted">Pending Approvals</div><strong>{pendingApprovals}</strong><span className="muted">Awaiting human review</span></div>
        </div>
        <div className="section-head"><h2>Department overview</h2><Link className="subtle-link" href="/?view=departments">View all →</Link></div>
        <div className="grid">{(departments??[]).map(d=><div className="panel" key={d.id}><div style={{fontWeight:700}}>{d.name}</div><p className="muted" style={{fontSize:12,marginBottom:0}}>{d.description||"Department workspace"}</p></div>)}</div>
        <div className="section-head"><h2>Recent tasks</h2><Link className="subtle-link" href="/?view=tasks">Open task center →</Link></div>
        <div className="panel table-wrap"><table className="table"><thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{(tasks??[]).slice(0,6).map(t=><tr key={t.id}><td>{t.title}</td><td><span className="pill">{t.priority}</span></td><td><span className="pill">{t.status.replaceAll("_"," ")}</span></td><td>{dateLabel(t.created_at)}</td></tr>)}</tbody></table>{!tasks?.length&&<div className="empty">No tasks yet. Add one in the Task Center.</div>}</div>
      </>}
      {view==="departments"&&<>
        <div className="section-head"><h2>Company departments</h2><span className="pill">{departments?.length??0} departments</span></div>
        <div className="grid">{(departments??[]).map(d=><div className="panel" key={d.id}><div className="eyebrow">DEPARTMENT</div><h2 style={{fontSize:18}}>{d.name}</h2><p className="muted" style={{fontSize:13}}>{d.description||"No description added."}</p><div className="muted" style={{fontSize:12}}>{(agents??[]).filter(a=>a.department_id===d.id).length} AI employee profiles · {(tasks??[]).filter(t=>t.department_id===d.id).length} tasks</div></div>)}</div>
        <div className="panel" style={{marginTop:18}}><h3>Department structure</h3><p className="muted" style={{fontSize:13}}>Departments are created with the organization. AI employee profiles and tasks can be assigned to these departments.</p></div>
      </>}
      {view==="tasks"&&<>
        <div className="section-head"><h2>Task queue</h2><span className="pill">{openTasks} open</span></div>
        <div className="panel"><form action={createTask} className="form-grid task-grid"><input className="field" name="title" required placeholder="Task title"/><input className="field" name="description" placeholder="Description (optional)"/><select className="field" name="priority" defaultValue="medium"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option><option value="urgent">Urgent</option></select><select className="field" name="department_id" defaultValue=""><option value="">No department</option>{(departments??[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select className="field" name="assigned_agent_id" defaultValue=""><option value="">Unassigned</option>{(agents??[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="btn">Create task</button></form></div>
        <div className="panel table-wrap" style={{marginTop:16}}><table className="table"><thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Update</th></tr></thead><tbody>{(tasks??[]).map(t=><tr key={t.id}><td><strong>{t.title}</strong>{t.description&&<div className="muted" style={{fontSize:11,marginTop:4}}>{t.description}</div>}</td><td><span className="pill">{t.priority}</span></td><td><span className="pill">{t.status.replaceAll("_"," ")}</span></td><td><form action={updateTaskStatus} className="inline-form"><input type="hidden" name="task_id" value={t.id}/><select className="field compact" name="status" defaultValue={t.status}><option value="queued">Queued</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="in_review">In review</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><button className="btn secondary">Save</button></form></td></tr>)}</tbody></table>{!tasks?.length&&<div className="empty">Your task queue is clear. Create the first task above.</div>}</div>
      </>}
      {view==="agents"&&<>
        <div className="section-head"><h2>AI employee profiles</h2><span className="pill">{agents?.length??0} profiles</span></div>
        <div className="panel"><div className="eyebrow">CREATE AN AI EMPLOYEE</div><p className="muted" style={{fontSize:12}}>New profiles are saved as drafts. They cannot execute tasks until an approved model runtime and permissions are configured.</p><form action={createAgent} className="form-grid two"><input className="field" name="name" required placeholder="Employee name"/><input className="field" name="job_title" required placeholder="Job title / role"/><select className="field" name="department_id" defaultValue=""><option value="">Unassigned department</option>{(departments??[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><input className="field" name="description" placeholder="Short role description"/><textarea className="field full" name="instructions" rows={3} placeholder="Role instructions and operating boundaries"/><input className="field full" name="model_name" placeholder="AI Gateway model ID (e.g. openai/gpt-6-astra)"/><button className="btn">Save as draft</button></form></div>
        <div className="grid" style={{marginTop:16}}>{(agents??[]).map(a=><div className="panel" key={a.id}><div className="row-between"><span className="pill">{a.status}</span><span className="muted" style={{fontSize:11}}>{a.model_provider&&a.model_name?a.model_provider+"/"+a.model_name:"No model connected"}</span></div><h3>{a.name}</h3><div className="eyebrow">{a.job_title}</div><p className="muted" style={{fontSize:12}}>{a.description||"No description."}</p><p className="muted" style={{fontSize:11}}>{departments?.find(d=>d.id===a.department_id)?.name??"Unassigned"}</p><form action={updateAgentStatus} className="inline-form"><input type="hidden" name="agent_id" value={a.id}/><select className="field compact" name="status" defaultValue={a.status}><option value="draft">Draft</option><option value="paused">Paused</option><option value="active" disabled={!aiExecutionEnabled || !a.model_name}>Active</option></select><button className="btn secondary">Update</button></form>{a.status==="active"?<AgentRunControl agentId={a.id} tasks={(tasks??[]).filter(t=>!["completed","cancelled"].includes(t.status)).map(t=>({id:t.id,title:t.title,status:t.status}))}/>:<p className="muted" style={{fontSize:11,marginTop:10}}>Not executable until activated with approved AI access.</p>}<div className="muted" style={{fontSize:11,marginTop:12}}>Recent runs: {(agentRuns??[]).filter(r=>r.agent_id===a.id).length}</div></div>)}</div>{!agents?.length&&<div className="panel empty" style={{marginTop:16}}>No AI employee profiles yet.</div>}
        <div className="notice" style={{marginTop:16}}>{aiExecutionEnabled?"AI execution is enabled for this workspace. Only activated employees with a configured model can run assigned tasks.":"Execution is intentionally disabled until model usage is explicitly approved. Draft profiles are not represented as working AI employees."}</div><div className="section-head"><h2>Recent agent runs</h2><span className="pill">{agentRuns?.length??0} runs</span></div><div className="panel table-wrap"><table className="table"><thead><tr><th>AI Employee</th><th>Task</th><th>Status</th><th>Started</th></tr></thead><tbody>{(agentRuns??[]).slice(0,12).map(run=><tr key={run.id}><td>{agents?.find(a=>a.id===run.agent_id)?.name??"Employee"}</td><td>{tasks?.find(t=>t.id===run.task_id)?.title??"Task"}</td><td><span className="pill">{run.status}</span></td><td>{dateLabel(run.created_at)}</td></tr>)}</tbody></table>{!agentRuns?.length&&<div className="empty">No agent runs recorded.</div>}</div>
      </>}
      {view==="workflows"&&<>
        <div className="section-head"><h2>Automation workflows</h2><span className="pill">{workflows?.length??0} workflows</span></div>
        <div className="panel"><div className="eyebrow">WORKFLOW BUILDER</div><p className="muted" style={{fontSize:12}}>Create a draft workflow and list its planned steps. No external action runs automatically.</p><form action={createWorkflow} className="form-grid two"><input className="field" name="name" required placeholder="Workflow name"/><select className="field" name="trigger" defaultValue="manual"><option value="manual">Manual trigger</option><option value="task_created">When task is created (draft)</option><option value="approval_decided">When approval is decided (draft)</option><option value="schedule">Scheduled (draft)</option></select><input className="field full" name="description" placeholder="What should this workflow accomplish?"/><textarea className="field full" name="steps" rows={4} placeholder={"Step 1: Describe the first action\nStep 2: Describe the next action"}/><button className="btn">Save workflow draft</button></form></div>
        <div className="grid" style={{marginTop:16}}>{(workflows??[]).map(w=><div className="panel" key={w.id}><div className="row-between"><span className="pill">{w.status}</span><span className="muted" style={{fontSize:11}}>{(Array.isArray(w.steps)?w.steps.length:0)} steps</span></div><h3>{w.name}</h3><p className="muted" style={{fontSize:12}}>{w.description||"No description."}</p><div className="muted" style={{fontSize:11}}>Trigger: {(w.trigger_config as {type?:string})?.type??"manual"}</div><ol className="step-list">{(Array.isArray(w.steps)?w.steps:[]).map((s: {id?:string;label?:string},i:number)=><li key={s.id??i}>{s.label}</li>)}</ol><form action={updateWorkflowStatus} className="inline-form"><input type="hidden" name="workflow_id" value={w.id}/><select className="field compact" name="status" defaultValue={w.status==="paused"?"paused":"draft"}><option value="draft">Draft</option><option value="paused">Paused</option></select><button className="btn secondary">Update</button></form></div>)}</div>
        <div className="notice" style={{marginTop:16}}>Workflow execution engine is not activated. All workflows remain drafts or paused until triggers, integrations, retries, and approval gates are implemented and tested.</div>
      </>}
      {view==="approvals"&&<>
        <div className="section-head"><h2>Human approval queue</h2><span className="pill">{pendingApprovals} pending</span></div>
        <div className="panel"><h3>Request an approval</h3><form action={createApproval} className="form-grid two"><input className="field" name="title" required placeholder="What needs approval?"/><select className="field" name="request_type"><option value="general">General</option><option value="spend">Spending / purchase</option><option value="external_message">External message</option><option value="data_change">Data change</option><option value="automation">Automation activation</option></select><textarea className="field full" name="description" rows={2} placeholder="Context and expected impact"/><button className="btn">Submit for approval</button></form></div>
        <div className="stack" style={{marginTop:16}}>{(approvals??[]).map(a=><div className="panel" key={a.id}><div className="row-between"><span className="pill">{a.status}</span><span className="muted" style={{fontSize:11}}>{a.request_type} · {dateLabel(a.created_at)}</span></div><h3>{a.title}</h3><p className="muted" style={{fontSize:13}}>{a.description||"No additional details."}</p>{a.decision_note&&<p className="muted" style={{fontSize:12}}>Decision note: {a.decision_note}</p>}{a.status==="pending"&&["owner","admin"].includes(role)&&<form action={decideApproval} className="form-grid"><input type="hidden" name="approval_id" value={a.id}/><input className="field" name="decision_note" placeholder="Decision note (optional)"/><button className="btn">Approve</button><button className="btn danger" name="status" value="rejected">Reject</button><input type="hidden" name="status" value="approved"/></form>}</div>)}</div>{!approvals?.length&&<div className="empty">No approval requests yet.</div>}
      </>}
      {view==="knowledge"&&<>
        <div className="section-head"><h2>Organization knowledge</h2><span className="pill">{documents?.length??0} documents</span></div>
        <div className="panel"><div className="eyebrow">ADD KNOWLEDGE</div><form action={createKnowledgeDocument} className="form-stack"><input className="field" name="title" required placeholder="Document title"/><textarea className="field" name="content" rows={7} required placeholder="Paste SOPs, company policies, product details, FAQs, or operating instructions..."/><button className="btn">Save knowledge document</button></form></div>
        <div className="stack" style={{marginTop:16}}>{(documents??[]).map(d=><details className="panel" key={d.id}><summary style={{cursor:"pointer",fontWeight:700}}>{d.title}<span className="muted" style={{fontSize:11,marginLeft:10}}>{d.source_type} · {dateLabel(d.created_at)}</span></summary><pre className="document-content">{d.content}</pre></details>)}</div>{!documents?.length&&<div className="empty">No knowledge documents added yet.</div>}
      </>}
      {view==="chat"&&<>
        <div className="section-head"><h2>AI Office Chat</h2><span className="pill">AI runtime not activated</span></div>
        <div className="chat-layout"><div className="panel chat-list"><form action={createConversation}><input className="field" name="title" placeholder="Conversation title"/><button className="btn" style={{width:"100%",marginTop:8}}>New conversation</button></form><div className="nav-label">CONVERSATIONS</div>{(conversations??[]).map(c=><Link key={c.id} className={`conversation-link ${activeConversation?.id===c.id?"active":""}`} href={`/?view=chat&conversation=${c.id}`}>{c.title||"Untitled conversation"}</Link>)}</div>
          <div className="panel chat-main">{activeConversation?<><h3>{activeConversation.title||"Conversation"}</h3><ChatPanel conversationId={activeConversation.id} initialMessages={messages??[]}/></>:<div className="empty">Create a conversation to get started.</div>}</div></div>
        <div className="notice" style={{marginTop:16}}>Messages are saved to your private organization workspace. AI-generated replies and tool execution are not enabled yet; we will activate them only after model access and usage costs are explicitly approved.</div>
      </>}
      {view==="reports"&&<>
        <div className="section-head"><h2>Reports library</h2><span className="pill">{reports?.length??0} reports</span></div>
        <div className="panel"><div className="eyebrow">CREATE A REPORT ENTRY</div><form action={createReport} className="form-grid two"><input className="field" name="title" required placeholder="Report title"/><select className="field" name="report_type"><option value="operations">Operations</option><option value="department">Department</option><option value="performance">Performance</option><option value="finance">Finance</option><option value="custom">Custom</option></select><textarea className="field full" name="summary" rows={4} required placeholder="Report summary and findings..."/><button className="btn">Save report</button></form></div>
        <div className="stack" style={{marginTop:16}}>{(reports??[]).map(r=><div className="panel" key={r.id}><div className="row-between"><span className="pill">{r.report_type}</span><span className="muted" style={{fontSize:11}}>{dateLabel(r.created_at)}</span></div><h3>{r.title}</h3><p className="muted" style={{fontSize:13}}>{(r.content as {summary?:string})?.summary??"No summary."}</p></div>)}</div>{!reports?.length&&<div className="empty">No reports saved yet.</div>}
      </>}
      {view==="activity"&&<>
        <div className="section-head"><h2>Workspace activity</h2><span className="pill">Latest {activity?.length??0}</span></div>
        <div className="panel table-wrap"><table className="table"><thead><tr><th>Action</th><th>Entity</th><th>Time</th></tr></thead><tbody>{(activity??[]).map(a=><tr key={a.id}><td>{a.action}</td><td>{a.entity_type??"—"}</td><td>{dateLabel(a.created_at)}</td></tr>)}</tbody></table>{!activity?.length&&<div className="empty">No activity recorded yet.</div>}</div>
      </>}
      <div className="footer-status" id="system-status"><span>Workspace database: connected</span><span>Authentication: active</span><span>AI execution: gated</span></div>
      <p className="muted" style={{fontSize:11,marginTop:18}}>KANAKO AI · Secure organization workspace · Build foundation</p>
    </main>
  </div>;
}
