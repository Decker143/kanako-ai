# Phase 1 Test Readiness — 2026-11-24

**Roadmap source:** `docs/KANAKO_MASTER_ROADMAP.md`  
**Current phase:** Phase 1 — Virtual company structure  
**Current status:** Dev schema baseline, nine-department organization bootstrap, and database-level project-plan approval checks verified. Browser/server-action E2E and shared active-workspace verification remain outstanding.

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
- Verified inside the transaction: 9 departments, exactly 1 CEO Office, exactly 1 Kanako draft assigned to CEO Office, and exactly 1 owner membership for the synthetic user.
- The transaction was rolled back. A follow-up query confirmed no leftover test organization. The confirmed synthetic Dev Auth user remains.
- This validates database function behavior under the supplied authenticated claims. It is not a browser-level signup/onboarding E2E test.

## Project-plan approval and task creation checks

**Status: DATABASE-LEVEL CHECKS PASSED — controlled Dev transactions, rolled back**

Inspected the current feature-branch implementation in `app/actions.ts`:

- `createProjectPlan` validates owner/admin role, required title/objective/task list, normalizes priority, and stores a structured `project_plan` report with `pending_approval`.
- `approveProjectPlan` validates owner/admin role and workspace ownership of the plan, checks that the plan is pending and has tasks, and rejects unknown department names before claiming approval.
- Approval claim uses a conditional update from `pending_approval` to `processing`; this is the duplicate-approval guard.
- Task rows are created with `queued` status and plan metadata. Employee assignment/execution remains separate.
- Database RLS policies for reports and tasks were inspected. A controlled transaction ran as the synthetic `authenticated` user with the owner membership, exercising the insert/update paths and task creation.

Controlled Dev test results:

| Check | Result |
|---|---:|
| Initial approval claim | 1 row claimed |
| Second/duplicate approval claim | 0 rows claimed |
| Unknown department detection | 1 invalid department detected |
| Task creation from a valid two-task plan | 2 tasks created |
| Final plan status after successful test | `approved` |
| Department seed available to test workspace | 9 |

A separate one-task guard test also confirmed one initial claim, zero duplicate claims, one task created, and final `approved` status. All test transactions were rolled back. Follow-up checks confirmed no leftover test organizations or test reports.

**Important implementation risk found — not yet fixed:** approval claiming, task insertion, and final plan-status update are separate database requests in the server action, not one atomic database transaction. The conditional claim prevents a second approver from claiming the same pending plan, but an interruption after the claim can leave the plan in `processing`. The task-insert failure path marks the plan `failed`, but recovery/repair behavior is not yet proven. The final status update's returned error is not checked. Recommend a reviewed, atomic database function (or equivalent transaction boundary) before treating this workflow as production-ready. No code or schema change was made during this audit.

**Test scope limitation:** these were controlled database-level simulations of the server action's writes and RLS behavior. The actual Next.js server actions, redirects, browser form flow, concurrent HTTP requests, and failure-recovery behavior have not yet been exercised end-to-end.

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
6. Verify nine-department organization bootstrap and draft Kanako in CEO Office — **passed in a rolled-back Dev transaction**.
7. Verify project-plan approval guard, invalid department handling, task creation, and RLS write paths — **database-level checks passed in rolled-back Dev transactions**.
8. Review and harden approval/task creation atomicity and recovery — **identified; implementation not changed**.
9. Run actual authenticated Next.js/browser E2E tests for project-plan proposal, approval, duplicate concurrent approval, and failure recovery — **pending**.
10. Verify shared active-workspace context across the relevant app surfaces — **pending**.

## Safety

- Production remains read-only and unchanged.
- No Production rows were copied into Dev.
- No existing Dev fixture rows, test policies, grants, or reservation function were deleted or overwritten.
- All newly created test organization/report/task rows were rolled back; only the synthetic Dev Auth user remains.
- No Supabase project or branch was created; no paid resources were used.
- No Vercel environment variables, Preview deployment, Production deployment, or GitHub PR merge was changed.
- Do not run `db push`, reset, or replay the mismatched Production migration ledger.
