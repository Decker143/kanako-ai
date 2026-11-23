create table if not exists public.office_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  command text not null check (command in ('call_to_meeting','return_to_workstation')),
  destination text not null check (destination in ('collaboration_hub','workstation')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists office_commands_org_created_idx on public.office_commands (organization_id, created_at desc);
create index if not exists office_commands_agent_active_idx on public.office_commands (agent_id, created_at desc) where status in ('pending','in_progress');
create unique index if not exists office_commands_one_active_per_agent
  on public.office_commands (agent_id) where status in ('pending','in_progress');
alter table public.office_commands enable row level security;
revoke all on public.office_commands from anon;
grant select, insert, update on public.office_commands to authenticated;
create policy office_commands_select_members on public.office_commands
  for select to authenticated using (private.is_org_member(organization_id));
create policy office_commands_insert_admins on public.office_commands
  for insert to authenticated with check (
    private.has_org_role(organization_id, array['owner','admin']::text[])
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.ai_agents a
      where a.id = agent_id and a.organization_id = office_commands.organization_id
    )
  );
create policy office_commands_update_admins on public.office_commands
  for update to authenticated using (private.has_org_role(organization_id, array['owner','admin']::text[]))
  with check (private.has_org_role(organization_id, array['owner','admin']::text[]));
