-- Prevent two simultaneous executions of the same workflow.
create unique index if not exists workflow_runs_one_running_per_workflow
on public.workflow_runs (organization_id, workflow_id)
where status = 'running';
