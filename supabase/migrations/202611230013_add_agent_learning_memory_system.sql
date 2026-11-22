create table if not exists public.agent_learning_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  event_type text not null check (event_type in ('task_approved','revision_requested','task_failed','user_correction')),
  feedback text,
  lesson text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  memory_type text not null check (memory_type in ('procedure','preference','correction','task_pattern','domain_fact')),
  title text not null check (length(trim(title)) between 1 and 180),
  content text not null check (length(trim(content)) between 1 and 6000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','archived')),
  source_run_id uuid references public.agent_runs(id) on delete set null,
  confidence numeric(4,3) not null default 0.500 check (confidence >= 0 and confidence <= 1),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_learning_events_agent_created_idx
  on public.agent_learning_events (organization_id, agent_id, created_at desc);
create index if not exists agent_memories_approved_agent_idx
  on public.agent_memories (organization_id, agent_id, updated_at desc)
  where status = 'approved';

alter table public.agent_learning_events enable row level security;
alter table public.agent_memories enable row level security;

drop policy if exists agent_learning_events_select_members on public.agent_learning_events;
create policy agent_learning_events_select_members on public.agent_learning_events
  for select to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists agent_learning_events_insert_admins on public.agent_learning_events;
create policy agent_learning_events_insert_admins on public.agent_learning_events
  for insert to authenticated
  with check (
    private.has_org_role(organization_id, array['owner','admin']::text[])
    and created_by = (select auth.uid())
    and exists (select 1 from public.ai_agents a where a.id = agent_id and a.organization_id = organization_id)
  );

drop policy if exists agent_memories_select_members on public.agent_memories;
create policy agent_memories_select_members on public.agent_memories
  for select to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists agent_memories_insert_admins on public.agent_memories;
create policy agent_memories_insert_admins on public.agent_memories
  for insert to authenticated
  with check (
    private.has_org_role(organization_id, array['owner','admin']::text[])
    and created_by = (select auth.uid())
    and status = 'pending'
    and exists (select 1 from public.ai_agents a where a.id = agent_id and a.organization_id = organization_id)
  );

drop policy if exists agent_memories_update_admins on public.agent_memories;
create policy agent_memories_update_admins on public.agent_memories
  for update to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (
    private.has_org_role(organization_id, array['owner','admin'])
    and reviewed_by = (select auth.uid())
  );

revoke all on public.agent_learning_events from anon;
revoke all on public.agent_memories from anon;
grant select, insert on public.agent_learning_events to authenticated;
grant select, insert on public.agent_memories to authenticated;
grant update on public.agent_memories to authenticated;
