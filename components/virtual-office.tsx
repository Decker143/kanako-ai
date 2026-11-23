"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Agent = { id:string; name:string; jobTitle:string; description:string; status:string; availability:string; departmentId:string|null; skills:string[] };
type Department = { id:string; name:string; color:string };
type Task = { id:string; title:string; status:string; priority:string; agentId:string|null; departmentId:string|null; updatedAt:string };
type Run = { id:string; agentId:string; taskId:string|null; status:string; createdAt:string; startedAt:string|null; finishedAt:string|null };

const desks = [
  { x: 13, y: 24 }, { x: 35, y: 19 }, { x: 57, y: 24 }, { x: 79, y: 19 },
  { x: 18, y: 64 }, { x: 41, y: 68 }, { x: 64, y: 64 }, { x: 84, y: 68 },
  { x: 50, y: 43 },
];
function initials(name:string) { return name.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase(); }
function label(value:string) { return value.replaceAll("_"," ").replace(/\b\w/g, c=>c.toUpperCase()); }

export function VirtualOffice({ organizationName, agents, departments, tasks, runs }: {
  organizationName:string; agents:Agent[]; departments:Department[]; tasks:Task[]; runs:Run[];
}) {
  const [selected, setSelected] = useState<string | null>(agents[0]?.id ?? null);
  const [filter, setFilter] = useState("all");
  const activeRuns = runs.filter(run=>["running","in_progress","started"].includes(run.status));
  const openTasks = tasks.filter(task=>!["completed","cancelled"].includes(task.status));
  const onlineAgents = agents.filter(agent=>agent.status==="active");
  const filteredAgents = agents.filter(agent=>filter==="all" || agent.departmentId===filter);
  const selectedAgent = agents.find(agent=>agent.id===selected) ?? null;
  const selectedTasks = selectedAgent ? tasks.filter(task=>task.agentId===selectedAgent.id).slice(0,5) : [];
  const selectedRun = selectedAgent ? runs.find(run=>run.agentId===selectedAgent.id && ["running","in_progress","started"].includes(run.status)) : null;
  const departmentById = useMemo(()=>new Map(departments.map(item=>[item.id,item])),[departments]);
  const agentById = useMemo(()=>new Map(agents.map(item=>[item.id,item])),[agents]);

  return <main className="office-page">
    <header className="office-header">
      <Link href="/" className="office-brand"><span className="office-brand-mark">K</span><span><strong>KANAKO AI</strong><small>VIRTUAL COMPANY</small></span></Link>
      <div className="office-header-actions"><span className="office-live"><i/> CLOUD WORKSPACE</span><Link href="/" className="btn secondary">← Command center</Link></div>
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
      <div className="office-scene-top"><span><i className="scene-dot"/> LIVE WORKSPACE DATA</span><span>SELECT A WORKSTATION TO INSPECT AN EMPLOYEE</span></div>
      <div className="office-scene">
        <div className="scene-back-wall"><div className="scene-window"><span>BUILD · LEARN · EVOLVE</span></div><div className="scene-sign">KANAKO <b>AI</b><small>ONE COMPANY · MANY MINDS</small></div><div className="scene-window second"><span>MISSION CONTROL</span></div></div>
        <div className="scene-floor"><div className="floor-grid"/></div>
        <div className="scene-plant plant-a">✦</div><div className="scene-plant plant-b">✦</div>
        <div className="scene-meeting"><span>COLLABORATION HUB</span><div className="meeting-table"/><i/><i/><i/></div>
        <div className="scene-ceo"><span>CEO OFFICE</span><div className="ceo-desk"/><b>K</b></div>
        {filteredAgents.map(agent=>{
          const originalIndex=agents.findIndex(item=>item.id===agent.id);
          const position=desks[originalIndex%desks.length];
          const isSelected=selected===agent.id;
          const isWorking=activeRuns.some(run=>run.agentId===agent.id);
          const assigned=openTasks.filter(task=>task.agentId===agent.id).length;
          const department=departmentById.get(agent.departmentId ?? "");
          return <button key={agent.id} className={`office-desk ${isSelected?"selected":""} ${isWorking?"working":""}`} style={{left:position.x+"%",top:position.y+"%", "--desk-accent":department?.color ?? "#8b7cff"} as React.CSSProperties} onClick={()=>setSelected(agent.id)} aria-label={`Inspect ${agent.name}`}>
            <span className="desk-top"><i/><i/><i/></span><span className="desk-screen"><b>{isWorking?"RUN":"AI"}</b></span>
            <span className="desk-avatar">{initials(agent.name)}</span><span className="desk-name">{agent.name}</span><span className="desk-role">{agent.jobTitle}</span>
            <span className={`desk-state ${isWorking?"is-working":agent.status==="active"?"is-ready":"is-idle"}`}>{isWorking?"WORKING":agent.status==="active"?"AVAILABLE":"INACTIVE"}</span>
            {assigned>0&&<span className="desk-task-count">{assigned} TASK{assigned===1?"":"S"}</span>}
          </button>;
        })}
        {!filteredAgents.length&&<div className="office-empty">No employees in this department yet.</div>}
      </div>
      <div className="office-scene-legend"><span><i className="legend-working"/> Running task</span><span><i className="legend-ready"/> Active profile</span><span><i className="legend-idle"/> Inactive profile</span><span className="muted">Workstation indicators reflect saved records, not simulated activity.</span></div>
    </section>

    <section className="office-lower">
      <div className="office-inspector">
        <div className="eyebrow">EMPLOYEE PROFILE</div>
        {selectedAgent ? <>
          <div className="inspector-person"><div className="inspector-avatar">{initials(selectedAgent.name)}</div><div><h3>{selectedAgent.name}</h3><p>{selectedAgent.jobTitle}</p></div><span className="pill">{label(selectedAgent.status)}</span></div>
          <p className="muted inspector-description">{selectedAgent.description || "No employee description has been added yet."}</p>
          <div className="inspector-meta"><span>Department</span><strong>{departmentById.get(selectedAgent.departmentId ?? "")?.name ?? "Unassigned"}</strong><span>Availability</span><strong>{label(selectedAgent.availability)}</strong><span>Current execution</span><strong>{selectedRun ? "Running" : "No active run recorded"}</strong></div>
          {selectedAgent.skills.length>0&&<div className="inspector-skills">{selectedAgent.skills.map(skill=><span key={skill}>{skill}</span>)}</div>}
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
    <footer className="office-footer">KANAKO AI · VIRTUAL OFFICE BETA <span>Connected to organization records · Refresh the page to load the latest state</span></footer>
  </main>;
}
