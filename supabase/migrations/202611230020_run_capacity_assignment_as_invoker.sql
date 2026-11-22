alter function public.assign_task_to_agent(uuid, uuid, uuid, text) security invoker;

comment on function public.assign_task_to_agent(uuid, uuid, uuid, text) is
  'Atomically assigns a queued/blocked task to an eligible AI employee after checking workspace authorization, availability, capability, and concurrent workload. Runs with caller privileges and is additionally constrained by row-level security.';
