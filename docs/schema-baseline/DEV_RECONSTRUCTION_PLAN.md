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

The four Dev tables are `organization_members`, `ai_agents`, `tasks`, and `agent_runs`. The `organization_members`, `ai_agents`, and `tasks` tables are reduced test fixtures; `agent_runs` has the same 12 column names as Production. Existing Dev has seven `test_*` policies, three indexes, three constraints, and one function. Preserve these test objects until an explicit replacement strategy has been approved.

## Recommended approach

1. **Keep Production untouched.** The Production catalog snapshot is evidence only.
2. **Keep the current Dev fixture project intact.** Do not reset, truncate, drop tables, replace policies, or overwrite test fixtures.
3. Use `production-schema-reference.sql` as the schema reconstruction source of truth, and `production-catalog.json` as the metadata snapshot.
4. Prepare a separate additive migration candidate that:
   - creates the 17 missing Production tables;
   - adds the missing Production columns and defaults to the three reduced shared tables;
   - verifies `agent_runs` columns before retaining its existing table;
   - adds only missing constraints and indexes after checking names and definitions;
   - adds Production functions and triggers without replacing the existing Dev-only function;
   - adds Production RLS policies while retaining the seven Dev test policies;
   - reconciles table and function grants with the target project's managed roles.
5. Review the candidate SQL statically, then run it only against a disposable or explicitly approved Dev target. Verify catalog parity and run the existing fixture tests after migration.
6. Only after the separate Dev baseline passes should Preview be pointed at Dev. Preview currently points to Production, so do not use its write paths for testing.

## Important limitations before applying

The cloud-generated SQL reference contains 21 `CREATE TABLE` statements, 115 `ADD CONSTRAINT` statements, 58 standalone indexes (53 ordinary and 5 unique), 72 RLS policies, 8 function definitions, 10 triggers, 78 table-grant statements, and 21 routine EXECUTE-grant statements. The live catalog reports 81 indexes total: 58 standalone indexes plus 23 backing primary-key/unique constraints. The reference also includes the `private` schema and its functions, but schema ACLs/default privileges, role attributes, extension setup details, Supabase-managed Auth/Storage objects, publication settings, and other platform-managed configuration require separate review.

The reference is a generated schema reconstruction aid, not a verified byte-for-byte `pg_dump`. It is intentionally a **reference artifact**. It uses `CREATE TABLE` and `ALTER TABLE ADD CONSTRAINT` statements for a clean baseline and must not be run as-is against the existing fixture Dev project because several tables already exist there. It also does not include the function `REVOKE` statements needed to counteract default EXECUTE privileges; the candidate must reconstruct exact routine ACLs from the live catalog, retaining PUBLIC execution only for `public.set_updated_at()`.

The seven existing Dev fixture policies were statically compared with their corresponding Production policy/helper logic. They appear equivalent or narrower, so preserving them alongside the Production policies does not introduce additional row access based on the inspected predicates. This remains subject to authenticated E2E verification.

## No changes applied

This planning step performed read-only catalog inspection and documentation writes to the audit branch only. No SQL DDL, migration, data write, reset, branch merge, or deployment was performed.
