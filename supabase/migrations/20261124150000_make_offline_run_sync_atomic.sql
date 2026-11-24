create or replace function public.sync_offline_agent_run(
  p_organization_id uuid,
  p_offline_client_id uuid,
  p_agent_id uuid,
  p_task_id uuid,
  p_output text,
  p_model text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_agent public.ai_agents%rowtype;
  v_task public.tasks%rowtype;
  v_existing public.agent_runs%rowtype;
  v_run_id uuid;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Sign in before syncing an offline AI result.';
  end if;

  if p_organization_id is null or p_offline_client_id is null
     or p_agent_id is null or p_task_id is null
     or nullif(pg_catalog.btrim(p_output), '') is null then
    raise exception 'A workspace, local result ID, employee, task, and non-empty result are required.';
  end if;

  if not private.has_org_role(p_organization_id, array['owner', 'admin']::text[]) then
    raise exception 'Only workspace owners or admins can sync offline AI results.';
  end if;

  -- Serialize retries of the same device result before checking the idempotency key.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization_id::text || ':' || p_offline_client_id::text, 0)
  );

  select ar.*
    into v_existing
    from public.agent_runs as ar
   where ar.organization_id = p_organization_id
     and ar.output ->> 'offline_client_id' = p_offline_client_id::text
   limit 1
   for update;

  if found then
    if v_existing.status <> 'succeeded'
       or v_existing.task_id is distinct from p_task_id
       or v_existing.agent_id is distinct from p_agent_id then
      raise exception 'This offline result ID was already used for a different or incomplete run.';
    end if;

    return pg_catalog.jsonb_build_object(
      'synced', true,
      'duplicate', true,
      'runId', v_existing.id,
      'taskId', v_existing.task_id,
      'status', 'in_review'
    );
  end if;

  select a.*
    into v_agent
    from public.ai_agents as a
   where a.id = p_agent_id
     and a.organization_id = p_organization_id
   for share;

  if not found
     or v_agent.status is distinct from 'active'
     or not coalesce(v_agent.capabilities ? 'task_execution', false)
     or not coalesce(v_agent.capabilities ? 'local_execution', false) then
    raise exception 'The employee is not active or is not authorized for local task execution.';
  end if;

  select t.*
    into v_task
    from public.tasks as t
   where t.id = p_task_id
     and t.organization_id = p_organization_id
   for update;

  if not found
     or v_task.status not in ('queued', 'blocked')
     or (v_task.assigned_agent_id is not null and v_task.assigned_agent_id <> p_agent_id) then
    raise exception 'The task is no longer available for this employee to execute.';
  end if;

  insert into public.agent_runs (
    organization_id, agent_id, task_id, status, input, output,
    created_by, started_at, finished_at
  ) values (
    p_organization_id,
    p_agent_id,
    p_task_id,
    'succeeded',
    pg_catalog.jsonb_build_object(
      'task_title', v_task.title,
      'task_description', v_task.description,
      'offline', true
    ),
    pg_catalog.jsonb_build_object(
      'text', pg_catalog.left(pg_catalog.btrim(p_output), 16000),
      'model', pg_catalog.left(coalesce(nullif(p_model, ''), 'local-model'), 120),
      'offline_client_id', p_offline_client_id::text,
      'source', 'device_local_inference'
    ),
    v_user_id,
    v_now,
    v_now
  )
  returning id into v_run_id;

  update public.tasks
     set status = 'in_review',
         assigned_agent_id = p_agent_id,
         completed_at = null
   where id = p_task_id
     and organization_id = p_organization_id
     and status in ('queued', 'blocked');

  if not found then
    raise exception 'The task changed before the offline result could enter human review.';
  end if;

  insert into public.activity_logs (
    organization_id, actor_user_id, actor_agent_id,
    action, entity_type, entity_id, details
  ) values (
    p_organization_id, v_user_id, p_agent_id,
    'ai_agent.offline_run_synced', 'agent_run', v_run_id,
    pg_catalog.jsonb_build_object(
      'task_id', p_task_id,
      'model', pg_catalog.left(coalesce(nullif(p_model, ''), 'local-model'), 120),
      'local_run_id', p_offline_client_id
    )
  );

  return pg_catalog.jsonb_build_object(
    'synced', true,
    'duplicate', false,
    'runId', v_run_id,
    'taskId', p_task_id,
    'status', 'in_review'
  );
end;
$$;

revoke all on function public.sync_offline_agent_run(uuid, uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.sync_offline_agent_run(uuid, uuid, uuid, uuid, text, text) to authenticated;
