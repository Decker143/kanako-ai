# Dev Baseline Compatibility Review — 2026-11-24

**Review type:** Static/read-only. No database changes.

## Confirmed safe-to-preserve Dev fixtures

- Seven Dev policies all use the `test_*` prefix. None of their names collide with the 72 Production policy names in the schema reference.
- Dev's `public.reserve_agent_task_run(uuid, uuid, uuid, jsonb)` function is Dev-only and is not one of the eight Production functions. Preserve it; do not overwrite or drop it.
- The five installed extensions match between Production and Dev: `pg_stat_statements`, `supabase_vault`, `pgcrypto`, `plpgsql`, and `uuid-ossp`. No extension installation is needed.
- Dev's three current indexes back its three primary keys. No additional Dev-only standalone index was found.
- Dev's three constraints are the primary keys on `ai_agents`, `tasks`, and `agent_runs`. `organization_members` has no primary key, unlike Production's composite primary key.

## Security and grant review caution

The generated Production schema reference contains table grants as well as RLS policies. Do not blindly copy grants from the reference:
- Table privileges and RLS policies are separate layers.
- A grant can allow a role to attempt a statement while RLS still filters or rejects rows.
- The Dev fixture currently has broad table-level privileges for roles including `anon` and `authenticated`, with its `test_*` RLS policies acting as row-level controls.
- Before finalizing the migration, compare exact Production and Dev table ACLs and routine EXECUTE grants, and verify the RLS policy set. Do not loosen grants or disable RLS.

## Migration candidate gate

A candidate SQL migration is **not yet ready to apply**. Outstanding static checks:
1. Rebuild the complete foreign-key dependency list from live `pg_constraint`; do not use the 98-entry FK sum in the JSON metadata artifact (live Production reports 59 public FKs).
2. Verify all 115 constraint definitions and ensure no duplicate or conflicting names.
3. Confirm all 21 table definitions, 206 column definitions, defaults, nullability and identity/generated behavior against live catalog data.
4. Compare all 72 policies by expression, command, role and permissive/restrictive mode.
5. Compare all 8 function definitions and routine EXECUTE grants.
6. Confirm all 10 triggers and their referenced functions.
7. Compare exact table ACLs, schema ACLs and default privileges.
8. Check the additive DDL against the existing Dev fixture data and preserve all seven test policies and the Dev-only reservation function.

## Decision

Continue with static review and migration candidate preparation on the documentation/audit branch. Do not apply SQL to Dev yet. Production remains read-only. No Supabase branch, new project, paid feature, deployment or merge is required for this review.
