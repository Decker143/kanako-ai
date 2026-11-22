drop policy if exists agent_learning_events_insert_admins on public.agent_learning_events;
create policy agent_learning_events_insert_admins on public.agent_learning_events
  for insert to authenticated
  with check (
    private.has_org_role(agent_learning_events.organization_id, array['owner','admin']::text[])
    and agent_learning_events.created_by = (select auth.uid())
    and exists (
      select 1 from public.ai_agents a
      where a.id = agent_learning_events.agent_id
        and a.organization_id = agent_learning_events.organization_id
    )
  );

drop policy if exists agent_memories_insert_admins on public.agent_memories;
create policy agent_memories_insert_admins on public.agent_memories
  for insert to authenticated
  with check (
    private.has_org_role(agent_memories.organization_id, array['owner','admin']::text[])
    and agent_memories.created_by = (select auth.uid())
    and agent_memories.status = 'pending'
    and exists (
      select 1 from public.ai_agents a
      where a.id = agent_memories.agent_id
        and a.organization_id = agent_memories.organization_id
    )
  );

drop policy if exists agent_memories_update_admins on public.agent_memories;
create policy agent_memories_update_admins on public.agent_memories
  for update to authenticated
  using (private.has_org_role(agent_memories.organization_id, array['owner','admin']))
  with check (
    private.has_org_role(agent_memories.organization_id, array['owner','admin'])
    and agent_memories.reviewed_by = (select auth.uid())
  );
