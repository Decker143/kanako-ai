create or replace function private.enforce_ai_task_review_gate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  latest_run_output jsonb;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed' then
    select ar.output
      into latest_run_output
      from public.agent_runs as ar
     where ar.organization_id = new.organization_id
       and ar.task_id = new.id
       and ar.status = 'succeeded'
     order by ar.created_at desc, ar.id desc
     limit 1;

    if latest_run_output is not null then
      if not private.has_org_role(new.organization_id, array['owner', 'admin']::text[]) then
        raise exception 'Only workspace owners and admins can complete AI-generated tasks after review.';
      end if;

      if coalesce(latest_run_output -> 'review' ->> 'decision', '') <> 'approved' then
        raise exception 'AI-generated work must receive an explicit approval before task completion.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_ai_task_review_gate() from public, anon, authenticated;
