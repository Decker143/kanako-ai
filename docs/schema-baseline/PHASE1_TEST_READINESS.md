# Phase 1 Test Readiness — 2026-11-24

**Roadmap source:** `docs/KANAKO_MASTER_ROADMAP.md`  
**Current phase:** Phase 1 — Virtual company structure  
**Current status:** Dev schema baseline and nine-department organization bootstrap have been verified. The next roadmap gate is the project-plan approval/task-creation E2E flow.

## Dev baseline application

**Status: APPLIED AND VERIFIED — Dev only**

The additive baseline candidate was applied successfully to `kanako-ai-dev-test` using migration history entry:

- Version: `20261124065345`
- Name: `dev_additive_schema_baseline_20261124`

Post-apply catalog verification returned:

| Catalog item | Dev result |
|---|---:|
| Public tables | 21 |
| Public columns | 206 |
| Public constraints | 115 |
| Public foreign keys | 59 |
| Existing-table foreign keys marked NOT VALID | 14 |
| Public indexes | 81 |
| Public RLS policies | 79 (72 Production policies + 7 preserved test policies) |
| Public triggers | 10 |
| Auth `auth.users` trigger | 1 |
| Public/private functions | 9 (8 restored + Dev-only reservation function) |
| Public tables without RLS | 0 |

Existing fixture row counts remain unchanged: 2 organization members, 1 AI agent, 5 tasks, and 2 agent runs. The Dev-only `reserve_agent_task_run(...)` function and all seven `test_*` policies remain present.

The first two application attempts failed before committing any schema changes. Post-failure checks confirmed the original four-table fixture schema and migration history were intact. The corrected candidate was then applied successfully. The successful migration is recorded once; do not rerun the one-shot candidate.

## Nine-department organization-seed test

**Status: PASSED — controlled Dev transaction, rolled back**

- Synthetic Dev Auth identity created manually by the owner and confirmed in `auth.users`: `kanako-phase1-test@example.com`.
- Email confirmation is present.
- The Dev-only `public.create_organization(text)` function was inspected before execution. It requires `auth.uid()`, creates the owner membership, seeds nine departments, and creates Kanako as a draft in CEO Office.
- A controlled transaction supplied the synthetic identity's JWT subject/claims and invoked the function.
- Verified results inside the transaction: 9 departments, exactly 1 CEO Office, exactly 1 Kanako draft assigned to CEO Office, and exactly 1 owner membership for the synthetic user.
- The transaction was rolled back. A follow-up query confirmed 0 leftover organizations named `KANAKO Phase 1 Controlled Test`; the confirmed synthetic Dev Auth user remains.
- This validates the database function's auth-claim and seed behavior. It is not yet a browser-level signup/onboarding E2E test.

## Compatibility exceptions intentionally retained

- `ai_agents.name`, `ai_agents.job_title`, and `tasks.title` remain nullable in Dev. Production requires these fields to be NOT NULL, but the existing fixture rows have no values and the columns have no defaults.
- Fourteen foreign keys on populated fixture tables are `NOT VALID`. Existing orphan references are preserved; new writes are still checked. Later fixture repair and constraint validation require a separate reviewed decision.
- Seven Dev `test_*` RLS policies remain alongside the 72 Production policies. They were explicitly preserved to avoid breaking the existing reservation/RLS test fixture. Supabase advisors report multiple permissive policies on the fixture tables because both policy sets coexist; do not remove either set without a separate review.
- The security advisor reports the same intended `public.create_organization(text)` SECURITY DEFINER exposure to `authenticated` as Production. Do not change its grants as part of this Dev baseline task.
- Performance advisor reports five unindexed foreign keys and 53 unused indexes. These findings are informational/expected on a newly reconstructed, lightly used Dev database; do not remove indexes or add indexes without workload review.

## Required sequence

1. Static schema and security comparison — **completed**.
2. Prepare additive Dev baseline candidate — **completed**.
3. Obtain owner approval for the three nullable columns and 14 `NOT VALID` foreign keys — **completed**.
4. Apply the reviewed candidate to Dev only — **completed and verified**.
5. Create a synthetic Dev Auth test identity — **completed by owner**.
6. Run the organization-seed test and verify nine departments plus a draft Kanako assigned to CEO Office — **passed in a rolled-back Dev transaction**.
7. End-to-end test project-plan proposal, approval, task creation, duplicate-approval protection, and invalid department handling — **next; not yet tested**.
8. Verify shared active-workspace context across the relevant app surfaces — **pending**.

## Safety

- Production remains read-only and unchanged.
- No Production rows were copied into Dev.
- No existing Dev fixture rows, test policies, grants, or reservation function were deleted or overwritten.
- No Supabase project or branch was created; no paid resources were used.
- No Vercel environment variables, Preview deployment, Production deployment, or GitHub PR merge was changed.
- Do not run `db push`, reset, or replay the mismatched Production migration ledger.
