alter table public.task_updates drop constraint if exists task_updates_handoff_target_check;

create or replace function public.approve_task_handoff(
  p_task_id uuid,
  p_request_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_task_id uuid;
  v_target_agent_id uuid;
  v_message text;
  v_latest_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'Workspace owner or admin permission required' using errcode = '42501';
  end if;
  select t.id into v_task_id
  from public.tasks t
  where t.id = p_task_id and t.organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'Task not found in this workspace' using errcode = 'P0002';
  end if;
  select u.target_agent_id, u.message into v_target_agent_id, v_message
  from public.task_updates u
  where u.id = p_request_id and u.task_id = p_task_id
    and u.organization_id = p_organization_id and u.event_type = 'handoff_requested';
  if not found or v_target_agent_id is null then
    raise exception 'Handoff request not found' using errcode = 'P0002';
  end if;
  select u.id into v_latest_id
  from public.task_updates u
  where u.task_id = p_task_id and u.organization_id = p_organization_id
    and u.event_type in ('handoff_requested', 'handoff_approved')
  order by u.created_at desc, u.id desc limit 1;
  if v_latest_id is distinct from p_request_id then
    raise exception 'A newer handoff decision already exists' using errcode = 'P0001';
  end if;
  v_result := public.assign_task_to_agent(
    p_task_id, v_target_agent_id, p_organization_id,
    'Owner-approved handoff: ' || left(coalesce(v_message, ''), 350)
  );
  insert into public.task_updates (
    organization_id, task_id, actor_user_id, event_type, message, target_agent_id
  ) values (
    p_organization_id, p_task_id, auth.uid(), 'handoff_approved',
    'Owner approved handoff. ' || left(coalesce(v_message, ''), 3800), v_target_agent_id
  );
  return v_result;
end;
$function$;

revoke all on function public.approve_task_handoff(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_task_handoff(uuid, uuid, uuid) to authenticated;