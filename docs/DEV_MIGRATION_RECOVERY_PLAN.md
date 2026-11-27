# Dev Migration Recovery Plan

**Status:** Preparation only — NOT YET CLEARED FOR EXECUTION  
**Target:** Supabase Dev project `kanako-ai-dev-test` (`pauzanqmxqhxczefabth`)  
**Roadmap alignment:** Phase 1 — database correctness, migration reproducibility, and controlled workspace verification  
**Production:** Explicitly excluded; no Production schema, data, migration history, Auth, or deployment changes.

## 1. Confirmed root cause

- The checked-in feature branch contains 33 SQL migration files, but Dev's migration ledger contains only seven records.
- Five Dev ledger records have no corresponding SQL files in either checked-in Git branch: `test_fixture_schema`, `atomic_agent_run_reservation`, `test_agent_update_policy`, `test_agent_runs_select_policy`, and `dev_additive_schema_baseline_20261124`.
- Dev records `make_offline_run_sync_atomic` as version `20261124152148`, while the checked-in file is version `20261124150000`.
- Production's migration ledger records four earlier bootstrap migrations absent from the repository:
  - `20261122215735 initial_kanako_ai_platform`
  - `20261122215747 auth_profile_and_organization_bootstrap`
  - `20261122215807 seed_default_departments_on_org_create`
  - `20261122221903 tighten_function_execute_permissions`
- The 30 later Production ledger entries correspond broadly to the 30 pre-Phase-1 repository migrations, but their recorded versions/names are not identical. The feature branch adds three further migration files.
- Therefore the missing Dev entries are not the only issue: the repository also lacks the original base/bootstrap SQL needed to build the application schema from an empty database.

## 2. Current Dev schema inventory

Read-only catalog inventory on 2026-11-28:
- 21 public tables
- 115 constraints
- 81 indexes
- 72 RLS policies
- 10 non-internal public triggers
- 11 public/private functions
- 9 AI employee profiles, all Draft; 0 active; 0 configured models; 0 agent runs
- The legitimate Phase 1 workspace has 9 departments, 9 draft employee profiles, 2 queued Phase 1 tasks, and one owner membership. Existing legitimate activity/report/task-update records must also be included in the data snapshot if non-empty.

Dev and Production previously compared equal for public constraints, indexes, policies, triggers, and most columns, but differ in three nullability rules: Production requires `ai_agents.name`, `ai_agents.job_title`, and `tasks.title`; Dev currently permits NULL. Recovery must preserve the intentional Dev shape and must never weaken Production.

## 3. Recovery design

1. Freeze Dev writes during the recovery window; do not change Production.
2. Capture and verify a complete Dev data snapshot for every non-empty application table, including stable IDs and foreign-key order. Keep Auth users and the Storage bucket `kanako-workspace-files` outside the reset scope.
3. Reconstruct a canonical bootstrap migration from the live Dev catalog: table/column definitions, constraints, indexes, RLS policies, triggers, functions, grants, and required schemas. Recover the four Production bootstrap intentions from catalog evidence where possible; clearly label any SQL that is reconstructed rather than original.
4. Add explicit historical compatibility migrations for retired test-only fixture/policy entries only where the resulting clean-install end state is proven identical. Do not invent the original historical SQL or silently label reconstructed SQL as original.
5. Resolve the offline-sync migration version mismatch and map each repository migration to its resulting schema objects. Establish one canonical ordered migration ledger and avoid duplicate application.
6. Rehearse the complete reset/replay/restore in a transaction on Dev and roll it back. Validate object counts/fingerprints, workspace rows, foreign keys, RLS policy behavior, trigger/function definitions, and Phase 1 regression checks. A no-cost isolated rehearsal is preferred; paid Supabase branches/projects are prohibited by the free-plan requirement.
7. Only after the rehearsal is verified, perform the approved Dev-only rebuild and restore. Keep the existing Dev Auth identities and Storage bucket untouched.
8. Verify that a fresh replay from the repository produces the expected Dev schema and that the Dev migration ledger exactly matches the canonical files. Run CI and Phase 1 regression checks.
9. Stop if any object, row, Auth reference, Storage dependency, migration behavior, or cost/permission impact is ambiguous. Do not substitute Production as a test environment.

## 4. Execution gates

- The user's approval is limited to a Dev-only rebuild after this plan is prepared and verified.
- This document is not itself authorization to run a destructive reset before the rehearsal passes.
- No Production migration, schema/data change, deployment, branch merge, billing change, paid service, model-provider activation, or AI execution is authorized.
- If a free-plan-compliant rehearsal cannot prove a safe rollback and restore, stop and report the blocker rather than risking the Dev workspace.
