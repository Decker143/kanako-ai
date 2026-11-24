# Dev Fixture-to-Production Schema Difference — 2026-11-24

**Scope:** Read-only catalog comparison. No SQL changes applied.

## Exact shared-table column comparison

| Table | Dev columns | Production columns | Missing from Dev |
|---|---:|---:|---:|
| organization_members | 3 | 4 | 1 |
| ai_agents | 8 | 18 | 10 |
| tasks | 5 | 15 | 10 |
| agent_runs | 12 | 12 | 0 |
| **Total** | **28** | **49** | **21** |

### Missing columns

- `organization_members`: `created_at`
- `ai_agents`: `name`, `job_title`, `description`, `instructions`, `model_provider`, `configuration`, `created_by`, `created_at`, `updated_at`, `skills`
- `tasks`: `title`, `description`, `priority`, `assigned_user_id`, `created_by`, `due_at`, `completed_at`, `metadata`, `created_at`, `updated_at`
- `agent_runs`: no missing or extra columns.

## Existing Dev constraints and indexes

- Dev has exactly 3 public constraints, all primary keys:
  - `ai_agents_pkey`
  - `tasks_pkey`
  - `agent_runs_pkey`
- `organization_members` currently has **no primary key**, while Production has composite primary key `(organization_id, user_id)`.
- Dev has exactly 3 public indexes, all backing those primary keys.
- Dev has no foreign-key constraints in public. Production has 59 public foreign keys.
- Dev's seven policies are all named `test_*`; preserve them. They are not replacements for Production's 72 policies.
- Dev's one function is `public.reserve_agent_task_run(...)`, a test fixture function. Preserve it; it is not one of Production's eight public/private functions.
- Dev and Production currently have the same five installed extensions: `pg_stat_statements`, `supabase_vault`, `pgcrypto`, `plpgsql`, and `uuid-ossp`. Do not reinstall or alter extensions as part of the baseline.

## Correct authoritative constraint breakdown

A direct Production query against `pg_constraint` returned:
- 59 foreign keys
- 33 check constraints
- 21 primary keys
- 2 unique constraints
- **115 total public constraints**

The JSON metadata artifact's per-table `foreign_key_constraints` arrays sum to 98 entries and therefore must not be used as the authoritative FK count or dependency list. The live `pg_constraint` result and the SQL reference's 115 `ADD CONSTRAINT` statements are the authoritative sources for the constraint baseline. Rebuild the dependency graph from the 59 live FK definitions before ordering a migration.

## Migration-design implications

The Dev baseline cannot be made safe by merely creating the 17 missing tables:
1. The three reduced shared tables need 21 columns added with Production-compatible types/defaults/nullability.
2. `organization_members` needs its composite primary key reconciled.
3. The 59 Production foreign keys and remaining check/unique/primary constraints must be compared by exact definition before adding.
4. The 72 Production policies must be introduced without dropping the seven `test_*` policies. Check for name conflicts and policy permissiveness/roles before applying.
5. The eight Production functions must be compared against the existing Dev-only reservation function. Do not overwrite it.
6. The 10 Production triggers must be added only after their tables and referenced functions exist.
7. Existing extension installations already match; no extension work is needed.

**Do not apply this as an immediate migration.** Finish the FK graph, function/policy/grant review, and static SQL validation first. Keep Production untouched and preserve the current Dev fixtures.
