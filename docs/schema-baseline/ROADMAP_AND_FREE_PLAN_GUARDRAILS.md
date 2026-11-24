# 2026-11-24 — Roadmap and Free-Plan Guardrail Verification

**Purpose:** Record verified constraints for the next KANAKO AI Phase 1 database-baseline work. This document is an audit note only; it does not authorize or perform database, billing, deployment, or product-scope changes.

## Free-plan verification

- Supabase organization `Decker143's Org` reports `plan: free` and `tier: tier_free`.
- Vercel team `vapepokemon143-8805` reports `plan: hobby`.
- No paid upgrade, new project, Supabase branch, paid integration, or new subscription was created for this work.
- Keep cloud AI execution and paid research-provider use disabled unless the owner separately approves a clearly disclosed cost.
- A Vercel AI Gateway budget cap is not permission to spend; no model call should be initiated as part of this schema-reconciliation work.

## Canonical roadmap alignment

The canonical roadmap is `docs/KANAKO_MASTER_ROADMAP.md`. Its current focus is **Phase 1 — Virtual company structure**. The immediate roadmap tasks include:
1. Verify the nine-department migration and organization-creation function in a disposable or controlled test workspace/transaction.
2. End-to-end test owner-authored project-plan proposal, approval, task creation, duplicate-approval protection, and invalid-department handling.
3. Continue validating the shared active-workspace context.
4. Continue workforce readiness, workload and task assignment verification.

Database baseline reconstruction is a prerequisite to safely executing those Phase 1 checks because the existing Dev project is only a four-table fixture and cannot yet run the full application. This work is therefore supporting the current roadmap, not adding a new feature.

## Corrected Production catalog counts

A fresh read-only query scoped to non-system schemas returned:

| Schema | Constraints |
|---|---:|
| public | 115 |
| auth | 110 |
| realtime | 5 |
| storage | 26 |
| supabase_migrations | 2 |
| vault | 1 |
| **Total across these schemas** | **259** |

**Correction:** Any earlier statement describing 258 constraints as the Production *public-schema* count is incorrect. The verified public application-schema count is **115**. The broader non-system-schema count is **259**. Managed schemas must not be recreated by the app's public-schema baseline.

The existing reconstruction artifacts were independently checked:
- 21 public tables and 206 columns.
- 115 public constraints.
- 81 public indexes total; 58 are non-constraint indexes, with the remainder backing constraints.
- 72 public RLS policies.
- 10 non-internal public triggers.
- 8 functions in public/private.
- 30 repository SQL migration files on `feature/task-center-register`.
- 34 Production migration-history entries.

The migration reconciliation counts remain 3 exact version+name matches, 25 same-name/different-version candidates, 2 renamed candidates requiring semantic review, and 4 Production history entries with no repository file candidate. Similar names do not prove equivalent SQL.

## Nine-department migration review

Static inspection of the repository migrations confirms:
- `20261122231734_add_ceo_office_department_and_assign_kanako.sql` attempts a multi-row `INSERT ... RETURNING id INTO ceo_department_id`, which is not a safe scalar-return pattern.
- `20261122231748_fix_ceo_department_seed_function.sql` replaces that with an explicit `SELECT ... INTO STRICT` for the CEO Office department after inserting all nine departments.
- The current Production `create_organization(text)` definition matches the later explicit-selection pattern and seeds Kanako as a draft in CEO Office.
- The initial organization seed migration and the earlier fix migration are both present in the repo with exact Production versions. The current live function body is evidence of the final state, not proof that a fresh organization has passed an end-to-end test.

**Test status:** Not yet end-to-end verified in a clean, full-schema Dev workspace. Do not mark this roadmap item complete based only on static SQL inspection.

## Safety and next sequence

1. Keep Production read-only and untouched.
2. Preserve the current Dev fixture project and its test rows/policies.
3. Finish static semantic review of the schema-reference SQL and migration mappings.
4. Prepare an additive Dev-only baseline candidate that preserves fixture objects.
5. Review and test the candidate without Production data, and verify catalog parity before using Dev for app tests.
6. Only after Dev is complete and validated should Preview be considered for isolation from Production. No Preview environment change or redeployment is authorized by this note.

No database DDL/DML, reset, migration application, branch merge, deployment, billing change, or paid service activation was performed.
