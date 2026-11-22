drop policy if exists task_updates_insert_members on public.task_updates;

create policy task_updates_insert_members on public.task_updates
for insert to authenticated
with check (
  private.is_org_member(organization_id)
  and actor_user_id = (select auth.uid())
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.organization_id = task_updates.organization_id
  )
  and (
    actor_agent_id is null
    or exists (
      select 1 from public.ai_agents a
      where a.id = actor_agent_id and a.organization_id = task_updates.organization_id
    )
  )
  and (
    target_agent_id is null
    or exists (
      select 1 from public.ai_agents a
      where a.id = target_agent_id and a.organization_id = task_updates.organization_id
    )
  )
);
