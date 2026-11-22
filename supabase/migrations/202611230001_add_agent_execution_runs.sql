create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_org_created_idx on public.agent_runs (organization_id, created_at desc);
create index if not exists agent_runs_agent_created_idx on public.agent_runs (agent_id, created_at desc);
create index if not exists agent_runs_task_idx on public.agent_runs (task_id);

alter table public.agent_runs enable row level security;

create policy agent_runs_select_members on public.agent_runs
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy agent_runs_insert_members on public.agent_runs
  for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));

create policy agent_runs_update_members on public.agent_runs
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy agent_runs_delete_admins on public.agent_runs
  for delete to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']));
