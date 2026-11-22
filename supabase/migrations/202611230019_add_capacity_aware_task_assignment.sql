create or replace function public.assign_task_to_agent(
  p_task_id uuid,
  p_agent_id uuid,
  p_organization_id uuid,
  p_rationale text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agent public.ai_agents%rowtype;
  v_task public.tasks%rowtype;
  v_open_count integer;
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

  select * into v_agent
  from public.ai_agents a
  where a.id = p_agent_id and a.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'AI employee not found in this workspace' using errcode = 'P0002';
  end if;

  if v_agent.status <> 'active'
     or v_agent.availability_status <> 'available'
     or v_agent.model_name is null
     or not (v_agent.capabilities @> '["task_execution"]'::jsonb) then
    raise exception 'AI employee is not eligible for new work' using errcode = 'P0001';
  end if;

  select * into v_task
  from public.tasks t
  where t.id = p_task_id and t.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Task not found in this workspace' using errcode = 'P0002';
  end if;

  if v_task.status not in ('queued', 'blocked') then
    raise exception 'Only queued or blocked tasks can be delegated' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_open_count
  from public.tasks t
  where t.organization_id = p_organization_id
    and t.assigned_agent_id = p_agent_id
    and t.status not in ('completed', 'cancelled');

  if v_open_count >= v_agent.max_concurrent_tasks then
    raise exception 'AI employee has reached their concurrent task capacity' using errcode = 'P0001';
  end if;

  update public.tasks
  set assigned_agent_id = p_agent_id
  where id = p_task_id and organization_id = p_organization_id;

  insert into public.activity_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, details
  ) values (
    p_organization_id, auth.uid(), 'ceo.task_delegated', 'task', p_task_id,
    jsonb_build_object(
      'assigned_agent_id', p_agent_id,
      'employee_name', v_agent.name,
      'rationale', left(coalesce(p_rationale, ''), 500),
      'open_task_count_before_assignment', v_open_count
    )
  );

  return jsonb_build_object(
    'task_id', p_task_id,
    'agent_id', p_agent_id,
    'open_task_count', v_open_count + 1,
    'max_concurrent_tasks', v_agent.max_concurrent_tasks
  );
end;
$$;

revoke all on function public.assign_task_to_agent(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.assign_task_to_agent(uuid, uuid, uuid, text) to authenticated;

comment on function public.assign_task_to_agent(uuid, uuid, uuid, text) is
  'Atomically assigns a queued/blocked task to an eligible AI employee after checking workspace authorization, availability, capability, and concurrent workload.';
