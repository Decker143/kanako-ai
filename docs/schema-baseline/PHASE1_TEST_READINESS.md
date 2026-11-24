# Phase 1 Test Readiness — 2026-11-24

**Roadmap source:** `docs/KANAKO_MASTER_ROADMAP.md`  
**Current phase:** Phase 1 — Virtual company structure  
**Scope:** Static schema review and candidate preparation completed; no database writes.

## Nine-department organization-seed test

**Status: BLOCKED — Dev baseline not applied**

The canonical roadmap calls for verifying the nine-department migration and organization-creation function in a disposable test workspace or controlled test transaction.

The current Dev project `kanako-ai-dev-test` is not yet a complete application schema:
- Only 4 public tables exist: `organization_members`, `ai_agents`, `tasks`, and `agent_runs`.
- It is missing the Production `organizations` and `departments` tables required by `create_organization(text)`.
- The Dev Auth schema currently has 0 users, so there is no existing synthetic authenticated user context for a realistic `auth.uid()`-based organization-creation test.
- The four fixture tables, their rows, seven `test_*` policies, grants and Dev-only reservation function must be preserved.

## Static SQL review

- The first CEO Office migration inserts all nine departments in one multi-row `INSERT` and then uses `RETURNING id INTO ceo_department_id`. A multi-row INSERT can return multiple IDs, so assigning that result to a scalar variable is unsafe.
- The following exact-version migration removes that multi-row `RETURNING` usage and instead explicitly selects the newly created CEO Office department using `SELECT ... INTO STRICT` before inserting Kanako.
- The live Production function has the corrected explicit-selection pattern and seeds all nine departments, with Kanako in CEO Office as a draft.
- The generated schema reference was compared against the live catalog: all 206 columns, 115 constraints, 58 standalone indexes, 72 policy expressions, 8 function definitions, 10 trigger definitions, and grant entries matched.
- Static inspection is not an end-to-end test and must not be marked complete.

## Candidate and required approval

The additive candidate is prepared at `docs/schema-baseline/DEV_ADDITIVE_BASELINE_CANDIDATE.sql`. It is a one-shot review artifact and has not been applied.

It preserves existing fixture rows by:
- adding `ai_agents.name`, `ai_agents.job_title`, and `tasks.title` as nullable for now (Production requires NOT NULL, but the existing fixtures have no values and there are no defaults);
- adding 14 foreign keys on populated fixture tables as `NOT VALID`, so existing orphan references do not block reconstruction while new writes are still checked;
- preserving all seven Dev test policies, all four tables, their current grants, and the Dev-only reservation function;
- restoring Production's `auth.users.on_auth_user_created` trigger so a newly created Dev Auth user can receive its `public.profiles` row.

**Do not apply the candidate until the owner explicitly accepts these compatibility exceptions.** Exact Production NOT NULL/FK parity will require a separately approved fixture repair and later constraint validation.

## Required sequence

1. Static schema and security comparison — **completed**.
2. Prepare additive Dev baseline candidate — **completed; not applied**.
3. Obtain explicit approval for the three nullable columns and 14 `NOT VALID` foreign keys, then apply only to Dev.
4. Create a synthetic Dev Auth test identity only within an explicitly approved, controlled test process.
5. Run the organization-seed test and verify exactly nine departments plus a draft Kanako assigned to CEO Office.
6. Then continue with the roadmap's project-plan approval and task-creation tests.

## Safety

- Do not run the Production function or create test organizations in Production.
- Do not copy Production rows into Dev.
- Do not reset, truncate, drop, or replace the current Dev fixtures.
- Do not create a new Supabase project or branch for this test; Supabase branches may incur hourly charges and would violate the free-only guardrail unless separately confirmed as $0.
- Do not change Preview environment variables or redeploy as part of this test.
- Do not run `db push`, reset, or replay the mismatched Production migration ledger.
