# Preview Deployment Environment Isolation Checklist

**Applies to:** Every non-production Vercel Preview deployment for the `kanako-ai` project.

**Roadmap alignment:** Production Readiness and Live Release Governance — environment isolation and cost/provider controls. This is a release-safety control, not a product feature.

## Required checks before relying on a Preview

1. Confirm the exact Git branch and commit that will be deployed.
2. In Vercel project `kanako-ai` (team `vapepokemon143-8805`), inspect environment variables filtered to that exact Git branch.
3. Confirm both variables exist with target `Preview` and the exact branch restriction:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Confirm the URL points to the Dev Supabase project `pauzanqmxqhxczefabth` (host `pauzanqmxqhxczefabth.supabase.co`). Do not reveal, copy, or log key values.
5. Confirm no branch-specific Preview variable points to the Production Supabase project `fkxhsxrvngxhkxbuhbjn`.
6. After any environment-variable change, create a fresh Preview deployment for the intended branch/commit. Existing deployments do not retroactively receive changed environment variables.
7. Verify the new deployment reaches `READY`, then re-check its branch and commit. If the branch-specific Dev overrides are missing or ambiguous, do not use the Preview for authenticated testing or data entry.
8. Keep Production environment variables and Production deployment settings unchanged. Never promote a Preview as a Production release.

## Current known branch coverage (2026-11-27)

The following non-production branches were checked and have branch-specific Dev Supabase URL and publishable-key overrides:
- `chore/dev-schema-baseline-audit`
- `feature/github-code-execution`
- `feature/phase1-atomic-project-plan-approval`
- `feature/task-center-register`

The Production branch `main` is intentionally excluded from this Preview override list.

## Important limitation

The project's global Supabase environment variables still include the Preview target and point to Production. Therefore, a newly created branch without branch-specific overrides could inherit Production Preview values. This checklist is a mandatory operational preflight, but it does **not** technically block Vercel's automatic Git Preview build before a human checks it.

A fail-closed technical block would require removing the Preview target from the global Production Supabase variables so branches without explicit Dev overrides cannot inherit Production credentials. That is a separate Vercel environment configuration change and must not be made without explicit owner approval.

## Safety boundary

- Free-plan resources only.
- No Production database, Auth, schema, data, or environment changes as part of this checklist.
- No AI execution, model/provider activation, paid services, or Production deployment.
- A Preview marked `READY` is not proof of Production readiness or release authorization.
