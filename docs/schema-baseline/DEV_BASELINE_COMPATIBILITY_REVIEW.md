# Dev Baseline Compatibility Review — 2026-11-24

**Review type:** Static/read-only. No database changes.

## Confirmed safe-to-preserve Dev fixtures

- Seven Dev policies all use the `test_*` prefix. None of their names collide with the 72 Production policy names.
- Dev's `public.reserve_agent_task_run(uuid, uuid, uuid, jsonb)` function is Dev-only and is not one of the eight Production functions. Preserve it; do not overwrite or drop it.
- The five installed extensions match between Production and Dev: `pg_stat_statements`, `supabase_vault`, `pgcrypto`, `plpgsql`, and `uuid-ossp`. No extension installation is needed.
- Dev's three current indexes back its three primary keys. No additional Dev-only standalone index was found.
- Dev's three constraints are the primary keys on `ai_agents`, `tasks`, and `agent_runs`. `organization_members` has no primary key, unlike Production's composite primary key.

## Live foreign-key and constraint verification

- Production has exactly 59 public foreign keys with 59 distinct constraint names: 39 point to other public tables and 20 point to `auth.users`.
- Production's 115 public constraints break down to 59 foreign keys, 33 checks, 21 primary keys and 2 unique constraints.
- The full FK rows were read from live `pg_constraint`; do not use the misleading 98-entry foreign-key sum in the JSON metadata artifact.
- All 21 Production public tables have RLS enabled. Production has 72 permissive policies across all 21 tables and no restrictive policies. Dev has seven test policies across its four fixture tables.

## Exact privilege and schema findings

- Production grants the same seven table privileges (DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) to `authenticated`, `postgres`, and `service_role` on all 21 public tables.
- Production grants those same seven privileges to `anon` on 15 public tables. The six tables without an `anon` grant are `agent_learning_events`, `agent_memories`, `office_commands`, `office_meeting_attendees`, `office_meetings`, and `task_updates`.
- Dev currently grants all seven privileges to `anon`, `authenticated`, `postgres`, and `service_role` on all four fixture tables. Preserve those fixture grants as-is; do not use them as a template for newly added tables.
- The `public` schema ACL is the same in Production and Dev. Production additionally has a `private` schema with ACL `postgres=UC, authenticated=U`; Dev currently has no `private` schema.
- The catalog query of default privileges returned matching entries for the inspected managed schemas in both projects. Do not replace or normalize managed-schema default ACLs.
- The Production routine inventory includes eight functions in `public`/`private`. The two private SECURITY DEFINER helper functions are executable by `authenticated`, not `anon`; the private trigger function is not executable by API roles. `create_organization(text)` is SECURITY DEFINER, has an empty search_path, and is executable by `authenticated` and `service_role`, not `anon`. `handle_new_user()` is executable by `service_role` only. `set_updated_at()` is not SECURITY DEFINER and retains PUBLIC execution. These grants and function attributes must be recreated exactly, not broadened.

## Security and grant review caution

Table privileges and RLS policies are separate layers. A grant allows a role to attempt a statement; RLS determines which rows are visible or writable. Do not blindly copy grants from the reference, disable RLS, or use the broad Dev fixture ACL as a template for newly added tables.

## Migration candidate gate

A candidate SQL migration is **not yet ready to apply**. Outstanding static checks:
1. Verify all 115 constraint definitions against the live schema reference and ensure no duplicate or conflicting names.
2. Confirm all 21 table definitions and 206 columns, including defaults, nullability, identity/generated behavior and data types.
3. Compare all 72 RLS policies by expression, command, role and permissive/restrictive mode against the generated SQL reference.
4. Compare all eight function definitions, owners, SECURITY DEFINER/search_path settings, and exact routine EXECUTE grants.
5. Confirm all 10 triggers and their referenced functions.
6. Recreate the `private` schema and its narrowly scoped ACL only after its full object inventory and function dependencies are reviewed.
7. Check the additive DDL against existing Dev fixture data; preserve all four tables, seven test policies, fixture grants, and the Dev-only reservation function.

## Decision

Continue with static review and migration candidate preparation on the documentation/audit branch. Do not apply SQL to Dev yet. Production remains read-only. No Supabase branch, paid feature, deployment or merge is required for this review.
