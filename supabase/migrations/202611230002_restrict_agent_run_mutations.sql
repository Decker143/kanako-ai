drop policy if exists agent_runs_insert_members on public.agent_runs;
create policy agent_runs_insert_admins on public.agent_runs
  for insert to authenticated
  with check (
    private.has_org_role(organization_id, array['owner','admin'])
    and created_by = (select auth.uid())
  );

drop policy if exists agent_runs_update_members on public.agent_runs;
create policy agent_runs_update_admins on public.agent_runs
  for update to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
