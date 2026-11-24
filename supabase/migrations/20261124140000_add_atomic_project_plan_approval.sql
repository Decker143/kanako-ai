-- Atomically approve a project plan and create all of its queued tasks.
-- SECURITY INVOKER preserves the caller's RLS context. Authorization is checked
-- against the authenticated user's workspace role before any write occurs.

create or replace function public.approve_project_plan(p_plan_id uuid, p_organization_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_plan public.reports%rowtype;
  v_task jsonb;
  v_department_id uuid;
  v_task_id uuid;
  v_task_ids uuid[] := array[]::uuid[];
  v_task_count integer := 0;
  v_department_name text;
  v_priority text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.has_org_role(p_organization_id, array['owner', 'admin']::text[]) then
    raise exception 'Only workspace owners and admins can approve project plans.' using errcode = '42501';
  end if;

  select r.*
    into v_plan
    from public.reports r
   where r.id = p_plan_id
     and r.organization_id = p_organization_id
     and r.report_type = 'project_plan'
   for update;

  if not found then
    raise exception 'Project plan not found.' using errcode = 'P0002';
  end if;

  if v_plan.content->>'plan_status' is distinct from 'pending_approval'
     or pg_catalog.jsonb_typeof(v_plan.content->'tasks') is distinct from 'array'
     or pg_catalog.jsonb_array_length(v_plan.content->'tasks') = 0 then
    raise exception 'This plan is no longer awaiting approval or has no tasks.' using errcode = '55000';
  end if;

  for v_task in
    select item.value
      from pg_catalog.jsonb_array_elements(v_plan.content->'tasks') as item(value)
  loop
    if pg_catalog.length(pg_catalog.btrim(coalesce(v_task->>'title', ''))) = 0 then
      raise exception 'Every project task must have a title.' using errcode = '22023';
    end if;

    v_department_name := nullif(pg_catalog.btrim(coalesce(v_task->>'department_name', '')), '');
    v_department_id := null;

    if v_department_name is not null then
      select d.id
        into v_department_id
        from public.departments d
       where d.organization_id = p_organization_id
         and pg_catalog.lower(d.name) = pg_catalog.lower(v_department_name)
       limit 1;

      if v_department_id is null then
        raise exception 'Unknown department: %.', v_department_name using errcode = '22023';
      end if;
    end if;

    v_priority := pg_catalog.lower(coalesce(v_task->>'priority', 'medium'));
    if v_priority not in ('low', 'medium', 'high', 'urgent') then
      v_priority := 'medium';
    end if;

    insert into public.tasks (
      organization_id, title, description, priority, department_id,
      status, created_by, metadata
    ) values (
      p_organization_id,
      pg_catalog.left(pg_catalog.btrim(v_task->>'title'), 180),
      nullif(pg_catalog.left(coalesce(v_task->>'description', ''), 2000), ''),
      v_priority,
      v_department_id,
      'queued',
      v_user_id,
      pg_catalog.jsonb_build_object(
        'project_plan_id', v_plan.id,
        'project_plan_title', v_plan.title,
        'plan_order', case
          when coalesce(v_task->>'order', '') ~ '^[0-9]+$' then (v_task->>'order')::integer
          else null
        end
      )
    ) returning id into v_task_id;

    v_task_ids := pg_catalog.array_append(v_task_ids, v_task_id);
    v_task_count := v_task_count + 1;
  end loop;

  update public.reports
     set content = v_plan.content || pg_catalog.jsonb_build_object(
       'plan_status', 'approved',
       'approved_at', v_now,
       'approved_by', v_user_id,
       'created_task_ids', to_jsonb(v_task_ids)
     )
   where id = v_plan.id
     and organization_id = p_organization_id;

  return pg_catalog.jsonb_build_object(
    'plan_id', v_plan.id,
    'status', 'approved',
    'created_task_count', v_task_count,
    'created_task_ids', to_jsonb(v_task_ids)
  );
end;
$function$;

revoke all on function public.approve_project_plan(uuid, uuid) from public;
revoke all on function public.approve_project_plan(uuid, uuid) from anon;
grant execute on function public.approve_project_plan(uuid, uuid) to authenticated;
