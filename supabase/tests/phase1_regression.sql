-- KANAKO AI Phase 1 regression suite
-- Run in the Supabase SQL Editor for the DEV project only.
-- All fixture rows are created inside one transaction and rolled back.
-- Requires the existing "KANAKO Phase 1 Test Workspace" and its owner account.

begin;

do $$
declare
  v_org uuid;
  v_user uuid;
  v_org2 uuid := gen_random_uuid();
  v_agent uuid;
  v_other_agent uuid;
  v_draft_agent uuid;
  v_task uuid;
  v_run uuid;
  v_memory uuid;
  v_offline_task uuid;
  v_mismatch_task uuid;
  v_stale_task uuid;
  v_offline_client uuid := gen_random_uuid();
  v_isolated integer;
  v_review_gate boolean := false;
  v_pending_gate boolean := false;
  v_first jsonb;
  v_retry jsonb;
  v_run_count integer;
  v_task_status text;
  v_replay_mismatch_rejected boolean := false;
  v_empty_output_rejected boolean := false;
  v_draft_agent_rejected boolean := false;
  v_assignment_mismatch_rejected boolean := false;
  v_stale_task_rejected boolean := false;
begin
  select o.id, o.created_by
    into v_org, v_user
    from public.organizations o
   where o.name = 'KANAKO Phase 1 Test Workspace'
   order by o.created_at desc
   limit 1;

  if v_org is null or v_user is null then
    raise exception 'Required Dev fixture "KANAKO Phase 1 Test Workspace" was not found.';
  end if;

  if not exists (
    select 1 from public.organization_members m
     where m.organization_id = v_org and m.user_id = v_user and m.role in ('owner','admin')
  ) then
    raise exception 'Workspace creator is not an owner/admin; cannot run authorization tests.';
  end if;

  -- Create a second workspace sentinel without granting the test user membership.
  insert into public.organizations(id, name, created_by)
  values (v_org2, 'Phase 1 Isolation Rollback Test', v_user);
  insert into public.tasks(organization_id, title, status, priority, created_by)
  values (v_org2, 'Isolation sentinel', 'queued', 'low', v_user);

  insert into public.ai_agents(organization_id, name, job_title, status, capabilities, created_by)
  values (
    v_org, 'Phase 1 Regression Agent', 'Regression Test', 'active',
    '["task_execution","local_execution"]'::jsonb, v_user
  )
  returning id into v_agent;

  insert into public.ai_agents(organization_id, name, job_title, status, capabilities, created_by)
  values (
    v_org, 'Phase 1 Alternate Regression Agent', 'Regression Test', 'active',
    '["task_execution","local_execution"]'::jsonb, v_user
  )
  returning id into v_other_agent;

  insert into public.ai_agents(organization_id, name, job_title, status, capabilities, created_by)
  values (
    v_org, 'Phase 1 Draft Regression Agent', 'Regression Test', 'draft',
    '["task_execution","local_execution"]'::jsonb, v_user
  )
  returning id into v_draft_agent;

  -- An AI-generated task cannot be completed until its latest successful run is approved.
  insert into public.tasks(organization_id, title, status, priority, assigned_agent_id, created_by)
  values (v_org, 'Phase 1 Lifecycle Regression', 'in_review', 'low', v_agent, v_user)
  returning id into v_task;

  insert into public.agent_runs(organization_id, agent_id, task_id, status, input, output, created_by)
  values (v_org, v_agent, v_task, 'succeeded', '{}'::jsonb, '{"text":"regression output"}'::jsonb, v_user)
  returning id into v_run;

  -- Exercise the real authenticated RLS policies and auth.uid().
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  execute 'set local role authenticated';

  select count(*) into v_isolated
    from public.tasks
   where organization_id = v_org2;
  if v_isolated <> 0 then
    raise exception 'FAIL organization isolation: non-member saw % rows', v_isolated;
  end if;

  begin
    update public.tasks set status = 'completed' where id = v_task;
  exception when others then
    if sqlerrm like '%explicit approval%' then
      v_review_gate := true;
    else
      raise;
    end if;
  end;
  if not v_review_gate then
    raise exception 'FAIL task lifecycle: unreviewed AI output was allowed to complete';
  end if;

  update public.agent_runs
     set output = '{"text":"regression output","review":{"decision":"approved"}}'::jsonb
   where id = v_run;
  update public.tasks
     set status = 'completed', completed_at = now()
   where id = v_task;
  if not found then
    raise exception 'FAIL task lifecycle: approved AI output could not complete its task';
  end if;

  -- Learning must start pending; only an owner/admin review can approve it.
  begin
    insert into public.agent_memories(
      organization_id, agent_id, memory_type, title, content, status, created_by, reviewed_by
    ) values (
      v_org, v_agent, 'procedure', 'Invalid direct approval',
      'Should not be insertable as approved', 'approved', v_user, v_user
    );
  exception when others then
    v_pending_gate := true;
  end;
  if not v_pending_gate then
    raise exception 'FAIL learning permissions: direct approved-memory insert was allowed';
  end if;

  insert into public.agent_memories(
    organization_id, agent_id, memory_type, title, content, status, created_by
  ) values (
    v_org, v_agent, 'procedure', 'Pending regression memory',
    'Must await owner review', 'pending', v_user
  )
  returning id into v_memory;

  update public.agent_memories
     set status = 'approved', reviewed_by = v_user, reviewed_at = now()
   where id = v_memory;
  if not found then
    raise exception 'FAIL learning permissions: owner could not approve pending memory';
  end if;

  -- Offline result sync must be atomic and idempotent across retries.
  insert into public.tasks(organization_id, title, status, priority, created_by)
  values (v_org, 'Offline Sync Idempotency Regression', 'queued', 'low', v_user)
  returning id into v_offline_task;

  v_first := public.sync_offline_agent_run(
    v_org, v_offline_client, v_agent, v_offline_task,
    'Rollback-only regression output', 'test-model'
  );
  v_retry := public.sync_offline_agent_run(
    v_org, v_offline_client, v_agent, v_offline_task,
    'Rollback-only regression output', 'test-model'
  );

  select count(*) into v_run_count
    from public.agent_runs
   where organization_id = v_org
     and output ->> 'offline_client_id' = v_offline_client::text;
  select status into v_task_status
    from public.tasks
   where id = v_offline_task and organization_id = v_org;

  if v_run_count <> 1 then
    raise exception 'FAIL offline sync idempotency: expected one run, found %', v_run_count;
  end if;
  if v_task_status <> 'in_review' then
    raise exception 'FAIL offline sync lifecycle: expected in_review, found %', v_task_status;
  end if;
  if coalesce((v_first ->> 'duplicate')::boolean, true) then
    raise exception 'FAIL offline sync: first request was marked duplicate';
  end if;
  if coalesce((v_retry ->> 'duplicate')::boolean, false) is not true then
    raise exception 'FAIL offline sync: retry was not marked duplicate';
  end if;

  -- Reusing an idempotency key for a different task must be rejected.
  insert into public.tasks(organization_id, title, status, priority, created_by)
  values (v_org, 'Offline Replay Mismatch Regression', 'queued', 'low', v_user)
  returning id into v_mismatch_task;

  begin
    perform public.sync_offline_agent_run(
      v_org, v_offline_client, v_agent, v_mismatch_task,
      'Different payload for the same local ID', 'test-model'
    );
  exception when others then
    v_replay_mismatch_rejected := true;
  end;
  if not v_replay_mismatch_rejected then
    raise exception 'FAIL offline sync: reused local ID for a different task was accepted';
  end if;

  -- Empty results and draft employees must never create runs.
  begin
    perform public.sync_offline_agent_run(
      v_org, gen_random_uuid(), v_agent, v_mismatch_task, '   ', 'test-model'
    );
  exception when others then
    v_empty_output_rejected := true;
  end;
  if not v_empty_output_rejected then
    raise exception 'FAIL offline sync: empty output was accepted';
  end if;

  begin
    perform public.sync_offline_agent_run(
      v_org, gen_random_uuid(), v_draft_agent, v_mismatch_task,
      'Draft employee must not execute', 'test-model'
    );
  exception when others then
    v_draft_agent_rejected := true;
  end;
  if not v_draft_agent_rejected then
    raise exception 'FAIL offline sync: draft employee was allowed to execute';
  end if;

  -- An employee cannot submit a result for a task assigned to another employee.
  update public.tasks set assigned_agent_id = v_other_agent
   where id = v_mismatch_task and organization_id = v_org;
  begin
    perform public.sync_offline_agent_run(
      v_org, gen_random_uuid(), v_agent, v_mismatch_task,
      'Wrong employee assignment', 'test-model'
    );
  exception when others then
    v_assignment_mismatch_rejected := true;
  end;
  if not v_assignment_mismatch_rejected then
    raise exception 'FAIL offline sync: assignment mismatch was accepted';
  end if;

  -- Completed/cancelled tasks are stale and cannot accept a new offline result.
  insert into public.tasks(organization_id, title, status, priority, created_by)
  values (v_org, 'Offline Stale Task Regression', 'completed', 'low', v_user)
  returning id into v_stale_task;
  begin
    perform public.sync_offline_agent_run(
      v_org, gen_random_uuid(), v_agent, v_stale_task,
      'Stale task must not sync', 'test-model'
    );
  exception when others then
    v_stale_task_rejected := true;
  end;
  if not v_stale_task_rejected then
    raise exception 'FAIL offline sync: completed task accepted a new result';
  end if;

  raise notice 'PASS: organization isolation';
  raise notice 'PASS: AI task review gate and approved completion';
  raise notice 'PASS: learning memory pending gate and owner approval';
  raise notice 'PASS: offline sync atomicity and duplicate retry';
  raise notice 'PASS: offline sync rejects mismatched replay, empty output, draft employee, wrong assignee, and stale task';
end
$$;

rollback;
