# KANAKO AI — Architecture & Operating Model

## System layout

- **Web/PWA:** Next.js App Router, responsive command center, installable offline workspace.
- **Backend:** Next.js server routes and server actions; authorization checked on every operation.
- **Database/Auth:** Supabase PostgreSQL and Auth, organization-scoped RLS, migrations tracked in Git.
- **Source control/CI:** GitHub, typecheck, lint, production build.
- **Hosting:** Existing Vercel project. Git deployment intentionally disabled during development.
- **Cloud AI:** Vercel AI SDK / AI Gateway, disabled by default until model usage and spending are approved.
- **Local AI:** WebLLM in browser with a cached quantized model and IndexedDB local workspace.
- **Research:** Server-only optional Brave LLM Context adapter, disabled by default, bounded and capability-gated.
- **Future connectors:** Adapter layer with explicit scopes and approval gates.

## Data ownership boundaries

Every business record belongs to an organization. Queries and writes must be scoped to the authenticated user's organization membership. RLS is mandatory and server-side permission checks are required in addition to RLS.

Agent capabilities are allowlists. An employee receives only the knowledge, department context, research access, local execution, or external tools explicitly granted to it. Task assignment alone does not grant permission to execute. An agent cannot promote itself, grant its own capabilities, or approve its own output.

## AI work lifecycle

1. Owner or authorized user creates a task with an expected outcome and risk classification.
2. Kanako may propose a plan and assign eligible employees.
3. Employee eligibility is checked by status, role/skills, capabilities, model/runtime, department, task state, and workload.
4. Execution is recorded as a durable run with bounded input/output and timing.
5. Successful work enters `in_review`.
6. Owner/admin approves or requests revisions. Approval is the only path to completing AI-produced work.
7. Reviewer feedback becomes a learning event. A proposed memory requires explicit approval before reuse.
8. Kanako monitors the task and includes the outcome in department/company reporting.

## Online/offline model

- Online: authenticated workspace data, cloud AI if enabled, and controlled research if configured and authorized.
- Offline: cached PWA shell, local inference, local IndexedDB data, and only the snapshot permissions granted before disconnection.
- Sync: authenticated API validates organization, employee capability, task state, stable client IDs, and idempotency. Synced local outputs enter the same human review process as cloud outputs.
- Offline is not a promise of universal device support. WebGPU, model storage, browser policy, and device memory determine compatibility.

## Learning safety

Learning is retrieval-based and auditable. Feedback is recorded as events; candidate memories are pending until approved. Approved memories are scoped by organization and employee. They are context, not policy. They cannot override system instructions, current role boundaries, permissions, or owner decisions. Sensitive data should not be copied into reusable memory without a clear business need and authorization.

## Research safety

Research is a narrow search tool, not general-purpose browser control. Queries and results are bounded. Returned pages and snippets are untrusted. The model must cite source URLs and distinguish sourced facts from its own recommendations. Research cannot trigger external actions. Offline agents must disclose that live research is unavailable.

## Human approval boundaries

Approval is required before:
- Spending money, buying services, or using paid provider credits.
- Sending customer/vendor/employee communications.
- Modifying production systems, access controls, or security settings.
- Making irreversible changes or deleting important records.
- Accessing or exporting sensitive information beyond the employee's granted scope.

## Workspace selection and isolation

- The active workspace is selected through a server-managed, HTTP-only `kanako_active_org` cookie.
- The cookie is never treated as authorization by itself: every server action and API route resolves it against the signed-in user's `organization_members` rows.
- If the cookie is missing or stale, the app falls back to the first workspace the user is actually a member of.
- Dashboard queries, server actions, chat, CEO delegation, AI task execution, and workflow execution use the same resolved workspace context.
- Offline sync continues to accept an organization ID from the local queue only after checking that the signed-in user is a member of that exact organization.

## CEO operational monitoring and reports

- The Command Center derives operational signals from workspace records: overdue and blocked work, stale tasks (72+ hours), pending approvals older than 48 hours, failed employee/workflow runs, high-priority backlog, and employees at configured capacity.
- Alerts link to the relevant workspace module. These are deterministic indicators, not claims that Kanako has autonomously investigated or resolved an issue.
- Owners/admins can generate a saved executive operations brief. It records the metrics, department workload, prioritized recommendations, timestamp, and record-coverage limits used for the snapshot.
- Report generation is rules-based and does not call an AI provider. It does not execute recommendations, approve requests, retry failed work, or contact external parties.

## AI workforce profiles and assignment

- Each AI employee profile stores owner-maintained skill tags, a maximum concurrent-task capacity, and an explicit availability state (`available`, `busy`, or `unavailable`).
- CEO delegation considers skill overlap with the task, department alignment, remaining capacity, and recent run outcomes. Employees at capacity or not marked available are excluded before model selection.
- A database assignment function rechecks membership, employee state, task state, capability, and capacity while holding row locks. This prevents concurrent delegation requests from exceeding an employee's configured capacity.
- The assignment function runs as the authenticated caller and remains subject to row-level security; it does not bypass table policies.
- Delegation assigns work only. AI execution remains separately gated and task completion still requires human review.

## Cost and deployment controls

- Keep cloud AI execution disabled until the owner explicitly approves provider/model and budget.
- Keep web research disabled until provider and cost are approved.
- Keep Vercel production deployment disabled until the owner explicitly approves.
- Prefer local inference and free-tier resources where practical, while accurately disclosing device limitations and provider limits.

## Engineering quality

- Use migrations for schema changes; do not silently edit live schema outside tracked migrations.
- Validate request bodies, bound input sizes, and use timeouts.
- Use idempotency keys for sync and workflow execution.
- Never trust client-supplied organization, employee, task, or role IDs without server-side membership and relationship checks.
- Log key decisions and execution outcomes.
- Test both positive and negative authorization cases.
- Verify the exact commit's CI run before calling it healthy.


## CEO planning and owner approval

- Owners/admins can save a structured project-plan proposal containing an objective and up to 40 task briefs with optional department, priority, and description.
- The current planner is owner-authored and deterministic; it does not call a cloud AI provider or claim autonomous task decomposition.
- A proposal is stored in the reports library with an explicit lifecycle: pending approval → processing → approved, or failed for inspection.
- Approval creates queued task records in one database insert and records their originating plan in task metadata. Department names must exactly match a department in the active workspace.
- Created tasks are not automatically assigned to employees or executed. Assignment remains a separate CEO delegation step, and AI execution remains disabled unless separately approved.
- The reports update policy restricts plan approval state changes to workspace owners/admins. Workspace membership and RLS continue to scope records.
- If task creation fails, the plan is marked for inspection; the UI warns against retrying blindly. A real workspace end-to-end test is still required.
