-- Reserve an AI task run and enforce per-agent concurrency in one transaction.
-- The AI employee row lock serializes reservations across different tasks for the same employee.
create or replace function public.reserve_agent_task_run(
  p_task_id uuid,
  p_agent_id uuid,
  p_organization_id uuid,
  p_input jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_agent public.ai_agents%rowtype;
  v_task public.tasks%rowtype;
  v_open_count integer;
  v_run_id uuid;
  v_updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'Workspace owner or admin permission required' using errcode = '42501';
  end if;

  -- Every execution reservation for this employee must acquire this lock first.
  select * into v_agent
  from public.ai_agents a
  where a.id = p_agent_id
    and a.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'AI employee not found in this workspace' using errcode = 'P0002';
  end if;

  if v_agent.status <> 'active'
     or v_agent.availability_status <> 'available'
     or v_agent.model_name is null
     or position('/' in v_agent.model_name) = 0
     or not (v_agent.capabilities @> '["task_execution"]'::jsonb) then
    raise exception 'AI employee is not eligible for task execution' using errcode = 'P0001';
  end if;

  if v_agent.max_concurrent_tasks < 1 then
    raise exception 'AI employee concurrency limit must be at least one' using errcode = 'P0001';
  end if;

  select * into v_task
  from public.tasks t
  where t.id = p_task_id
    and t.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Task not found in this workspace' using errcode = 'P0002';
  end if;

  if v_task.status not in ('queued', 'blocked')
     or (v_task.assigned_agent_id is not null and v_task.assigned_agent_id <> p_agent_id) then
    raise exception 'Task is not available to the selected AI employee' using errcode = 'P0001';
  end if;

  if v_task.department_id is not null
     and v_agent.department_id is not null
     and v_task.department_id <> v_agent.department_id then
    raise exception 'Task department does not match the AI employee department' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_open_count
  from public.tasks t
  where t.organization_id = p_organization_id
    and t.assigned_agent_id = p_agent_id
    and t.id <> p_task_id
    and t.status not in ('completed', 'cancelled');

  if v_open_count >= v_agent.max_concurrent_tasks then
    raise exception 'AI employee has reached their concurrent task capacity' using errcode = 'P0001';
  end if;

  insert into public.agent_runs (
    organization_id, agent_id, task_id, status, input, started_at, created_by
  ) values (
    p_organization_id, p_agent_id, p_task_id, 'running',
    coalesce(p_input, '{}'::jsonb), now(), auth.uid()
  )
  returning id into v_run_id;

  update public.tasks
  set status = 'in_progress',
      assigned_agent_id = p_agent_id
  where id = p_task_id
    and organization_id = p_organization_id;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Task could not be moved into the in-progress state' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'run_id', v_run_id,
    'task_id', p_task_id,
    'agent_id', p_agent_id,
    'open_task_count_before_reservation', v_open_count,
    'max_concurrent_tasks', v_agent.max_concurrent_tasks
  );
end;
$$;

revoke all on function public.reserve_agent_task_run(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.reserve_agent_task_run(uuid, uuid, uuid, jsonb) to authenticated;

comment on function public.reserve_agent_task_run(uuid, uuid, uuid, jsonb) is
  'Atomically locks an AI employee, revalidates task eligibility and capacity, creates a running agent_runs row, and moves the task to in_progress. Runs with caller privileges and remains constrained by RLS.';
