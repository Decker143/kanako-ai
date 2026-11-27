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
2. Capture and verify a complete Dev data snapshot for every non-empty application table, including stable IDs and foreign-key order. Keep Auth users outside the reset scope. A fresh read-only Dev catalog check on 2026-11-28 returned no rows in `storage.buckets`; do not assume a Dev Storage bucket exists. Recheck Storage immediately before any recovery window.
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


## 6. Reconstructed bootstrap dependency inventory — 2026-11-28

The live Dev catalog was queried read-only to identify what the missing bootstrap layer must provide. This is a reconstruction inventory, not recovered original migration SQL.

### Core objects that predate the tracked incremental migrations

The following application tables exist before the later tracked migrations add their own tables: `organizations`, `profiles`, `organization_members`, `departments`, `ai_agents`, `tasks`, `activity_logs`, `approvals`, `automation_workflows`, `workflow_runs`, `conversations`, `messages`, `knowledge_documents`, and `reports`.

The base layer also needs the `private` schema and its membership helpers:
- `private.is_org_member(uuid)` — SECURITY DEFINER, stable, empty search_path, checks the caller's membership row.
- `private.has_org_role(uuid,text[])` — SECURITY DEFINER, stable, empty search_path, checks the caller's membership role.
- `public.set_updated_at()` — trigger function used by nine `set_updated_at` triggers.
- `public.handle_new_user()` — SECURITY DEFINER trigger function used by `auth.on_auth_user_created` to create a profile from user metadata.
- `public.create_organization(text)` — SECURITY DEFINER, empty search_path, authenticated caller check, owner membership, nine departments including CEO Office, and a Draft Kanako CEO profile assigned to CEO Office.

Core public RLS is enabled and the live catalog shows organization-scoped policies across the core tables. A reconstruction must preserve policy expressions, grants, function ACLs, trigger bindings, check constraints, foreign keys, and indexes—not just create table columns.

### Objects added by tracked incremental migrations

| Repository migration | Objects/behavior added or changed |
|---|---|
| `202611230001_add_agent_execution_runs.sql` | `agent_runs`, indexes, RLS and member/admin policies; depends on core organization, agent, task, and private authorization objects |
| `202611230004_seed_kanako_ceo_draft.sql` | Replaces `create_organization(text)` with owner membership, eight default departments, and Draft Kanako seed; later CEO Office migrations extend this behavior |
| `202611230009`–`012` | Private AI-task review trigger function and task status trigger; successive versions tighten the review gate and deterministic latest-run selection |
| `202611230013_add_agent_learning_memory_system.sql` | `agent_learning_events`, `agent_memories`, RLS and grants |
| `202611230018_add_ai_employee_workforce_profiles.sql` | Adds employee skills, capacity, and availability fields/checks |
| `202611230019_add_capacity_aware_task_assignment.sql` and `020` | Adds task assignment function, then changes it to SECURITY INVOKER |
| `202611230022_add_task_progress_handoffs_and_blockers.sql` through `026` | Adds `task_updates`, AI actor attribution, workspace-scoped references, and atomic handoff approval |
| `20261123010049_add_virtual_office_commands.sql` | Adds `office_commands` and its RLS/indexes |
| `20261123030000_create_office_meetings_and_attendees.sql` | Adds `office_meetings` and `office_meeting_attendees` with RLS and indexes |
| `20261124140000_add_atomic_project_plan_approval.sql` | Adds `approve_project_plan(uuid,uuid)` |
| `20261124150000_make_offline_run_sync_atomic.sql` | Adds `sync_offline_agent_run(...) `; Dev's ledger version differs from this filename |
| `20261126173711_remove_dev_test_policies_validate_foreign_keys.sql` | Removes retired test policies and validates 14 Dev foreign keys |

### Unresolved Dev-only function provenance

The Dev database contains `public.reserve_agent_task_run(uuid,uuid,uuid,jsonb)`, associated with the missing `atomic_agent_run_reservation` ledger entry. Its current definition was inspected read-only: SECURITY INVOKER, empty search_path, authenticated-only execution, and checks for workspace authorization, employee readiness, model/task execution capability, task eligibility, and concurrency before creating a run and moving the task into progress.

No matching source migration or current source-code definition was found in either checked-in branch during this investigation. Its exact intended historical SQL and whether it is still required by the current application remain unproven. It must not be silently dropped or copied into a canonical baseline until its callers and behavior are mapped and regression-tested.

### Important rebuild limitations

- The four original bootstrap migration SQL files remain unrecoverable from the checked-in Git history. Any new bootstrap SQL must be explicitly labeled reconstructed.
- The tracked incremental migrations assume the core tables and private helper functions already exist. Running them against an empty database without a correct bootstrap will fail or create an incomplete schema.
- Dev currently permits NULL in `ai_agents.name`, `ai_agents.job_title`, and `tasks.title`; Production does not. The Dev rebuild must preserve the Dev nullability exactly and must not change Production.
- A fresh live Dev Storage catalog check returned zero buckets. The earlier plan's assumption that `kanako-workspace-files` exists in Dev is not supported by the current query.
- The available connected Supabase tools expose live database SQL but no free isolated Supabase scratch database. Creating a Supabase branch/project is excluded because it can incur hourly charges. No local PostgreSQL server, Docker, or SQL parser is available in the current execution environment.
- A no-cost alternative is available for the schema-replay portion: this repository is public, so a GitHub Actions hosted runner can run an ephemeral PostgreSQL service container without creating a Supabase branch/project. The CI harness must mock only the Supabase `auth` schema/roles needed by migrations, then apply the reconstructed baseline and run schema/permission/regression checks. This is a candidate rehearsal path, not yet implemented or verified.
- The CI rehearsal can prove clean schema replay, but it cannot by itself prove the real Dev data snapshot/restore. That remains a separate gate. Until both gates pass, a full reset/replay/restore has **not** been proven safe. Do not run a destructive Dev reset or migration-history rewrite.
