# Development Database Baseline Audit

**Date:** 2026-11-24  
**Scope:** Read-only comparison of the linked Production and Dev Supabase projects, plus repository migration inventory.  
**Safety:** No database schema, data, authentication settings, or production resources were changed.

## Findings

### Production database

- Project: `kanako-ai` (`fkxhsxrvngxhkxbuhbjn`)
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17
- Public application tables: 21
- All inspected public application tables have Row Level Security enabled.
- Production migration history contains 34 entries, beginning with:
  - `20261122215735_initial_kanako_ai_platform`
  - `20261122215747_auth_profile_and_organization_bootstrap`
  - `20261122215807_seed_default_departments_on_org_create`
  - `20261122221903_tighten_function_execute_permissions`
- The inspected schema includes organization-scoped departments, AI employees, tasks, approvals, workflows, knowledge documents, reports, activity logs, agent runs, learning memory, task updates, and virtual-office meetings/commands.
- Inspected public functions include `create_organization`, `handle_new_user`, `set_updated_at`, `assign_task_to_agent`, and `approve_task_handoff`. A private review-gate trigger function is also attached to task updates.

### Repository migration inventory

The repository branch `feature/task-center-register` contains 30 SQL migration files under `supabase/migrations`. The four earliest migrations recorded by Production are not present in that directory:

1. `20261122215735_initial_kanako_ai_platform`
2. `20261122215747_auth_profile_and_organization_bootstrap`
3. `20261122215807_seed_default_departments_on_org_create`
4. `20261122221903_tighten_function_execute_permissions`

The remaining 30 repository migration files correspond to the later portion of Production's migration history. The original baseline SQL therefore cannot currently be replayed from the checked-in migration directory alone.

### Development database

- Project: `kanako-ai-dev-test` (`pauzanqmxqhxczefabth`)
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17
- Public tables: 4 fixture tables (`organization_members`, `ai_agents`, `tasks`, `agent_runs`)
- Dev has a purpose-built fixture schema for isolated reservation/RLS tests, not the full application schema.
- Dev fixture migration history contains four test migrations and is independent of Production's migration history.

## Risk and decision

**Do not replay the 30 later migrations into the current Dev fixture project as if they were a complete fresh-install sequence.** Their prerequisites include the missing baseline schema, functions, triggers, constraints, and RLS policies.

**Do not copy Production user/workspace records into Dev.** A test environment should use synthetic organization, user, employee, and task records.

No Production migration, data change, or deployment is authorized by this audit.

## Recommended recovery sequence

1. Recover the exact SQL for the four missing baseline migrations from the original migration source, backups, or a trusted schema export.
2. Compare the recovered baseline with the current Production schema, including columns, constraints, indexes, triggers, functions, grants, and RLS policies.
3. Reconcile migration filenames/versions and the repository's migration history before applying anything.
4. Build a clean full-schema Dev environment from the reconciled migration chain, using synthetic data only.
5. Verify onboarding, department seeding, CEO assignment, project-plan approval, task lifecycle, handoff approval, and AI review gates in Dev.
6. Keep Production unchanged until the owner separately authorizes any production rollout.

## Validation still outstanding

- Exact SQL source for the four missing baseline migrations.
- Full structural diff of every table, index, constraint, trigger, function body, grant, and RLS policy.
- Fresh-install replay of the complete migration chain in a clean Dev database.
- End-to-end application tests against that full Dev schema.
