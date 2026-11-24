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
  v_capacity_agent uuid;
  v_capacity_task uuid;
  v_capacity_overflow_task uuid;
  v_org2_agent uuid;
  v_task uuid;
  v_plan_valid uuid;
  v_plan_invalid uuid;
  v_plan_empty uuid;
  v_plan_badtitle uuid;
  v_plan_baddept uuid;
  v_plan_cross uuid;
  v_plan_result jsonb;
  v_plan_error text;
  v_plan_code text;
  v_plan_count integer;
  v_learning_isolated integer;
  v_event_isolated integer;
  v_denied boolean := false;
  v_learning_denied boolean := false;
  v_memory_update_denied boolean := false;
  v_private_memory uuid;
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
  v_capacity_rejected boolean := false;
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

  insert into public.ai_agents(organization_id, name, job_title, status, capabilities, created_by)
  values (v_org2, 'Phase 1 Isolated Regression Agent', 'Regression Test', 'active',
    '["task_execution","local_execution"]'::jsonb, v_user)
  returning id into v_org2_agent;

  insert into public.reports(organization_id, title, report_type, content, generated_by)
  values (v_org, 'Regression valid approval', 'project_plan',
    '{"plan_status":"pending_approval","tasks":[{"title":"Regression approval task one"},{"title":"Regression approval task two","priority":"low"}]}'::jsonb, v_user)
  returning id into v_plan_valid;
  insert into public.reports(organization_id, title, report_type, content, generated_by)
  values (v_org, 'Regression invalid status', 'project_plan',
    '{"plan_status":"approved","tasks":[{"title":"Must not create"}]}'::jsonb, v_user)
  returning id into v_plan_invalid;
  insert into public.reports(organization_id, title, report_type, content, generated_by)
  values (v_org, 'Regression empty plan', 'project_plan',
    '{"plan_status":"pending_approval","tasks":[]}'::jsonb, v_user)
  returning id into v_plan_empty;
  insert into public.reports(organization_id, title, report_type, content, generated_by)
  values (v_org, 'Regression blank title', 'project_plan',
    '{"plan_status":"pending_approval","tasks":[{"title":"   "}]}'::jsonb, v_user)
  returning id into v_plan_badtitle;
  insert into public.reports(organization_id, title, report_type, content, generated_by)
  values (v_org, 'Regression invalid department rollback', 'project_plan',
    '{"plan_status":"pending_approval","tasks":[{"title":"Would be first"},{"title":"Must rollback","department_name":"Definitely Not A Department"}]}'::jsonb, v_user)
  returning id into v_plan_baddept;
  insert into public.reports(organization_id, title, report_type, content, generated_by)
  values (v_org2, 'Regression cross-org plan', 'project_plan',
    '{"plan_status":"pending_approval","tasks":[{"title":"Cross-org task"}]}'::jsonb, v_user)
  returning id into v_plan_cross;

  insert into public.agent_memories(organization_id, agent_id, memory_type, title, content, status, created_by)
  values (v_org2, v_org2_agent, 'procedure', 'Isolated memory fixture',
    'Must not be visible from the first workspace', 'pending', v_user);
  insert into public.agent_learning_events(organization_id, agent_id, event_type, lesson, created_by)
  values (v_org2, v_org2_agent, 'user_correction', 'Isolated event fixture', v_user);

  -- An AI-generated task cannot be completed until its latest successful run is approved.
  insert into public.tasks(organization_id, title, status, priority, assigned_agent_id, created_by)
  values (v_org, 'Phase 1 Lifecycle Regression', 'in_review', 'low', v_agent, v_user)
  returning id into v_task;

  insert into public.agent_runs(organization_id, agent_id, task_id, status, input, output, created_by)
  values (v_org, v_agent, v_task, 'succeeded', '{}'::jsonb, '{"text":"regression output"}'::jsonb, v_user)
  returning id into v_run;

  -- Capacity boundary: an employee with one occupied slot must not receive another task.
  insert into public.ai_agents(
    organization_id, name, job_title, status, availability_status, model_name,
    capabilities, max_concurrent_tasks, created_by
  ) values (
    v_org, 'Phase 1 Capacity Regression Agent', 'Regression Test', 'active', 'available',
    'local-test-only', '["task_execution"]'::jsonb, 1, v_user
  ) returning id into v_capacity_agent;

  insert into public.tasks(organization_id, title, status, priority, assigned_agent_id, created_by)
  values (v_org, 'Capacity slot already occupied', 'queued', 'low', v_capacity_agent, v_user)
  returning id into v_capacity_task;

  insert into public.tasks(organization_id, title, status, priority, created_by)
  values (v_org, 'Capacity boundary assignment', 'queued', 'low', v_user)
  returning id into v_capacity_overflow_task;

  -- Exercise the real authenticated RLS policies and auth.uid().
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  execute 'set local role authenticated';

  select count(*) into v_isolated
    from public.tasks
   where organization_id = v_org2;
  if v_isolated <> 0 then
    raise exception 'FAIL organization isolation: non-member saw % rows', v_isolated;
  end if;

  select count(*) into v_learning_isolated from public.agent_memories where organization_id = v_org2;
  select count(*) into v_event_isolated from public.agent_learning_events where organization_id = v_org2;
  if v_learning_isolated <> 0 or v_event_isolated <> 0 then
    raise exception 'FAIL learning isolation: saw % memories and % events', v_learning_isolated, v_event_isolated;
  end if;

  -- Non-members cannot approve plans.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.approve_project_plan(v_plan_valid, v_org);
  exception when others then
    get stacked diagnostics v_plan_code = returned_sqlstate;
    v_denied := v_plan_code = '42501';
  end;
  if not v_denied then raise exception 'FAIL project-plan authorization: non-member was not denied'; end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  -- Capacity-aware assignment must reject work beyond the employee's configured limit.
  begin
    perform public.assign_task_to_agent(
      v_capacity_overflow_task, v_capacity_agent, v_org, 'Phase 1 capacity boundary regression'
    );
  exception when others then
    get stacked diagnostics v_plan_code = returned_sqlstate;
    v_capacity_rejected := v_plan_code = 'P0001';
  end;
  if not v_capacity_rejected then
    raise exception 'FAIL capacity assignment: employee accepted work beyond max_concurrent_tasks';
  end if;
  if exists (
    select 1 from public.tasks
     where id = v_capacity_overflow_task and assigned_agent_id = v_capacity_agent
  ) then
    raise exception 'FAIL capacity assignment: overflow task was persisted as assigned';
  end if;

  -- A plan from another workspace cannot be approved in this workspace.
  v_plan_code := null;
  begin
    perform public.approve_project_plan(v_plan_cross, v_org);
  exception when others then
    get stacked diagnostics v_plan_code = returned_sqlstate;
  end;
  if v_plan_code <> 'P0002' then raise exception 'FAIL cross-workspace plan access: expected P0002, got %', v_plan_code; end if;

  v_plan_result := public.approve_project_plan(v_plan_valid, v_org);
  if (v_plan_result ->> 'created_task_count')::integer <> 2 then
    raise exception 'FAIL plan approval: expected two tasks, got %', v_plan_result;
  end if;
  select count(*) into v_plan_count from public.tasks
   where organization_id = v_org and metadata ->> 'project_plan_id' = v_plan_valid::text;
  if v_plan_count <> 2 then raise exception 'FAIL plan approval: persisted task count %', v_plan_count; end if;

  v_plan_code := null;
  begin
    perform public.approve_project_plan(v_plan_valid, v_org);
  exception when others then
    get stacked diagnostics v_plan_code = returned_sqlstate;
  end;
  if v_plan_code <> '55000' then raise exception 'FAIL duplicate plan approval: expected 55000, got %', v_plan_code; end if;

  foreach v_plan_result in array array[
    jsonb_build_object('id', v_plan_invalid, 'expected', '55000'),
    jsonb_build_object('id', v_plan_empty, 'expected', '55000'),
    jsonb_build_object('id', v_plan_badtitle, 'expected', '22023')
  ] loop
    v_plan_code := null;
    begin
      perform public.approve_project_plan((v_plan_result ->> 'id')::uuid, v_org);
    exception when others then
      get stacked diagnostics v_plan_code = returned_sqlstate;
    end;
    if v_plan_code <> v_plan_result ->> 'expected' then
      raise exception 'FAIL plan validation: expected %, got %', v_plan_result ->> 'expected', v_plan_code;
    end if;
  end loop;

  v_plan_code := null;
  begin
    perform public.approve_project_plan(v_plan_baddept, v_org);
  exception when others then
    get stacked diagnostics v_plan_code = returned_sqlstate;
  end;
  if v_plan_code <> '22023' then raise exception 'FAIL invalid department: expected 22023, got %', v_plan_code; end if;
  select count(*) into v_plan_count from public.tasks
   where organization_id = v_org and metadata ->> 'project_plan_id' = v_plan_baddept::text;
  if v_plan_count <> 0 then raise exception 'FAIL plan atomic rollback: % tasks persisted', v_plan_count; end if;
  if not exists (select 1 from public.reports where id = v_plan_baddept and content ->> 'plan_status' = 'pending_approval') then
    raise exception 'FAIL plan atomic rollback: plan status changed';
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

  insert into public.agent_memories(organization_id, agent_id, memory_type, title, content, status, created_by)
  values (v_org, v_agent, 'correction', 'Non-member update guard',
    'Only an owner may approve this memory', 'pending', v_user)
  returning id into v_private_memory;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    insert into public.agent_learning_events(organization_id, agent_id, event_type, lesson, created_by)
    values (v_org, v_agent, 'user_correction', 'Unauthorized event attempt', auth.uid());
  exception when others then
    get stacked diagnostics v_plan_code = returned_sqlstate;
    v_learning_denied := v_plan_code = '42501';
  end;
  update public.agent_memories set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = v_private_memory;
  v_memory_update_denied := not found;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  if not v_learning_denied then raise exception 'FAIL learning permissions: non-member inserted an event'; end if;
  if not v_memory_update_denied then raise exception 'FAIL learning permissions: non-member updated a memory'; end if;

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

  raise notice 'PASS: organization and learning read isolation';
  raise notice 'PASS: capacity-aware assignment rejects work beyond max_concurrent_tasks';
  raise notice 'PASS: project-plan authorization, cross-org protection, validation, duplicate guard, and rollback';
  raise notice 'PASS: AI task review gate and approved completion';
  raise notice 'PASS: learning pending gate, owner approval, and non-member write protection';
  raise notice 'PASS: offline sync atomicity and duplicate retry';
  raise notice 'PASS: offline sync rejects mismatched replay, empty output, draft employee, wrong assignee, and stale task';
end
$$;

rollback;
