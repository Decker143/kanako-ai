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
- Important: the generated SQL reference contains the 21 explicit routine `GRANT` statements but no `REVOKE` statements. Both projects' `public` default function privileges grant EXECUTE to `anon`, `authenticated`, and `service_role`, and PostgreSQL's built-in function default grants EXECUTE to `PUBLIC` unless revoked. The live Production ACLs show that most functions do **not** retain those defaults. A Dev candidate must explicitly `REVOKE ALL` from `PUBLIC` and the API roles as appropriate before applying the exact per-function grants. Preserve `PUBLIC` execution only for `public.set_updated_at()`. The schema-reference grant list alone is not sufficient to reproduce function security.

## Dev fixture RLS compatibility review

All seven Dev test policies are permissive and target `authenticated`. Their predicates were compared with the corresponding Production policy/helper logic:
- The Dev run-insert policy checks both creator identity and owner/admin membership; Production uses `private.has_org_role` plus the same creator check.
- The Dev run-select, agent-read, and task-read policies check organization membership directly; Production's `private.is_org_member` helper performs the same membership lookup.
- The Dev agent-update policy checks owner/admin membership; Production's `private.has_org_role` performs the same lookup.
- The Dev task-update policy checks organization membership; Production's task-update policy uses `private.is_org_member`.
- The Dev member-read policy only permits a user to see their own membership row; Production additionally permits organization members to see rows in their organization. The Dev predicate is therefore narrower.

No additional row access beyond the corresponding Production policy set was identified from these seven fixture policies. Preserve all seven unchanged. This is a static predicate comparison, not a substitute for authenticated E2E tests.

## Generated schema-reference cross-check

The schema-only reconstruction reference was cross-checked against live catalog totals:
- 21 `CREATE TABLE` statements.
- 115 `ADD CONSTRAINT` statements.
- 58 standalone indexes (53 ordinary plus 5 unique), alongside 23 indexes backing primary-key/unique constraints; 81 total live indexes.
- 21 RLS-enable statements and 72 `CREATE POLICY` statements.
- 8 function definitions and 10 trigger definitions.
- 78 table-grant statements and 21 routine EXECUTE-grant statements.
- One `CREATE SCHEMA private` statement.

This reference is a generated reconstruction aid, not a verified `pg_dump` replacement. It does not fully reproduce managed Supabase schemas/platform configuration. Schema ACLs and default privileges require the separate live-catalog review above.

## Security and grant review caution

Table privileges and RLS policies are separate layers. A grant allows a role to attempt a statement; RLS determines which rows are visible or writable. Do not blindly copy grants from the reference, disable RLS, or use the broad Dev fixture ACL as a template for newly added tables.

## Existing fixture-data compatibility gate

Read-only validation of the existing Dev rows found:
- The composite key intended for `organization_members(organization_id, user_id)` has no null key parts and no duplicate pairs, so the current two rows do not block that primary key.
- The existing status/role values in `ai_agents`, `tasks`, `agent_runs`, and `organization_members` are within the corresponding Production check-constraint value sets.
- Existing references from `tasks.assigned_agent_id` to `ai_agents`, `agent_runs.agent_id` to `ai_agents`, and `agent_runs.task_id` to `tasks` resolve.
- The fixture rows also contain references that cannot currently resolve: 2 `organization_members.organization_id`, 1 `ai_agents.organization_id`, 5 `tasks.organization_id`, and 2 `agent_runs.organization_id` values point to the not-yet-created `organizations` table; 1 `ai_agents.department_id` and 5 `tasks.department_id` values point to the not-yet-created `departments` table; and both `organization_members.user_id` values have no matching Dev Auth user (Dev currently has zero Auth users).
- The 12 `agent_runs` column definitions match Production exactly. In the other shared tables, three existing column defaults differ: `ai_agents.id` and `tasks.id` lack Production's `gen_random_uuid()` default, and `organization_members.role` lacks Production's `'member'` default.
- Three Production-required columns with no default are missing from populated fixture tables: `ai_agents.name`, `ai_agents.job_title`, and `tasks.title`. Adding them directly as `NOT NULL` would fail on the existing rows unless those rows are backfilled.

**Implication:** Do not add validated foreign keys to the existing fixture rows as-is; they would fail. A safe additive candidate must either use carefully reviewed `NOT VALID` foreign keys (which still enforce new inserts/updates but leave existing rows unvalidated) or obtain explicit approval for a synthetic fixture-data repair strategy. Do not silently rewrite fixture values or create Auth users. The required `name`, `job_title`, and `title` columns also need a deliberate compatibility treatment; adding them nullable is not exact Production parity, while backfilling changes fixture data. Keep this as an explicit pre-application decision gate.

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
