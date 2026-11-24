# Dev schema reconstruction plan

Updated 2026-11-24 after applying and verifying the additive Dev baseline.

## Current state

| Catalog item | Production | Dev after baseline |
|---|---:|---:|
| Public tables | 21 | 21 |
| Public columns | 206 | 206 |
| Public constraints | 115 | 115 |
| Public foreign keys | 59 | 59 |
| Foreign keys marked NOT VALID in Dev | 0 | 14 |
| Public indexes | 81 | 81 |
| RLS policies | 72 | 79 (72 Production + 7 preserved tests) |
| Non-internal public triggers | 10 | 10 |
| Auth users trigger | 1 | 1 |
| Public/private functions | 8 | 9 (8 Production + Dev-only reservation function) |

Dev project: `kanako-ai-dev-test` (`pauzanqmxqhxczefabth`), Supabase Free, PostgreSQL 17.

## Applied baseline

The one-shot candidate `docs/schema-baseline/DEV_ADDITIVE_BASELINE_CANDIDATE.sql` was applied once to Dev. Supabase migration history records:

- Version: `20261124065345`
- Name: `dev_additive_schema_baseline_20261124`

The successful application was followed by read-only catalog verification. All 21 public tables have RLS enabled. The 17 missing tables, 21 missing columns, 112 missing constraints, 58 standalone indexes, eight Production functions, ten public triggers, one Auth trigger, 72 Production policies, and exact table/routine grants are now present.

The candidate was corrected before successful application to create all 20 missing primary/unique keys before foreign keys, and to use PostgreSQL's unquoted `PUBLIC` pseudo-role in routine ACL statements. Two earlier attempts failed and rolled back completely; no partial objects or migration-history entries remained from those attempts.

## Preserved Dev fixtures and compatibility exceptions

- Existing four fixture tables and their rows remain: `organization_members` (2), `ai_agents` (1), `tasks` (5), and `agent_runs` (2).
- Seven `test_*` RLS policies, existing grants, and Dev-only `public.reserve_agent_task_run(...)` remain.
- Fourteen foreign keys on populated fixture tables are `NOT VALID` to preserve existing orphan references while enforcing new writes.
- `ai_agents.name`, `ai_agents.job_title`, and `tasks.title` remain nullable until a separately reviewed fixture repair can safely populate them.
- Dev has zero Auth users. The Phase 1 E2E test needs a synthetic Dev Auth identity, which has not been created and requires separate explicit approval.

## Remaining roadmap work

1. Obtain separate approval for a synthetic Dev Auth identity.
2. Create only synthetic Dev test data and verify organization creation seeds exactly nine departments and draft Kanako in CEO Office.
3. E2E test the owner-authored project-plan proposal, approval, task creation, duplicate-approval protection, and invalid-department handling.
4. Verify shared active-workspace context, workforce readiness, workload, and task assignment.
5. Keep all Production changes, deployment, and PR merge decisions separate and explicitly approved.

## Migration ledger caution

The Production migration ledger and repository migration versions/names do not fully align. The Dev baseline is based on the verified final live Production catalog, not a replay of the Production migration chain. Do not run `supabase db push`, reset, or bulk replay/reconciliation until every history entry has an explicitly reviewed mapping.

## Free-plan and production guardrails

- Supabase organization remains on the Free plan; Vercel remains Hobby.
- No new project, Supabase branch, paid integration, model call, or billing change was needed.
- Production database remains unchanged; no Production data was copied.
- No Vercel environment, Preview deployment, Production deployment, or GitHub PR merge was changed.
