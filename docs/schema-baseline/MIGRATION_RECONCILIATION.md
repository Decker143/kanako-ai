# Production-to-repository migration reconciliation

Generated 2026-11-24 from the live Production migration history and the `feature/task-center-register` migration directory.

**Safety:** This is a read-only mapping inventory. It does not execute, replay, rename, delete, or apply migrations.

- Production history entries: 34
- Repository SQL migration files: 30
- Mapping counts: 3 exact version+name matches, 25 same descriptive name with version mismatch, 2 renamed candidates requiring SQL semantic review, and 4 genuinely missing repository files.

| Production version | Production migration name | Candidate repository file | Match status |
|---|---|---|---|
| `20261122215735` | `initial_kanako_ai_platform` | — | `missing_repo_file` |
| `20261122215747` | `auth_profile_and_organization_bootstrap` | — | `missing_repo_file` |
| `20261122215807` | `seed_default_departments_on_org_create` | — | `missing_repo_file` |
| `20261122221903` | `tighten_function_execute_permissions` | — | `missing_repo_file` |
| `20261122222526` | `add_agent_execution_runs` | `202611230001_add_agent_execution_runs.sql` | `same_name_different_version` |
| `20261122222741` | `restrict_agent_run_mutations_to_admins` | `202611230002_restrict_agent_run_mutations.sql` | `renamed_candidate_semantics_unverified` |
| `20261122222753` | `index_uncovered_foreign_keys` | `202611230003_index_uncovered_foreign_keys.sql` | `same_name_different_version` |
| `20261122222846` | `seed_kanako_ceo_draft_on_org_create` | `202611230004_seed_kanako_ceo_draft.sql` | `renamed_candidate_semantics_unverified` |
| `20261122223014` | `tighten_actor_and_relationship_rls` | `202611230005_tighten_actor_and_relationship_rls.sql` | `same_name_different_version` |
| `20261122223618` | `restrict_workflow_run_mutations` | `202611230006_restrict_workflow_run_mutations.sql` | `same_name_different_version` |
| `20261122224005` | `prevent_concurrent_workflow_runs` | `202611230007_prevent_concurrent_workflow_runs.sql` | `same_name_different_version` |
| `20261122224303` | `prevent_concurrent_agent_runs_per_task` | `202611230008_prevent_concurrent_agent_runs_per_task.sql` | `same_name_different_version` |
| `20261122225058` | `enforce_ai_task_review_gate` | `202611230009_enforce_ai_task_review_gate.sql` | `same_name_different_version` |
| `20261122225135` | `require_approved_ai_review_for_completion` | `202611230010_require_approved_ai_review_for_completion.sql` | `same_name_different_version` |
| `20261122225327` | `enforce_review_even_if_task_assignment_changes` | `202611230011_enforce_review_even_if_task_assignment_changes.sql` | `same_name_different_version` |
| `20261122225401` | `deterministic_latest_ai_review_selection` | `202611230012_deterministic_latest_ai_review_selection.sql` | `same_name_different_version` |
| `20261122225643` | `add_agent_learning_memory_system` | `202611230013_add_agent_learning_memory_system.sql` | `same_name_different_version` |
| `20261122225647` | `qualify_agent_learning_rls_policies` | `202611230014_qualify_agent_learning_rls_policies.sql` | `same_name_different_version` |
| `20261122225928` | `add_offline_task_sync_idempotency` | `202611230015_add_offline_task_sync_idempotency.sql` | `same_name_different_version` |
| `20261122230103` | `index_agent_learning_foreign_keys` | `202611230016_index_agent_learning_foreign_keys.sql` | `same_name_different_version` |
| `20261122230236` | `add_offline_agent_run_sync_idempotency` | `202611230017_add_offline_agent_run_sync_idempotency.sql` | `same_name_different_version` |
| `20261122231734` | `add_ceo_office_department_and_assign_kanako` | `20261122231734_add_ceo_office_department_and_assign_kanako.sql` | `exact_version_and_name` |
| `20261122231748` | `fix_ceo_department_seed_function` | `20261122231748_fix_ceo_department_seed_function.sql` | `exact_version_and_name` |
| `20261122233409` | `202611230018_add_ai_employee_workforce_profiles` | `202611230018_add_ai_employee_workforce_profiles.sql` | `same_name_different_version` |
| `20261122233411` | `202611230019_add_capacity_aware_task_assignment` | `202611230019_add_capacity_aware_task_assignment.sql` | `same_name_different_version` |
| `20261122233448` | `202611230020_run_capacity_assignment_as_invoker` | `202611230020_run_capacity_assignment_as_invoker.sql` | `same_name_different_version` |
| `20261122234234` | `202611230021_allow_admin_project_plan_review` | `202611230021_allow_admin_project_plan_review.sql` | `same_name_different_version` |
| `20261122234525` | `202611230022_add_task_progress_handoffs_and_blockers` | `202611230022_add_task_progress_handoffs_and_blockers.sql` | `same_name_different_version` |
| `20261122234625` | `202611230023_make_handoff_approval_atomic` | `202611230023_make_handoff_approval_atomic.sql` | `same_name_different_version` |
| `20261122234647` | `202611230024_restrict_task_update_api_grants` | `202611230024_restrict_task_update_api_grants.sql` | `same_name_different_version` |
| `20261122235021` | `202611230025_attribute_task_updates_to_ai_employees` | `202611230025_attribute_task_updates_to_ai_employees.sql` | `same_name_different_version` |
| `20261122235056` | `202611230026_scope_task_update_references_to_workspace` | `202611230026_scope_task_update_references_to_workspace.sql` | `same_name_different_version` |
| `20261123010049` | `add_virtual_office_commands` | `20261123010049_add_virtual_office_commands.sql` | `exact_version_and_name` |
| `20261123011207` | `create_office_meetings_and_attendees` | `20261123030000_create_office_meetings_and_attendees.sql` | `same_name_different_version` |

## Repository migration files without a direct Production-history mapping


## Required next review

Before building any baseline migration, inspect the SQL content of every candidate mapping and compare it with the live catalog snapshot. Similar filenames alone do not prove semantic equivalence. Do not run `db push`, reset, replay, or apply migrations until this review is complete.