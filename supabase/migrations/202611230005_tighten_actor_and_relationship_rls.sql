drop policy if exists activity_insert_members on public.activity_logs;
create policy activity_insert_members on public.activity_logs
  for insert to authenticated
  with check (private.is_org_member(organization_id) and actor_user_id = (select auth.uid()));

drop policy if exists agents_insert_admins on public.ai_agents;
create policy agents_insert_admins on public.ai_agents
  for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner','admin']) and created_by = (select auth.uid()));

drop policy if exists approvals_insert_members on public.approvals;
create policy approvals_insert_members on public.approvals
  for insert to authenticated
  with check (private.is_org_member(organization_id) and requested_by = (select auth.uid()));

drop policy if exists approvals_update_admins on public.approvals;
create policy approvals_update_admins on public.approvals
  for update to authenticated
  using (private.has_org_role(organization_id, array['owner','admin','manager']))
  with check (
    private.has_org_role(organization_id, array['owner','admin','manager'])
    and decided_by = (select auth.uid())
  );

drop policy if exists workflows_insert_admins on public.automation_workflows;
create policy workflows_insert_admins on public.automation_workflows
  for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner','admin']) and created_by = (select auth.uid()));

drop policy if exists conversations_insert_members on public.conversations;
create policy conversations_insert_members on public.conversations
  for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));

drop policy if exists messages_insert_members on public.messages;
create policy messages_insert_members on public.messages
  for insert to authenticated
  with check (
    private.is_org_member(organization_id)
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.organization_id = messages.organization_id
    )
    and (
      agent_id is null
      or exists (
        select 1 from public.ai_agents a
        where a.id = agent_id and a.organization_id = messages.organization_id
      )
    )
  );

drop policy if exists knowledge_insert_members on public.knowledge_documents;
create policy knowledge_insert_members on public.knowledge_documents
  for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));

drop policy if exists reports_insert_members on public.reports;
create policy reports_insert_members on public.reports
  for insert to authenticated
  with check (private.is_org_member(organization_id) and generated_by = (select auth.uid()));

drop policy if exists tasks_insert_members on public.tasks;
create policy tasks_insert_members on public.tasks
  for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));
