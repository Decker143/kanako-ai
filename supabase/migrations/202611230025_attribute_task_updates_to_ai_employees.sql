alter table public.task_updates
  add column if not exists actor_agent_id uuid references public.ai_agents(id) on delete set null;

alter table public.task_updates
  alter column actor_user_id drop not null;

alter table public.task_updates
  add constraint task_updates_actor_present_check
  check (actor_user_id is not null or actor_agent_id is not null);

create index if not exists task_updates_actor_agent_created_idx
  on public.task_updates (organization_id, actor_agent_id, created_at desc)
  where actor_agent_id is not null;
