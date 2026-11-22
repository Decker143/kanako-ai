create index if not exists agent_learning_events_agent_fk_idx on public.agent_learning_events(agent_id);
create index if not exists agent_learning_events_run_fk_idx on public.agent_learning_events(agent_run_id);
create index if not exists agent_learning_events_created_by_fk_idx on public.agent_learning_events(created_by);
create index if not exists agent_learning_events_task_fk_idx on public.agent_learning_events(task_id);
create index if not exists agent_memories_agent_fk_idx on public.agent_memories(agent_id);
create index if not exists agent_memories_created_by_fk_idx on public.agent_memories(created_by);
create index if not exists agent_memories_reviewed_by_fk_idx on public.agent_memories(reviewed_by);
create index if not exists agent_memories_source_run_fk_idx on public.agent_memories(source_run_id);
