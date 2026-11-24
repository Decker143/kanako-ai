import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationContext } from "@/lib/supabase/organization-context";
import { rankAssignmentCandidates } from "@/lib/ai-workforce/assignment-ranking";

export const runtime = "nodejs";
export const maxDuration = 30;

type Assignment = { agentId?: string; rationale?: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (process.env.KANAKO_AI_EXECUTION_ENABLED !== "true") {
    return NextResponse.json({ error: "AI execution is locked until model usage is explicitly approved." }, { status: 503 });
  }

  const { membership } = await getOrganizationContext(supabase, user.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can request AI CEO delegation." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { taskId?: string } | null;
  if (!body?.taskId) return NextResponse.json({ error: "Select a task to delegate." }, { status: 400 });

  const [{ data: task }, { data: employeeRecords }, { data: departments }, { data: ceo }, { data: assignedTasks }, { data: recentRuns }] = await Promise.all([
    supabase.from("tasks").select("id,title,description,priority,status,department_id,assigned_agent_id")
      .eq("id", body.taskId).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("ai_agents").select("id,name,job_title,description,instructions,department_id,model_name,status,capabilities,skills,max_concurrent_tasks,availability_status")
      .eq("organization_id", membership.organization_id).eq("status", "active").not("model_name", "is", null),
    supabase.from("departments").select("id,name,description").eq("organization_id", membership.organization_id),
    supabase.from("ai_agents").select("name,instructions").eq("organization_id", membership.organization_id)
      .eq("job_title", "AI Chief Executive Officer").limit(1).maybeSingle(),
    supabase.from("tasks").select("assigned_agent_id,status").eq("organization_id", membership.organization_id)
      .not("assigned_agent_id", "is", null).not("status", "in", "(completed,cancelled)"),
    supabase.from("agent_runs").select("agent_id,status,created_at").eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }).limit(250),
  ]);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const eligibleEmployees = (employeeRecords ?? []).map(employee => {
    const openTaskCount = (assignedTasks ?? []).filter(item => item.assigned_agent_id === employee.id).length;
    const outcomes = (recentRuns ?? []).filter(run => run.agent_id === employee.id && new Date(run.created_at).getTime() >= thirtyDaysAgo && ["succeeded", "failed"].includes(run.status));
    const successfulRuns = outcomes.filter(run => run.status === "succeeded").length;
    return {
      ...employee,
      openTaskCount,
      recentRunCount: outcomes.length,
      recentSuccessRate: outcomes.length ? Math.round(successfulRuns / outcomes.length * 100) : null,
      remainingCapacity: Math.max(0, employee.max_concurrent_tasks - openTaskCount),
      workloadUtilizationPercent: Math.round(openTaskCount / Math.max(1, employee.max_concurrent_tasks) * 100),
    };
  }).filter(employee =>
    typeof employee.model_name === "string" && employee.model_name.includes("/") &&
    Array.isArray(employee.capabilities) && employee.capabilities.includes("task_execution") &&
    employee.availability_status === "available" &&
    employee.openTaskCount < employee.max_concurrent_tasks
  );
  const rankedEmployees = rankAssignmentCandidates(eligibleEmployees, {
    title: task?.title,
    description: task?.description,
    department_id: task?.department_id,
  });
  // Kanako may choose among the best-fit candidates, but cannot override
  // deterministic department/skill ranking by selecting a lower-fit employee.
  const bestFitScore = rankedEmployees[0]?.fitScore;
  const employees = rankedEmployees.filter(employee => employee.fitScore === bestFitScore);

  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (!["queued", "blocked"].includes(task.status)) {
    return NextResponse.json({ error: task.status === "in_review" ? "This task is awaiting human review and cannot be reassigned until the review is resolved." : "Only queued or blocked tasks can be delegated." }, { status: 409 });
  }
  if (!employees?.length) {
    return NextResponse.json({ error: "No active AI employees with a configured model and Task execution permission are available for delegation." }, { status: 409 });
  }

  try {
    const result = await generateText({
      model: process.env.KANAKO_AI_MODEL || "openai/gpt-6-astra",
      system: [
        "You are Kanako, the AI Chief Executive Officer of this workspace.",
        "Your only permitted action in this request is to select the best qualified active AI employee for one task.",
        "Select only one employee from the supplied eligible employee list. Never invent an employee ID.",
        "Hard constraints: choose only from the supplied top-fit candidates. The server has already ranked department and complete skill-tag fit deterministically; do not select an employee outside this top-fit group. Among tied top-fit candidates, consider role and instructions, remaining capacity, and recent success rate as secondary signals. Do not penalize employees with no run history.",
        "Do not execute the task, contact anyone, change external systems, or spend money.",
        "Return exactly one JSON object and no markdown: {\"agentId\":\"eligible employee UUID\",\"rationale\":\"brief reason\"}.",
        "CEO operating instructions: " + (ceo?.instructions || "Coordinate departments, match work to qualified employees, and keep humans in control of consequential actions."),
        "Departments: " + JSON.stringify(departments ?? []),
        "Eligible employees: " + JSON.stringify(employees.map(({id,name,job_title,description,department_id,instructions,skills,openTaskCount,max_concurrent_tasks,remainingCapacity,recentRunCount,recentSuccessRate,skillMatches,departmentMatch,fitScore,workloadUtilizationPercent}) => ({id,name,job_title,description,department_id,instructions,skills,openTaskCount,max_concurrent_tasks,remainingCapacity,recentRunCount,recentSuccessRate,skillMatches,departmentMatch,fitScore,workloadUtilizationPercent}))),
      ].join("\n\n"),
      prompt: "Choose an employee for this task:\n" + JSON.stringify({
        id: task.id, title: task.title, description: task.description, priority: task.priority,
        department_id: task.department_id, current_assignee: task.assigned_agent_id,
      }),
      maxOutputTokens: 300,
    });

    const raw = result.text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
    const assignment = JSON.parse(raw) as Assignment;
    const selected = employees.find(employee => employee.id === assignment.agentId);
    if (!selected) throw new Error("The CEO returned an employee outside the eligible list.");

    const { data: assignmentResult, error: updateError } = await supabase.rpc("assign_task_to_agent", {
      p_task_id: task.id,
      p_agent_id: selected.id,
      p_organization_id: membership.organization_id,
      p_rationale: (assignment.rationale || "").slice(0, 500),
    });
    if (updateError) throw updateError;
    return NextResponse.json({
      taskId: task.id, agentId: selected.id, employeeName: selected.name,
      rationale: assignment.rationale || "Selected based on role and department fit.",
      status: "assigned_not_executed", capacity: assignmentResult,
    });
  } catch (error) {
    console.error("KANAKO AI CEO delegation failed", error);
    const message = error instanceof Error ? error.message : "";
    if (/capacity|not eligible|Only queued|already assigned/i.test(message)) {
      return NextResponse.json({ error: "The selected employee or task is no longer eligible. Refresh the workspace and try delegation again." }, { status: 409 });
    }
    if (/permission required|Authentication required/i.test(message)) {
      return NextResponse.json({ error: "You no longer have permission to delegate work in this workspace." }, { status: 403 });
    }
    return NextResponse.json({ error: "The AI CEO could not safely assign this task. No task execution was started." }, { status: 502 });
  }
}
