import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationContext } from "@/lib/supabase/organization-context";

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

  const [{ data: task }, { data: employeeRecords }, { data: departments }, { data: ceo }] = await Promise.all([
    supabase.from("tasks").select("id,title,description,priority,status,department_id,assigned_agent_id")
      .eq("id", body.taskId).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("ai_agents").select("id,name,job_title,description,instructions,department_id,model_name,status,capabilities")
      .eq("organization_id", membership.organization_id).eq("status", "active").not("model_name", "is", null),
    supabase.from("departments").select("id,name,description").eq("organization_id", membership.organization_id),
    supabase.from("ai_agents").select("name,instructions").eq("organization_id", membership.organization_id)
      .eq("job_title", "AI Chief Executive Officer").limit(1).maybeSingle(),
  ]);
  const employees = (employeeRecords ?? []).filter(employee =>
    typeof employee.model_name === "string" && employee.model_name.includes("/") &&
    Array.isArray(employee.capabilities) && employee.capabilities.includes("task_execution")
  );

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
        "Prefer department alignment, then job title, description, and employee instructions.",
        "Do not execute the task, contact anyone, change external systems, or spend money.",
        "Return exactly one JSON object and no markdown: {\"agentId\":\"eligible employee UUID\",\"rationale\":\"brief reason\"}.",
        "CEO operating instructions: " + (ceo?.instructions || "Coordinate departments, match work to qualified employees, and keep humans in control of consequential actions."),
        "Departments: " + JSON.stringify(departments ?? []),
        "Eligible employees: " + JSON.stringify(employees.map(({id,name,job_title,description,department_id,instructions}) => ({id,name,job_title,description,department_id,instructions}))),
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

    const { error: updateError } = await supabase.from("tasks").update({
      assigned_agent_id: selected.id,
      status: task.status === "queued" ? "queued" : task.status,
    }).eq("id", task.id).eq("organization_id", membership.organization_id);
    if (updateError) throw updateError;

    await supabase.from("activity_logs").insert({
      organization_id: membership.organization_id, actor_user_id: user.id,
      action: "ceo.task_delegated", entity_type: "task", entity_id: task.id,
      details: { assigned_agent_id: selected.id, employee_name: selected.name, rationale: (assignment.rationale || "").slice(0, 500) },
    });
    return NextResponse.json({
      taskId: task.id, agentId: selected.id, employeeName: selected.name,
      rationale: assignment.rationale || "Selected based on role and department fit.",
      status: "assigned_not_executed",
    });
  } catch (error) {
    console.error("KANAKO AI CEO delegation failed", error);
    return NextResponse.json({ error: "The AI CEO could not safely assign this task. No task execution was started." }, { status: 502 });
  }
}
