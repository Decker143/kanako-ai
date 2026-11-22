create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('progress', 'note', 'blocker', 'handoff_requested', 'handoff_approved')),
  message text not null check (char_length(message) between 1 and 4000),
  progress_percent integer check (progress_percent between 0 and 100),
  target_agent_id uuid references public.ai_agents(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint task_updates_progress_event_check check (event_type = 'progress' or progress_percent is null),
  constraint task_updates_handoff_target_check check (event_type not in ('handoff_requested', 'handoff_approved') or target_agent_id is not null)
);
create index if not exists task_updates_org_task_created_idx
  on public.task_updates (organization_id, task_id, created_at desc);
alter table public.task_updates enable row level security;
grant select, insert on public.task_updates to authenticated;
create policy task_updates_select_members on public.task_updates
  for select to authenticated using (private.is_org_member(organization_id));
create policy task_updates_insert_members on public.task_updates
  for insert to authenticated with check (private.is_org_member(organization_id) and actor_user_id = (select auth.uid()));