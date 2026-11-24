# Dev schema reconstruction plan

Generated 2026-11-24 after read-only comparison of Production and the existing Dev test project.

## Current state

| Catalog item | Production | Existing Dev |
|---|---:|---:|
| Public tables | 21 | 4 |
| Public columns | 206 | 28 |
| Constraints | 115 | 3 |
| Indexes | 81 | 3 |
| RLS policies | 72 | 7 |
| Non-internal public triggers | 10 | 0 |
| Public/private functions | 8 | 1 |
| Sequences in public/private | 0 | 0 |

The four Dev tables are `organization_members`, `ai_agents`, `tasks`, and `agent_runs`. The `organization_members`, `ai_agents`, and `tasks` tables are reduced test fixtures; `agent_runs` has the same 12 column definitions as Production. Existing Dev has seven `test_*` policies, three indexes, three constraints, and one function. Preserve these test objects and their rows.

## Static review completed

The live Production catalog was compared with the generated schema reference:
- All 206 column definitions matched (type, nullability, and default).
- All 115 constraint names/definitions matched.
- All 58 standalone index definitions matched.
- All 72 RLS policy expressions matched.
- All 8 function definitions and 10 public trigger definitions matched. Production also has a separate custom `auth.users.on_auth_user_created` trigger calling `public.handle_new_user()`; Dev lacks it, so the candidate restores it explicitly.
- All 78 table-grant sets and 21 routine-grant entries matched.
- All 21 public tables have RLS enabled.
- Schema ACLs and default privileges were reviewed separately. The generated reference omits required function REVOKEs, so the candidate adds explicit revokes to reproduce the live Production routine ACLs. PUBLIC execution is retained only for `public.set_updated_at()`.

## Additive candidate prepared

`docs/schema-baseline/DEV_ADDITIVE_BASELINE_CANDIDATE.sql` is a one-shot review artifact, deliberately outside `supabase/migrations`. It contains:
- 17 missing tables and 21 missing columns.
- Three shared-column defaults restored.
- 112 missing constraints, including 14 existing-fixture foreign keys marked `NOT VALID`.
- 58 standalone indexes, 8 functions, 10 public triggers plus 1 Auth trigger, 72 Production policies, 78 table grants, 21 routine grants, and 7 function revokes.
- Preservation of the four existing fixture tables, all current fixture rows, seven test policies, current grants, and the Dev-only reservation function.

## Remaining pre-application decisions

- `ai_agents.name`, `ai_agents.job_title`, and `tasks.title` remain nullable in the candidate because they are NOT NULL in Production but have no defaults, while the populated Dev fixtures have no values. Backfilling them changes fixture data.
- The 14 foreign keys on populated fixture tables are `NOT VALID` to preserve known orphaned references. They still enforce new writes; existing rows remain unvalidated until a later approved repair/validation.
- Dev has zero Auth users. The Phase 1 organization-seed E2E test requires a synthetic Dev Auth identity, which must be created only in an explicitly approved controlled test.
- The Production migration ledger and repository migration versions/names do not fully align. The candidate is based on the verified final live catalog, not migration replay. Do not run `db push`, reset, or replay migrations to reconcile the ledger.

**Recommendation:** Preserve the existing fixtures and use the candidate's staged compatibility treatment, but do not apply it until the owner explicitly accepts the three nullable columns and 14 NOT VALID foreign keys. Production remains read-only. No paid resources, new Supabase project/branch, deployment, or merge is required.

## No changes applied

This work performed read-only catalog inspection and documentation/candidate writes to the audit branch only. No SQL DDL, migration, data write, reset, branch merge, deployment, or billing change was performed.
