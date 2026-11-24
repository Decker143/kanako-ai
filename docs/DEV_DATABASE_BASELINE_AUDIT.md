# Development Database Baseline Audit

**Date:** 2026-11-24  
**Scope:** Read-only comparison of the linked Production and Dev Supabase projects, plus repository migration inventory.  
**Safety:** No database schema, data, authentication settings, or production resources were changed.

## Findings

### Production database

- Project: `kanako-ai` (`fkxhsxrvngxhkxbuhbjn`)
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17
- Public application tables: 21
- All inspected public application tables have Row Level Security enabled.
- Production migration history contains 34 entries, beginning with:
  - `20261122215735_initial_kanako_ai_platform`
  - `20261122215747_auth_profile_and_organization_bootstrap`
  - `20261122215807_seed_default_departments_on_org_create`
  - `20261122221903_tighten_function_execute_permissions`
- The inspected schema includes organization-scoped departments, AI employees, tasks, approvals, workflows, knowledge documents, reports, activity logs, agent runs, learning memory, task updates, and virtual-office meetings/commands.
- Inspected public functions include `create_organization`, `handle_new_user`, `set_updated_at`, `assign_task_to_agent`, and `approve_task_handoff`. A private review-gate trigger function is also attached to task updates.

### Repository migration inventory

The repository branch `feature/task-center-register` contains 30 SQL migration files under `supabase/migrations`. The four earliest migrations recorded by Production are not present in that directory:

1. `20261122215735_initial_kanako_ai_platform`
2. `20261122215747_auth_profile_and_organization_bootstrap`
3. `20261122215807_seed_default_departments_on_org_create`
4. `20261122221903_tighten_function_execute_permissions`

The migration inventory does **not** align one-to-one with Production history. A name/version comparison found 6 Production entries without an exact same-name repository file (the four baseline entries above plus two renamed later migrations), 25 entries whose descriptive migration name has a repository counterpart but whose version differs, and only 3 exact version matches. The six unmatched entries are `initial_kanako_ai_platform`, `auth_profile_and_organization_bootstrap`, `seed_default_departments_on_org_create`, `tighten_function_execute_permissions`, `restrict_agent_run_mutations_to_admins`, and `seed_kanako_ceo_draft_on_org_create`. The repository versions of the last two appear under different names (`restrict_agent_run_mutations` and `seed_kanako_ceo_draft`). For the other 25 name-matched entries, the Production migration version is not the same as the version prefix in the repository filename. Because Supabase migration tracking keys on version, matching purpose/name is not enough. A normal migration push could treat already-applied changes as pending. Do not run `db push`, replay, reset, or bulk migration reconciliation until every history entry has an explicitly reviewed mapping.

### Development database

- Project: `kanako-ai-dev-test` (`pauzanqmxqhxczefabth`)
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17
- Public tables: 4 fixture tables (`organization_members`, `ai_agents`, `tasks`, `agent_runs`)
- Dev has a purpose-built fixture schema for isolated reservation/RLS tests, not the full application schema.
- Dev fixture migration history contains four test migrations and is independent of Production's migration history.

## Risk and decision

**Do not replay the 30 later migrations into the current Dev fixture project as if they were a complete fresh-install sequence.** Their prerequisites include the missing baseline schema, functions, triggers, constraints, and RLS policies.

**Do not copy Production user/workspace records into Dev.** A test environment should use synthetic organization, user, employee, and task records.

No Production migration, data change, or deployment is authorized by this audit.

## Recommended recovery sequence

1. Obtain a trusted schema-only export from Production or recover the original SQL source for the four missing baseline migrations.
2. Produce a complete 34-entry migration ledger mapping each Production version to the intended repository file, including the two renamed migrations and all version-prefix differences.
3. Compare the exported schema with the live Production catalog: columns, defaults, constraints, indexes, triggers, function bodies, grants, extensions, and RLS policies.
4. Build a fresh, isolated full-schema Dev environment from a deliberately reconciled baseline/migration chain. Preserve the current four-table Dev fixture project until the replacement has passed validation; use synthetic data only.
5. Verify onboarding, department seeding, CEO assignment, project-plan approval, task lifecycle, handoff approval, AI review gates, organization isolation, and offline sync in Dev.
6. Keep Production unchanged until the owner separately authorizes any production rollout.

## Validation still outstanding

- Exact SQL source for the four missing baseline migrations.
- Full structural diff of every table, index, constraint, trigger, function body, grant, and RLS policy.
- Fresh-install replay of the complete migration chain in a clean Dev database.
- End-to-end application tests against that full Dev schema.


## Additional Production catalog inspection (read-only)

A second catalog pass inspected the live schema metadata without reading or exporting customer/workspace records.

- 21 public tables have RLS enabled.
- Catalog counts: 81 public indexes, 258 public constraints, 72 public RLS policies, 10 non-internal triggers, and 8 functions across the `public` and `private` schemas. The 258 count is the current direct `information_schema.table_constraints` result; an earlier 115 figure in this document was incorrect and is superseded.
- The schema has dependencies on Supabase Auth (including foreign keys to `auth.users`) and a private authorization helper schema.
- Private functions include `private.is_org_member(uuid)`, `private.has_org_role(uuid, text[])`, and the AI-task review-gate trigger function.
- Public trigger helpers include `public.set_updated_at()` and `public.handle_new_user()`; organization creation and task assignment/handoff functions also exist.
- The task completion trigger enforces explicit approval of AI-generated work before completion, and the private authorization helpers are referenced by RLS policies.

These counts and object definitions establish a useful inventory, but they are **not a complete schema export**. The connector does not expose a schema-dump action in its available Supabase tools. A single large catalog response exceeded the response limit, so it was not treated as a complete, lossless source for generating migration SQL.

## Current reconstruction decision

Do not generate or apply a purportedly exact baseline migration from partial/truncated catalog output. The safe next input is a trusted schema-only export (for example, a Supabase CLI `db dump --schema-only` made from the linked Production project) or the original four migration files. Once available, it can be compared against the catalog inventory and checked-in migrations. The existing Dev fixture remains unchanged and available for its current isolated tests.


## Trusted export path

Supabase's official CLI backup guidance documents `supabase db dump --db-url [CONNECTION_STRING] -f schema.sql` as the schema dump command (without the `--data-only` option). For this recovery, export **schema only**; do not export `data.sql`, and do not share the database password or full connection string in chat or commit it to GitHub.

The linked Production connection string is available in the Supabase Dashboard under **Connect**. Use it locally in a terminal after installing the Supabase CLI and Docker Desktop (the CLI runs `pg_dump` in a container, so a separate local PostgreSQL installation is not required for this dump). Run `supabase db dump --db-url "[CONNECTION_STRING]" -f kanako-production-schema.sql` after replacing the placeholder locally. Do not add `--data-only`; the default command exports schema, not table data. Keep the connection string private and do not paste it into chat or commit it to GitHub. The resulting schema file should be reviewed locally for secrets or environment-specific statements before it is uploaded to a private working location for analysis. This command only reads the source database; it does not apply migrations or change Production.

## Migration version reconciliation — confirmed counts

A direct comparison of the current Production migration history against the `feature/task-center-register` migration directory returned:

| Check | Count |
|---|---:|
| Production migration history entries | 34 |
| SQL files in repository directory | 30 |
| Exact name + version matches | 3 |
| Same descriptive migration name but different version | 25 |
| Production entries with no exact same-name file | 6 |

The 6 unmatched entries are the four baseline migrations listed above plus:
- Production `restrict_agent_run_mutations_to_admins` (repository file is named `restrict_agent_run_mutations`).
- Production `seed_kanako_ceo_draft_on_org_create` (repository file is named `seed_kanako_ceo_draft`).

The 25 version mismatches include the office-meetings migration (`20261123011207` in Production versus `20261123030000` in the repository) and 24 other name-matched migrations. The two CEO setup migrations and the virtual-office command migration are among the three exact version matches.

**Important:** this count supersedes any earlier shorthand that described the issue as only four missing baseline files plus one timestamp mismatch. The full mismatch is broader. Do not infer that matching migration descriptions means Supabase considers the versions already applied.

## Preview environment containment finding

The Vercel environment-variable metadata inspected during this audit showed that the Preview target is configured with the Production Supabase project URL/key, while `KANAKO_AI_EXECUTION_ENABLED` is enabled for Preview. This creates a risk that Preview writes can reach Production data and that Preview AI requests can execute. No database writes or environment changes were made during this audit.

Until Preview is isolated:
- Do not use Preview for task creation/editing, chat, approvals, workflow runs, or other write operations.
- Do not simply switch Preview to the current Dev project yet; its four-table fixture schema is incomplete for the app.
- The recommended containment is to disable Preview AI execution and then point Preview to a fully reconstructed, tested Dev database. Vercel environment changes require explicit owner approval.


## Dev catalog comparison — read-only verification

A fresh read-only catalog count on 2026-11-24 confirms the Dev project currently contains only 4 public tables, 7 public RLS policies, 3 public indexes, 22 public constraints, 0 non-internal triggers, and 1 function. All 4 public tables have RLS enabled. The 4 Dev migration-history entries are the isolated fixture/test migrations:

- `20261124024945_test_fixture_schema`
- `20261124025000_atomic_agent_run_reservation`
- `20261124025044_test_agent_update_policy`
- `20261124025054_test_agent_runs_select_policy`

The same read-only query returned the following Production counts: 21 public tables, 72 public RLS policies, 81 public indexes, 258 public constraints, 10 non-internal triggers, and 8 functions. This confirms the Dev project is not yet a usable full-schema app environment. The existing Dev fixture rows and tests were not modified.


## Repository-wide baseline recovery check

The migration directory was checked on all three available project branches: `main`, `feature/task-center-register`, and `feature/github-code-execution`. None contains the four missing Production baseline SQL files. A GitHub file-path commit-history check also returned no historical commits for those exact four paths. The GitHub-execution branch contains one additional migration, `202611240001_atomic_agent_run_reservation.sql`, but it is not part of the current Preview branch and does not recover the missing application baseline.

Therefore, the four baseline SQL files cannot be recovered from the currently inspected branches or their exact-path file history. A trusted schema-only export from Production (or a separately backed-up original source) remains necessary.

## Preview AI containment — owner-approved action

On 2026-11-24, the owner approved changing the Vercel environment variable `KANAKO_AI_EXECUTION_ENABLED` to `false` for the **Preview target only**. The variable was updated and then read back successfully with value `false` and target `preview`. Production and Development targets were not changed.

This is an environment-variable configuration update; it does not automatically modify an already-created deployment's bundled/runtime environment. A new Preview deployment may be required for the setting to take effect. No redeployment was triggered. Until a new deployment is explicitly approved and verified, continue treating the existing Preview deployment as potentially running with its previous environment value. Regardless, Preview still points to the Production Supabase project and must not be used for write operations.


## Cloud-side schema introspection — 2026-11-24

A read-only catalog introspection was successfully run against Production through the connected Supabase SQL tool. This removes the need for the owner to install the CLI/Docker merely to make the schema available for analysis. No rows from application tables were selected or exported.

The catalog inspection retrieved:
- All 21 public table/view definitions at the column-metadata level (206 columns total), including types, nullability, defaults, constraints, indexes, RLS policies, and trigger metadata.
- All 8 functions in the `public` and `private` schemas, including their definitions, argument/return signatures, language, security-definer flag, volatility, and function configuration.
- All 10 non-internal public triggers, including the task AI-review gate trigger and nine `set_updated_at` triggers.
- Public enum metadata (none were returned).

A read-only column comparison against Dev found 28 Dev columns versus 206 Production columns. Only 3 of the 21 Production tables exist in Dev with matching names plus `organization_members` (four shared tables total). Dev is missing the other 17 Production tables. The shared tables are incomplete:
- `ai_agents`: 8 Dev columns vs 18 Production columns; 10 Production columns missing.
- `tasks`: 5 Dev columns vs 15 Production columns; 10 Production columns missing.
- `organization_members`: 3 Dev columns vs 4 Production columns; `created_at` missing.
- `agent_runs`: 12 columns in both; column names match.
There are also three shared-column default mismatches: `ai_agents.id`, `tasks.id`, and `organization_members.role` have Production defaults that are absent in Dev. No extra Dev-only columns were found in the compared public tables.

Important scope note: this cloud-side introspection is a schema inventory, not yet a byte-for-byte `pg_dump` replacement. It does not by itself capture every database-level detail (for example all role grants/default privileges, extension-owned objects, auth/storage customizations, or exact migration file history). It is sufficient to continue a structured reconstruction and reconciliation without requiring the owner to install local tooling. Do not apply it to Dev until dependency order, complete DDL, permissions, RLS and fixture-preservation strategy have been reviewed.


### Foreign-key dependency inventory

The Production catalog contains 59 public-schema foreign-key constraints. The dependency graph includes the expected base objects (`organizations`, `organization_members`, `profiles`, `departments`, `ai_agents`, `tasks`, `agent_runs`) and downstream modules for learning/memory, approvals, workflows, conversations/messages, office meetings/commands, reports, and activity logs. Several constraints also reference Supabase-managed `auth.users`, so a Dev reconstruction must preserve the target project's Auth integration rather than attempting to recreate managed Auth tables.

A safe creation sequence should begin with organization/profile/department foundations, then agents and tasks, then agent runs and task updates, followed by learning/memory, approvals, workflow, conversations/messages, office modules, reports, and activity logs. Cyclic or mutually dependent constraints should be added after their base tables exist. This is a planning order only; no DDL has been applied.


## Follow-up reconstruction artifacts — 2026-11-24

A structured read-only Production catalog snapshot and reconstruction reference have now been saved on this audit branch:

- [Production catalog JSON](schema-baseline/production-catalog.json) — 21 public tables, 206 columns, 115 constraints, 81 total indexes, 72 policies, 10 triggers, 8 public/private functions, 546 table-grant entries, 21 routine-grant entries, extension inventory, and 34 migration-history records.
- [Production schema reference SQL](schema-baseline/production-schema-reference.sql) — generated table/constraint/function/trigger/RLS/index/grant definitions. This is a clean-baseline reference, not a verified `pg_dump` and not safe to execute as-is against the existing Dev fixtures.
- [Migration reconciliation ledger](schema-baseline/MIGRATION_RECONCILIATION.md) — maps 34 Production migration history entries against 30 repository SQL files: 3 exact version+name matches, 25 same descriptive names with version mismatch, 2 renamed candidates requiring semantic review, and 4 genuinely missing repository files.
- [Dev reconstruction plan](schema-baseline/DEV_RECONSTRUCTION_PLAN.md) — additive migration strategy that preserves the four existing Dev fixture tables and their seven test policies.

Correction to the earlier six-unmatched summary: two of those six now have renamed repository candidates (`restrict_agent_run_mutations` and `seed_kanako_ceo_draft`); they are not treated as absent, but their SQL must still be checked against the live Production definitions. Four Production migration names have no repository candidate: `initial_kanako_ai_platform`, `auth_profile_and_organization_bootstrap`, `seed_default_departments_on_org_create`, and `tighten_function_execute_permissions`.

The generated SQL reference includes 58 non-constraint indexes; the catalog's 81 total indexes include indexes backing constraints. The Dev project remains unchanged: 4 tables, 28 columns, 3 constraints, 3 indexes, 7 test policies, 0 triggers, and 1 function. No DDL or data writes were performed.
