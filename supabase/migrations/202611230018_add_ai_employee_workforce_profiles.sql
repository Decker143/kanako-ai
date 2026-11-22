alter table public.ai_agents
  add column if not exists skills text[] not null default '{}',
  add column if not exists max_concurrent_tasks integer not null default 2,
  add column if not exists availability_status text not null default 'available';

alter table public.ai_agents
  drop constraint if exists ai_agents_max_concurrent_tasks_check,
  add constraint ai_agents_max_concurrent_tasks_check
    check (max_concurrent_tasks between 1 and 20),
  drop constraint if exists ai_agents_availability_status_check,
  add constraint ai_agents_availability_status_check
    check (availability_status in ('available', 'busy', 'unavailable'));

comment on column public.ai_agents.skills is
  'Owner-maintained skill tags used as one signal for safe task assignment.';
comment on column public.ai_agents.max_concurrent_tasks is
  'Maximum number of non-terminal tasks assigned to this employee.';
comment on column public.ai_agents.availability_status is
  'Manual availability override used by CEO delegation; busy and unavailable employees are not assigned new work.';
