-- Restrict workflow run mutations to organization owners and admins.
drop policy if exists workflow_runs_insert_members on public.workflow_runs;
drop policy if exists workflow_runs_update_members on public.workflow_runs;

create policy workflow_runs_insert_admins
on public.workflow_runs
for insert
to authenticated
with check (
  private.has_org_role(organization_id, array['owner'::text, 'admin'::text])
  and exists (
    select 1
    from public.automation_workflows w
    where w.id = workflow_runs.workflow_id
      and w.organization_id = workflow_runs.organization_id
  )
);

create policy workflow_runs_update_admins
on public.workflow_runs
for update
to authenticated
using (
  private.has_org_role(organization_id, array['owner'::text, 'admin'::text])
  and exists (
    select 1
    from public.automation_workflows w
    where w.id = workflow_runs.workflow_id
      and w.organization_id = workflow_runs.organization_id
  )
)
with check (
  private.has_org_role(organization_id, array['owner'::text, 'admin'::text])
  and exists (
    select 1
    from public.automation_workflows w
    where w.id = workflow_runs.workflow_id
      and w.organization_id = workflow_runs.organization_id
  )
);
