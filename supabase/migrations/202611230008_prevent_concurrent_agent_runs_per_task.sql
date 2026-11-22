create unique index if not exists agent_runs_one_running_per_task
  on public.agent_runs (organization_id, task_id)
  where status = 'running' and task_id is not null;
