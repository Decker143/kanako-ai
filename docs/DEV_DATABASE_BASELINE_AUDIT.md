# KANAKO AI — Production / Dev Database Baseline Audit

**Updated:** 2026-11-24  
**Roadmap:** Phase 1 — Virtual company structure  
**Scope:** Production catalog inspection, Dev baseline reconstruction, and post-apply verification.  
**Safety:** The approved schema baseline was applied to Dev only. Production schema/data, deployments, Vercel settings, and PR merge state were not changed.

## Executive status

**Status: Dev baseline applied and verified.**

- Production `kanako-ai` and Dev `kanako-ai-dev-test` are both `ACTIVE_HEALTHY`, PostgreSQL 17, Singapore region.
- Supabase organization remains on Free; Vercel remains Hobby. No paid project, branch, add-on, or integration was created.
- Dev now has the complete 21-table application schema reconstructed from the verified Production catalog while retaining its four existing fixture tables, fixture rows, seven `test_*` policies, existing grants, and Dev-only reservation function.
- The additive baseline was applied once to Dev as migration `20261124065345_dev_additive_schema_baseline_20261124`.
- Phase 1 E2E testing is still blocked on a separately approved synthetic Dev Auth identity. No Auth user or test organization has been created.
- Production remains unchanged.

## Project inventory

| Item | Production | Dev after baseline |
|---|---:|---:|
| Public tables | 21 | 21 |
| Public columns | 206 | 206 |
| Public constraints | 115 | 115 |
| Foreign keys | 59 | 59 |
| Public indexes | 81 | 81 |
| Production RLS policies | 72 | 72 |
| Total Dev policies | 72 | 79 (includes 7 preserved test policies) |
| Public triggers | 10 | 10 |
| Auth `auth.users` trigger | 1 | 1 |
| Public/private functions | 8 | 9 (includes Dev-only reservation function) |
| Public tables without RLS | 0 | 0 |

Production constraint breakdown: 59 foreign keys, 33 check constraints, 21 primary keys, and 2 unique constraints.

## Production catalog and application structure

Production project: `kanako-ai` (`fkxhsxrvngxhkxbuhbjn`).

- 21 public application tables, 206 columns, 115 constraints, 81 indexes, 72 RLS policies, 10 non-internal public triggers, and 8 functions across `public` and `private`.
- All 21 public tables have RLS enabled.
- The private schema contains authorization helpers used by RLS policies.
- `auth.users.on_auth_user_created` invokes `public.handle_new_user()` after an Auth user is inserted.
- `public.create_organization(text)` creates an organization, seeds the nine departments, and inserts Kanako as a Draft employee in CEO Office using the corrected explicit CEO Office lookup.
- Production contains existing user/workspace data. No Production rows were copied to Dev.

## Dev baseline application

Dev project: `kanako-ai-dev-test` (`pauzanqmxqhxczefabth`).

The reviewed one-shot candidate is:
`docs/schema-baseline/DEV_ADDITIVE_BASELINE_CANDIDATE.sql`

It is deliberately outside `supabase/migrations`; the successful Supabase migration tool application nevertheless recorded the following Dev migration-history entry:

- Version: `20261124065345`
- Name: `dev_additive_schema_baseline_20261124`

The successful candidate restored 17 missing tables, 21 missing columns, three shared-column defaults, 112 missing constraints, 58 standalone indexes, eight Production functions, ten public triggers, one Auth trigger, 72 Production policies, table grants, routine grants, and function revokes.

Two initial attempts failed before committing schema changes:
1. The candidate attempted to add a foreign key before the referenced `organizations` primary key. The candidate was corrected so all missing primary/unique keys are created before foreign keys.
2. PostgreSQL's special `PUBLIC` pseudo-role had been quoted as an ordinary role identifier. The candidate was corrected to use unquoted `PUBLIC`.

After each failed attempt, read-only verification confirmed rollback: Dev remained at four tables, 28 columns, three constraints, seven policies, no triggers, and the original fixture row counts. No failed attempt left a migration-history entry. The corrected candidate then applied successfully.

Post-apply verification confirmed:
- 21 public tables, 206 columns, 115 constraints, 59 foreign keys, 81 indexes.
- 14 foreign keys on populated fixture tables are intentionally `NOT VALID`.
- 79 policies: 72 Production policies plus the seven preserved Dev `test_*` policies.
- Ten public triggers plus the `auth.users` trigger.
- All 21 public tables have RLS enabled.
- Existing fixture counts unchanged: 2 `organization_members`, 1 `ai_agents`, 5 `tasks`, 2 `agent_runs`.
- Dev-only `public.reserve_agent_task_run(...)` remains.
- Dev has zero Auth users and zero departments/organizations seeded.

Do not rerun the candidate. It contains non-idempotent constraint, trigger, and policy creation statements.

## Compatibility exceptions and remaining fixture work

The following are deliberate and documented:

1. `ai_agents.name`, `ai_agents.job_title`, and `tasks.title` remain nullable in Dev. Production requires NOT NULL, but the existing fixture rows have no values and the columns have no defaults. Backfill and NOT NULL enforcement need a separate reviewed fixture-repair decision.
2. Fourteen foreign keys on populated fixture tables are `NOT VALID`. Existing orphan references are preserved; new inserts/updates are still checked. Repairing fixture references and validating these constraints must be planned separately.
3. Seven `test_*` policies remain alongside Production policies to preserve the existing reservation/RLS test fixture. Supabase performance advisors report multiple permissive policies on some fixture tables because both sets coexist. Do not remove these test policies without a separate review.

The Supabase security advisor reports `public.create_organization(text)` as a SECURITY DEFINER function executable by `authenticated`. This matches the reviewed Production grant and is intentional for the onboarding flow; do not change it as part of this baseline task.

The performance advisor reports five unindexed foreign keys and 53 unused indexes. These are informational findings on a newly reconstructed, lightly used Dev project. Do not remove indexes or add indexes without workload review.

## Migration-ledger mismatch

Production has 34 migration-history entries. The `feature/task-center-register` repository branch contains 30 SQL migration files:
- 3 exact name + version matches.
- 25 same descriptive migration names with different version prefixes.
- 6 Production entries without an exact same-name repository file: four early baseline migrations and two renamed migrations (`restrict_agent_run_mutations_to_admins`, `seed_kanako_ceo_draft_on_org_create`).

The Dev baseline was built from the verified live Production catalog, not by replaying the mismatched Production migration ledger. Do not run `supabase db push`, reset, or bulk replay/reconciliation until every Production history entry has an explicitly reviewed mapping.

The generated `production-schema-reference.sql` and `production-catalog.json` are reconstruction reference artifacts, not a byte-for-byte `pg_dump`. They were cross-checked against live catalog definitions, and schema ACL/default-privilege findings were reviewed separately.

## Vercel Preview safety

The inspected Vercel Preview deployment is:
`https://kanako-d2tkj6foo-vapepokemon143-8805.vercel.app`

It is READY on branch `feature/task-center-register`. Its Preview environment metadata points to the Production Supabase project, so do not use Preview for writes until its environment is safely isolated to the reconstructed Dev database. The Preview-only `KANAKO_AI_EXECUTION_ENABLED` value was set to false and read back as false; the current deployment was not redeployed. No Vercel environment change or deployment is part of this baseline application.

## Roadmap next steps

1. Obtain separate explicit approval before creating a synthetic Dev Auth identity.
2. In Dev only, test organization creation and verify exactly nine departments plus Draft Kanako assigned to CEO Office.
3. Test owner-authored project-plan proposal, approval, task creation, duplicate-approval protection, and invalid-department handling.
4. Verify shared active-workspace context, workforce readiness, workload, and task assignment.
5. Keep Production rollout, Preview environment changes, deployment, and PR merge as separate explicitly approved decisions.

## Guardrails

- Free plans only. No new project, Supabase branch, paid integration, AI model call, or billing change was needed.
- No Production schema/data/auth changes or data copies.
- No Dev fixture rows, test policies, grants, or reservation function were deleted or overwritten.
- No synthetic Auth identity or organization was created.
- No Vercel redeploy, Production deployment, GitHub PR merge, or migration-ledger replay occurred.
