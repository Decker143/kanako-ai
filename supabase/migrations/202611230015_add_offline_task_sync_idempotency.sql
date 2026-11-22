create unique index if not exists tasks_offline_sync_id_unique
  on public.tasks (organization_id, (metadata ->> 'offline_client_id'))
  where metadata ? 'offline_client_id';
