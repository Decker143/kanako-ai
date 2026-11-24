# Phase 1 Test Readiness — 2026-11-24

**Roadmap source:** `docs/KANAKO_MASTER_ROADMAP.md`  
**Current phase:** Phase 1 — Virtual company structure  
**Scope:** Read-only readiness check; no database writes.

## Nine-department organization-seed test

**Status: BLOCKED — test environment is not yet suitable.**

The canonical roadmap calls for verifying the nine-department migration and organization-creation function in a disposable test workspace or controlled test transaction.

The current Dev project `kanako-ai-dev-test` is not a complete application schema:
- Only 4 public tables exist: `organization_members`, `ai_agents`, `tasks`, and `agent_runs`.
- It is missing the Production `organizations` and `departments` tables required by `create_organization(text)`.
- The Dev Auth schema currently has 0 users, so there is no existing synthetic authenticated user context for a realistic `auth.uid()`-based organization-creation test.
- The four fixture tables and seven `test_*` policies are intentional test assets and must be preserved.

Static SQL review:
- The first CEO Office migration contains a multi-row `INSERT ... RETURNING id INTO scalar_variable` pattern.
- The following exact-version migration corrects it by selecting the CEO Office row explicitly with `SELECT ... INTO STRICT`.
- The live Production function has the corrected explicit-selection pattern and seeds all nine departments, with Kanako in CEO Office as a draft.
- Static inspection is not an end-to-end test and must not be marked complete.

## Required sequence

1. Finish the read-only schema and migration semantic review.
2. Prepare an additive Dev baseline that preserves all four fixture tables and seven test policies.
3. Validate the candidate on Dev without Production data.
4. Create a synthetic Dev Auth test identity only within an explicitly approved, controlled test process.
5. Run the organization-seed test and verify exactly nine departments plus a draft Kanako assigned to CEO Office.
6. Then continue with the roadmap's project-plan approval and task-creation tests.

## Safety

- Do not run the Production function or create test organizations in Production.
- Do not copy Production rows into Dev.
- Do not reset, truncate, drop, or replace the current Dev fixtures.
- Do not create a new Supabase project or branch for this test; Supabase branches may incur hourly charges and would violate the free-only guardrail unless separately confirmed as $0.
- Do not change Preview environment variables or redeploy as part of this test.
