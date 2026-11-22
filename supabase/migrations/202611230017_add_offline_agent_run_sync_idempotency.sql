create unique index if not exists agent_runs_offline_sync_id_unique
  on public.agent_runs (organization_id, (output ->> 'offline_client_id'))
  where output ? 'offline_client_id';
