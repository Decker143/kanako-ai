create or replace function private.enforce_ai_task_review_gate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  latest_run_output jsonb;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and old.status = 'in_review'
     and old.assigned_agent_id is not null then
    if not private.has_org_role(new.organization_id, array['owner', 'admin']::text[]) then
      raise exception 'Only workspace owners and admins can complete AI-assigned tasks after review.';
    end if;

    select ar.output
      into latest_run_output
      from public.agent_runs as ar
     where ar.organization_id = new.organization_id
       and ar.task_id = new.id
       and ar.status = 'succeeded'
     order by ar.created_at desc
     limit 1;

    if latest_run_output is not null
       and coalesce(latest_run_output -> 'review' ->> 'decision', '') <> 'approved' then
      raise exception 'AI-generated work must receive an explicit approval before task completion.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_require_ai_review_before_completion on public.tasks;
create trigger tasks_require_ai_review_before_completion
before update of status on public.tasks
for each row
execute function private.enforce_ai_task_review_gate();

revoke all on function private.enforce_ai_task_review_gate() from public, anon, authenticated;
