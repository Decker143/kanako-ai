import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationContext } from "@/lib/supabase/organization-context";
import { VirtualOffice } from "@/components/virtual-office";

export const dynamic = "force-dynamic";

export default async function OfficePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { membership } = await getOrganizationContext(supabase, user.id);
  if (!membership) redirect("/");

  const orgId = membership.organization_id;
  const [{ data: organization }, { data: agents }, { data: departments }, { data: tasks }, { data: runs }, { data: officeCommands }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase.from("ai_agents").select("id,name,job_title,description,status,availability_status,department_id,capabilities,skills").eq("organization_id", orgId).order("created_at", { ascending: true }),
    supabase.from("departments").select("id,name,color").eq("organization_id", orgId).order("name"),
    supabase.from("tasks").select("id,title,status,priority,assigned_agent_id,department_id,updated_at").eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(150),
    supabase.from("agent_runs").select("id,agent_id,task_id,status,created_at,started_at,finished_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100),
    supabase.from("office_commands").select("id,agent_id,command,destination,status,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(200),
  ]);

  return <VirtualOffice
    organizationName={organization?.name ?? "KANAKO AI"}
    agents={(agents ?? []).map(agent => ({
      id: agent.id, name: agent.name, jobTitle: agent.job_title,
      description: agent.description ?? "", status: agent.status,
      availability: agent.availability_status ?? "unknown",
      departmentId: agent.department_id,
      skills: Array.isArray(agent.skills) ? agent.skills.filter((item): item is string => typeof item === "string").slice(0, 3) : [],
    }))}
    departments={(departments ?? []).map(department => ({ id: department.id, name: department.name, color: department.color ?? "#8b7cff" }))}
    tasks={(tasks ?? []).map(task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, agentId: task.assigned_agent_id, departmentId: task.department_id, updatedAt: task.updated_at }))}
    runs={(runs ?? []).map(run => ({ id: run.id, agentId: run.agent_id, taskId: run.task_id, status: run.status, createdAt: run.created_at, startedAt: run.started_at, finishedAt: run.finished_at }))}
  />;
}
