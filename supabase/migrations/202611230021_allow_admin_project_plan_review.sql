create policy reports_update_admins on public.reports
for update to authenticated
using (private.has_org_role(organization_id, array['owner'::text, 'admin'::text]))
with check (private.has_org_role(organization_id, array['owner'::text, 'admin'::text]));