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


## 5. Migration version mapping discovered

Production's recorded history provides the canonical historical version/name mapping for the 30 later migrations. The current repository uses different version prefixes for many of these files, so filename/version normalization is required before a clean replay or future Production release. Representative mappings confirmed from the two ledgers:

| Production ledger version | Production ledger name | Current repository file |
|---|---|---|
| 20261122222526 | add_agent_execution_runs | 202611230001_add_agent_execution_runs.sql |
| 20261122222741 | restrict_agent_run_mutations_to_admins | 202611230002_restrict_agent_run_mutations.sql |
| 20261122222753 | index_uncovered_foreign_keys | 202611230003_index_uncovered_foreign_keys.sql |
| 20261122222846 | seed_kanako_ceo_draft_on_org_create | 202611230004_seed_kanako_ceo_draft.sql |
| 20261122223014 | tighten_actor_and_relationship_rls | 202611230005_tighten_actor_and_relationship_rls.sql |
| 20261122223618 | restrict_workflow_run_mutations | 202611230006_restrict_workflow_run_mutations.sql |
| 20261122224005 | prevent_concurrent_workflow_runs | 202611230007_prevent_concurrent_workflow_runs.sql |
| 20261122224303 | prevent_concurrent_agent_runs_per_task | 202611230008_prevent_concurrent_agent_runs_per_task.sql |
| 20261122225058 | enforce_ai_task_review_gate | 202611230009_enforce_ai_task_review_gate.sql |
| 20261122225135 | require_approved_ai_review_for_completion | 202611230010_require_approved_ai_review_for_completion.sql |
| 20261122225327 | enforce_review_even_if_task_assignment_changes | 202611230011_enforce_review_even_if_task_assignment_changes.sql |
| 20261122225401 | deterministic_latest_ai_review_selection | 202611230012_deterministic_latest_ai_review_selection.sql |
| 20261122225643 | add_agent_learning_memory_system | 202611230013_add_agent_learning_memory_system.sql |
| 20261122225647 | qualify_agent_learning_rls_policies | 202611230014_qualify_agent_learning_rls_policies.sql |
| 20261122225928 | add_offline_task_sync_idempotency | 202611230015_add_offline_task_sync_idempotency.sql |
| 20261122230103 | index_agent_learning_foreign_keys | 202611230016_index_agent_learning_foreign_keys.sql |
| 20261122230236 | add_offline_agent_run_sync_idempotency | 202611230017_add_offline_agent_run_sync_idempotency.sql |
| 20261122231734 | add_ceo_office_department_and_assign_kanako | 20261122231734_add_ceo_office_department_and_assign_kanako.sql |
| 20261122231748 | fix_ceo_department_seed_function | 20261122231748_fix_ceo_department_seed_function.sql |
| 20261122233409 | 202611230018_add_ai_employee_workforce_profiles | 202611230018_add_ai_employee_workforce_profiles.sql |
| 20261122233411 | 202611230019_add_capacity_aware_task_assignment | 202611230019_add_capacity_aware_task_assignment.sql |
| 20261122233448 | 202611230020_run_capacity_assignment_as_invoker | 202611230020_run_capacity_assignment_as_invoker.sql |
| 20261122234234 | 202611230021_allow_admin_project_plan_review | 202611230021_allow_admin_project_plan_review.sql |
| 20261122234525 | 202611230022_add_task_progress_handoffs_and_blockers | 202611230022_add_task_progress_handoffs_and_blockers.sql |
| 20261122234625 | 202611230023_make_handoff_approval_atomic | 202611230023_make_handoff_approval_atomic.sql |
| 20261122234647 | 202611230024_restrict_task_update_api_grants | 202611230024_restrict_task_update_api_grants.sql |
| 20261122235021 | 202611230025_attribute_task_updates_to_ai_employees | 202611230025_attribute_task_updates_to_ai_employees.sql |
| 20261122235056 | 202611230026_scope_task_update_references_to_workspace | 202611230026_scope_task_update_references_to_workspace.sql |
| 20261123010049 | add_virtual_office_commands | 20261123010049_add_virtual_office_commands.sql |
| 20261123011207 | create_office_meetings_and_attendees | 20261123030000_create_office_meetings_and_attendees.sql |

This mapping is evidence from the Production ledger and current repository filenames, not proof that every file's contents are identical to the historical SQL that was applied. Each mapping must be checked against object definitions before any filename/history reconciliation. The four bootstrap migrations are still absent and their exact original SQL has not been recovered.
