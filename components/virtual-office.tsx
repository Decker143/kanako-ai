"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OfficeMeetingsPanel } from "@/components/office-meetings-panel";

const Office3DScene = dynamic(() => import("./office-3d-scene").then((module) => module.Office3DScene), {
  ssr: false,
  loading: () => <div className="office-3d-loading">Preparing the 3D virtual office…</div>,
});

type Agent = { id:string; name:string; jobTitle:string; description:string; status:string; availability:string; departmentId:string|null; skills:string[] };
type Department = { id:string; name:string; color:string };
type Task = { id:string; title:string; status:string; priority:string; agentId:string|null; departmentId:string|null; updatedAt:string };
type Run = { id:string; agentId:string; taskId:string|null; status:string; createdAt:string; startedAt:string|null; finishedAt:string|null };
type OfficeCommand = { id:string; agentId:string; command:string; destination:string; status:string; createdAt:string };
type Meeting = { id:string; title:string; agenda:string; status:string; scheduledFor:string|null; notes:string; decisions:string; actionItems:{text:string;completed?:boolean}[]; createdAt:string; attendees:{agentId:string;attendanceStatus:string}[] };

function initials(name:string) { return name.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase(); }
function label(value:string) { return value.replaceAll("_"," ").replace(/\b\w/g, c=>c.toUpperCase()); }

export function VirtualOffice({ organizationName, organizationId, agents, departments, tasks, taskContextStatus, runs, officeCommands, meetings }: {
  organizationName:string; organizationId:string; agents:Agent[]; departments:Department[]; tasks:Task[]; taskContextStatus:"loaded"|"empty"|"unavailable"; runs:Run[]; officeCommands:OfficeCommand[]; meetings:Meeting[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(agents[0]?.id ?? null);
  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(refresh);
  }, [router]);
  const [filter, setFilter] = useState("all");
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandMessage, setCommandMessage] = useState("");
  const activeRuns = runs.filter(run=>["running","in_progress","started"].includes(run.status));
  const openTasks = tasks.filter(task=>!["completed","cancelled"].includes(task.status));
  const onlineAgents = agents.filter(agent=>agent.status==="active");
  const filteredAgents = agents.filter(agent=>filter==="all" || agent.departmentId===filter);
  useEffect(() => {
    if (!filteredAgents.some(agent => agent.id === selected)) {
      // Keep the selected employee valid when the department filter changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(filteredAgents[0]?.id ?? null);
    }
  }, [filteredAgents, selected]);
  const selectedAgent = agents.find(agent=>agent.id===selected) ?? null;
  const selectedTasks = selectedAgent ? tasks.filter(task=>task.agentId===selectedAgent.id).slice(0,5) : [];
  const selectedRun = selectedAgent ? runs.find(run=>run.agentId===selectedAgent.id && ["running","in_progress","started"].includes(run.status)) : null;
  const selectedOfficeCommand = selectedAgent ? officeCommands.find(command=>command.agentId===selectedAgent.id) : null;
  async function sendOfficeCommand(command:"call_to_meeting"|"return_to_workstation", agentIds:string[]) {
    if (!agentIds.length || commandBusy) return;
    setCommandBusy(true); setCommandMessage("");
    try {
      const response = await fetch("/api/office/commands", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ organizationId, agentIds, command }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Office command failed.");
      setCommandMessage(command === "call_to_meeting" ? "Meeting invitation saved. Employees are heading to the Collaboration Hub." : "Return command saved.");
      router.refresh();
    } catch (error) { setCommandMessage(error instanceof Error ? error.message : "Office command failed."); }
    finally { setCommandBusy(false); }
  }
  const departmentById = useMemo(()=>new Map(departments.map(item=>[item.id,item])),[departments]);
  const agentById = useMemo(()=>new Map(agents.map(item=>[item.id,item])),[agents]);

  return <main className="office-page">
    <header className="office-header">
      <Link href="/" className="office-brand"><span className="office-brand-mark">K</span><span><strong>KANAKO AI</strong><small>VIRTUAL COMPANY</small></span></Link>
      <div className="office-header-actions"><span className="office-live"><i/> CLOUD DATA · AUTO-REFRESH 15S</span><Link href="/" className="btn secondary">← Command center</Link></div>
    </header>

    <section className="office-hero">
      <div><div className="eyebrow">CEO OFFICE / LIVE FLOOR</div><h1>{organizationName}</h1><p className="muted">A live visual workspace connected to your actual AI workforce and task records.</p></div>
      <div className="office-clock"><span>WORKFORCE ONLINE</span><strong>{onlineAgents.length}<small> / {agents.length}</small></strong><span>AI EMPLOYEES</span></div>
    </section>

    <section className="office-metrics">
      <div><span>Employees</span><strong>{agents.length}</strong></div>
      <div><span>Active profiles</span><strong>{onlineAgents.length}</strong></div>
      <div><span>Open tasks</span><strong>{openTasks.length}</strong></div>
      <div><span>Active runs</span><strong>{activeRuns.length}</strong></div>
      <div><span>Departments</span><strong>{departments.length}</strong></div>
    </section>

    <section className="office-toolbar">
      <div><div className="eyebrow">THE WORKPLACE</div><h2>Virtual office floor</h2></div>
      <select className="field office-filter" value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Filter by department">
        <option value="all">All departments</option>
        {departments.map(department=><option key={department.id} value={department.id}>{department.name}</option>)}
      </select>
    </section>

    <section className="office-scene-wrap">
      <div className="office-scene-top"><span><i className="scene-dot"/> INTERACTIVE 3D WORKSPACE</span><span>SELECT AN EMPLOYEE TO INSPECT THEIR WORK</span></div>
      <Office3DScene
        agents={filteredAgents.map((agent, index) => ({
          id: agent.id,
          name: agent.name,
          jobTitle: agent.jobTitle,
          status: agent.status,
          departmentColor: departmentById.get(agent.departmentId ?? "")?.color ?? "#8b7cff",
          working: activeRuns.some(run => run.agentId === agent.id),
          destination: officeCommands.find(command => command.agentId === agent.id)?.destination ?? null,
          meetingSlot: index % 6,
          currentTask: (() => { const run = activeRuns.find(item => item.agentId === agent.id); return run?.taskId ? tasks.find(task => task.id === run.taskId)?.title ?? "Task in progress" : null; })(),
          taskCount: openTasks.filter(task => task.agentId === agent.id).length,
        }))}
        selected={selected}
        onSelect={setSelected}
      />
      <div className="office-scene-legend"><span><i className="legend-working"/> Running task</span><span><i className="legend-ready"/> Active profile</span><span><i className="legend-idle"/> Inactive profile</span><span className="muted">Employee activity is based on saved agent execution records.</span></div>
    </section>

    <OfficeMeetingsPanel
      organizationId={organizationId}
      taskContextStatus={taskContextStatus}
      agents={agents.map(agent => ({ id: agent.id, name: agent.name, jobTitle: agent.jobTitle, departmentId: agent.departmentId }))}
      meetings={meetings}
      taskContext={tasks.map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedTo: agents.find(agent => agent.id === task.agentId)?.name ?? "Unassigned",
        updatedAt: task.updatedAt,
      }))}
    />

    <section className="office-lower">
      <div className="office-inspector">
        <div className="eyebrow">EMPLOYEE PROFILE</div>
        {selectedAgent ? <>
          <div className="inspector-person"><div className="inspector-avatar">{initials(selectedAgent.name)}</div><div><h3>{selectedAgent.name}</h3><p>{selectedAgent.jobTitle}</p></div><span className="pill">{label(selectedAgent.status)}</span></div>
          <p className="muted inspector-description">{selectedAgent.description || "No employee description has been added yet."}</p>
          <div className="inspector-meta"><span>Department</span><strong>{departmentById.get(selectedAgent.departmentId ?? "")?.name ?? "Unassigned"}</strong><span>Availability</span><strong>{label(selectedAgent.availability)}</strong><span>Current execution</span><strong>{selectedRun ? "Running" : "No active run recorded"}</strong></div>
          {selectedAgent.skills.length>0&&<div className="inspector-skills">{selectedAgent.skills.map(skill=><span key={skill}>{skill}</span>)}</div>}
          <div className="office-command-actions">
            {selectedOfficeCommand?.destination === "collaboration_hub" ? <button className="btn secondary" disabled={commandBusy} onClick={()=>sendOfficeCommand("return_to_workstation",[selectedAgent.id])}>Return to workstation</button> : <button className="btn primary" disabled={commandBusy} onClick={()=>sendOfficeCommand("call_to_meeting",[selectedAgent.id])}>Call to Collaboration Hub</button>}
            <button className="btn secondary" disabled={commandBusy || !filteredAgents.length} onClick={()=>sendOfficeCommand("call_to_meeting",filteredAgents.slice(0,6).map(agent=>agent.id))}>Call this department</button>
          </div>
          {commandMessage && <p className="muted" role="status">{commandMessage}</p>}
          <div className="inspector-task-head"><strong>Assigned tasks</strong><span>{selectedTasks.length} recent</span></div>
          {selectedTasks.length ? selectedTasks.map(task=><div className="inspector-task" key={task.id}><span><b>{task.title}</b><small>{label(task.status)} · {label(task.priority)}</small></span><span className="pill">{task.status==="completed"?"DONE":"OPEN"}</span></div>) : <div className="empty">No tasks assigned to this employee.</div>}
        </> : <div className="empty">Select an employee workstation to view details.</div>}
      </div>
      <div className="office-departments">
        <div className="eyebrow">COMPANY STRUCTURE</div><h3>Departments</h3>
        <div className="office-department-list">{departments.map(department=>{
          const people=agents.filter(agent=>agent.departmentId===department.id);
          const work=openTasks.filter(task=>task.departmentId===department.id).length;
          return <button key={department.id} onClick={()=>setFilter(filter===department.id?"all":department.id)} className={`office-department ${filter===department.id?"active":""}`}><i style={{background:department.color}}/><span><b>{department.name}</b><small>{people.length} employees · {work} open tasks</small></span><strong>{people.length}</strong></button>;
        })}</div>
        <div className="office-recent">
          <div className="eyebrow">RECENT EXECUTION RECORDS</div>
          {runs.slice(0,5).map(run=><div className="office-run" key={run.id}><span className="run-indicator"/><span><b>{agentById.get(run.agentId)?.name ?? "AI employee"}</b><small>{label(run.status)} · {new Date(run.createdAt).toLocaleString()}</small></span></div>)}
          {!runs.length&&<p className="muted">No agent execution records yet.</p>}
        </div>
      </div>
    </section>
    <footer className="office-footer">KANAKO AI · VIRTUAL OFFICE BETA <span>Connected to organization records · Data refreshes automatically every 15 seconds</span></footer>
  </main>;
}
