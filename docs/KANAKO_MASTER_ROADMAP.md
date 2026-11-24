# KANAKO AI — Master Product Roadmap

**Product vision:** KANAKO AI is a virtual company, not merely an AI chatbot or task board. A human owner leads the company. Kanako is its AI CEO. Specialized AI employees operate inside departments, collaborate through governed tasks and workflows, learn from reviewed outcomes, and work both online and offline.

This document is the canonical product plan. Update its status whenever implementation changes. Never mark a feature complete based only on a design, placeholder, or untested code path.

## Product principles

1. **Company, not chatbot.** Work is organized around departments, job roles, employees, tasks, workflows, records, and measurable outcomes.
2. **CEO orchestration.** Kanako coordinates priorities, delegates work, monitors results, detects blockers, and reports to the owner.
3. **Specialized workforce.** Each AI employee has a role, department, instructions, tools/capabilities, model/runtime eligibility, workload, and performance history.
4. **Learning with control.** Employees improve from task outcomes and human feedback. Approved lessons can influence future behavior; agents cannot silently rewrite their own permissions or core instructions.
5. **Offline-first resilience.** Local AI can chat and perform explicitly permitted work without internet after the model and workspace snapshot have been cached.
6. **Internet when needed.** Online agents may research unfamiliar/current topics through a controlled, permission-gated research adapter and cite sources. Research content is untrusted input.
7. **Human authority.** The owner remains the final authority. Spending, external communication, sensitive data access, production changes, and irreversible actions require approval.
8. **Free-first.** Prefer free/local solutions. Do not purchase subscriptions, add paid provider credits, enable billable execution, or deploy to production without explicit owner approval.
9. **Honest status.** Distinguish implemented, tested, configured, enabled, and deployed states. Never claim work happened when it did not.

## Company organization

Every new workspace should start with these nine departments:

1. CEO Office — strategy, company-wide coordination, executive oversight.
2. Operations — daily operations, task coordination, service delivery.
3. Human Resources — recruitment, onboarding, employee records, training.
4. Customer Service — customer inquiries, support, issue resolution, service quality.
5. Sales — lead intake, qualification, follow-up, pipeline, conversion.
6. Marketing — brand, content, social channels, campaigns, growth.
7. Finance — budgets, invoices, expenses, financial reporting and controls.
8. IT & Development — software, infrastructure, integrations, security, technical support.
9. Analytics & QA — KPIs, audits, quality assurance, trend analysis, improvement tracking.

Kanako belongs to CEO Office. Departments should support multiple specialized employees, team leads, role instructions, department-level queues, KPIs, and reports.

## Core product modules

### A. Command Center
- Company-wide operating summary: department health, active employees, open/blocked/overdue tasks, pending approvals, recent incidents, workflow health, and KPIs.
- Clear online/offline and AI-provider status.
- Recent decisions, activity, and upcoming scheduled work.
- [Implemented] Deterministic owner-facing executive brief with overdue/blocked/stale tasks, aging approvals, failed runs, workforce capacity, and high-priority backlog signals. Owners/admins can save a structured report with metrics, department workload, prioritized recommendations, and coverage notes. AI-generated strategic analysis remains gated on explicit AI provider approval.
- [Implemented foundation] Owner-authored project-plan proposals with objective and task breakdown, optional department/priority metadata, owner/admin approval, and queued task creation. This is not yet AI-generated planning; employee assignment and execution are separate and remain gated.
- [Implemented foundation] Append-only task progress and note timeline, blocker reporting, handoff requests, and owner/admin handoff approval. Approval uses an atomic RLS-respecting database function and the existing capacity-aware employee assignment checks. Automatic agent-generated progress callbacks and end-to-end multi-user testing remain outstanding.

### B. Kanako AI CEO
- Understand owner requests and convert them into plans, subtasks, priorities, and department assignments.
- Delegate only to eligible employees using role fit, skills, department fit, workload, availability, and past performance.
- Track task progress and ask for missing information.
- Monitor department and employee performance; identify overdue tasks, recurring errors, capacity bottlenecks, and risks.
- Request status updates, summarize work, and prepare daily/weekly/monthly executive reports.
- Escalate failures and blockers to the owner with evidence and recommended next steps.
- Maintain a decision log. Never impersonate the owner or bypass approvals.
- CEO profile starts draft; activation requires owner configuration and approval.

### C. AI Workforce
Each employee profile should contain:
- Name, title, department, role description, core instructions, model/runtime, status.
- Skills and task types it is qualified to handle.
- Explicit capabilities/permissions (task execution, local execution, knowledge access, department context, internet research, and later approved integrations).
- Workload and availability, task history, success/revision/failure metrics, average execution time, review quality.
- Learning history and approved memories.
- Pause/activate controls and an auditable change history.

Future workforce capabilities:
- Skill-based matching and workload balancing.
- Employee-to-employee handoffs through tasks, not unrestricted agent-to-agent messaging.
- Team leads and department-specific specialist groups.
- Agent evaluation and improvement suggestions; owner approval for material instruction/permission changes.

### D. Task Center
- Task title, full brief, expected output, department, owner, priority, due date, dependencies, assignee, status, attachments, and activity history.
- Task lifecycle: draft → queued → assigned → in progress → blocked / in review → completed or cancelled.
- Subtasks, dependencies, comments, retry/revision cycles, and escalation.
- Kanako can plan and assign tasks; employees can only act within their assigned scope.
- Successful AI work enters human review before completion.

### E. Workflow Automation
- Visual or structured workflow builder with trigger, conditions, steps, retries, timeout, error path, and approval gates.
- Manual trigger first; then scheduled and event-based triggers.
- Internal actions first; external connectors only when configured and explicitly authorized.
- Durable execution history, idempotency, retries, dead-letter/failure queue, pause/resume, and owner alerts.
- No workflow may silently spend money, message customers, or alter production.

### F. Knowledge & Company Memory
- Organization knowledge base with document upload, indexing, tags, departments, access rules, and source metadata.
- Retrieval by CEO and employees according to permissions.
- Separate verified company facts, SOPs, project records, and employee learning memories.
- Versioning, source references, stale-content warnings, and owner-controlled publishing.
- Offline cache of selected approved knowledge only.

### G. Learning & Continuous Improvement
- Record outcomes: approved, revision requested, failed, successful, reopened, and owner feedback.
- Convert explicit reviewer feedback into pending lessons, not automatic truth.
- Owner/admin approves, edits, rejects, or expires a memory.
- Scope lessons to the correct employee/department/organization and attach evidence.
- Retrieve relevant approved lessons for future tasks.
- Track whether a lesson improved later outcomes.
- Detect contradictory, outdated, duplicate, sensitive, or low-confidence memories.
- Never let retrieved web pages, task content, or untrusted files change system rules or permissions.
- This is controlled retrieval-based learning initially, not model fine-tuning or autonomous self-modification.

### H. Offline AI Workspace
- Installable PWA and cached shell.
- Local model download/setup while online; show model size, device compatibility, storage requirements, and readiness.
- Local chat, local task drafting, approved employee execution, cached knowledge, and local run history.
- IndexedDB outbox with stable IDs, retry-safe sync, conflict handling, and clear sync status.
- Sync task drafts and local outputs when the user reconnects and authenticates.
- Synced AI results enter cloud human review; never auto-complete tasks.
- Device-local encryption/security review, logout/cache clearing controls, storage quota handling, and warnings on shared devices.
- Offline state must be explicit: no live web research, cloud DB access, external integrations, or shared real-time updates while disconnected.
- Support a model registry so compatible local models can be selected as device capability evolves.

### I. Internet Research
- Provider adapter behind a server-only API key and feature flag.
- Per-agent capability and organization policy checks.
- Bounded query count, result count, payload size, timeout, and allowed protocols.
- Return source title, URL, excerpt, retrieval time, and citation in the final work.
- Treat all external content as untrusted data; ignore prompt injection and instructions found in pages.
- No external action can be triggered merely because a web page recommends it.
- Offline agents must clearly state research is unavailable and save a research-needed note for later sync.
- Provider costs must be displayed/approved before activation. Current Brave integration is optional and disabled; no paid plan/key is configured.

### J. Reports & Analytics
- Employee, department, workflow, task, and company-level reports.
- Output quality/review acceptance, completion time, revision rate, failure rate, backlog, SLA, workload, and learning effectiveness.
- Date filters, export, source data, and report generation history.
- Daily CEO briefing; weekly department reports; monthly company performance summary.
- Never calculate KPIs from incomplete sample windows without labeling the sample.

### K. Approvals, Audit & Security
- Central approval inbox with request type, context, risk, requester, evidence, and decision log.
- Owner/admin roles, member access, department boundaries, capability checks, and row-level security.
- Human approval for finance, external messages, sensitive data, production changes, and irreversible operations.
- Immutable or append-only audit trail for key decisions and external actions.
- Secrets server-side only; never put service-role/provider keys in client bundles.
- Rate limits, input validation, safe retries, abuse protection, and incident logging.

### L. Integrations (later phase)
- Email, calendar, chat, CRM, project management, accounting, forms, cloud storage, and automation services.
- Connector permission scopes per organization and employee.
- Read-only integration mode first; write actions behind approvals.
- Credential vaulting and connection health checks.
- No integrations are considered available until configured and end-to-end tested.

## Implementation status (verified as of 2026-11-23)

### Implemented foundation
- Next.js application, GitHub repository, existing Vercel project, Supabase Auth/Postgres/RLS connection.
- Organization onboarding and workspace-scoped data model.
- Department, employee, task, approval, workflow, knowledge, conversation, report, activity, run, and learning records.
- Eight default departments existed originally; a migration now adds CEO Office and updates the organization-creation function to seed all nine departments and place Kanako in CEO Office.
- Draft AI CEO profile and manual employee profile lifecycle.
- Task assignment and gated CEO delegation (assignment only; no automatic execution).
- AI execution API with a disabled-by-default cost gate.
- Human review of AI task results, including database enforcement before completion.
- Manual internal workflow actions: create task, request approval, search knowledge, log activity.
- Controlled learning events and owner/admin-approved employee memories.
- Offline PWA shell, WebLLM local model path, IndexedDB drafts/chat/results, snapshot and sync APIs.
- Optional Brave research adapter behind a disabled feature flag and server-only key.\n- [Preview implementation; live AI call not yet verified] Virtual Office meetings now support owner/admin-gated AI discussion drafts using meeting agenda, attendee role/skills, and a bounded open-task snapshot. Drafts are explicitly labeled as non-transcripts; proposed decisions and suggested action items are returned for owner review and are not auto-approved or assigned.
- GitHub Actions quality pipeline (typecheck, lint, build). A prior commit passed; newest commits still require their own green checks.

### In progress / not yet proven end-to-end
- Full CEO operating loop: owner request → plan → subtasks → balanced assignment → monitor → review → executive report.
- Nine-department onboarding migration and function must be verified against a real newly created test organization.
- Complete agent capability and workload enforcement across every route.
- Learning effectiveness measurement and safe memory lifecycle.
- Reliable offline install, model download/cache, browser/device compatibility, and conflict-safe sync tests.
- Internet research provider configuration and real source citation tests (disabled; no key/plan configured).
- Workflow retries, scheduled/event triggers, failure escalation, and durable recovery.
- Department and employee reporting beyond basic metrics.
- End-to-end tests for authentication, organization isolation, approvals, delegation, task state transitions, offline sync, and workflow failures.
- Accessibility, responsive/mobile UX, observability, backups/restore, and operational documentation.

### Not implemented / future
- Autonomous scheduled/event-driven operations.
- General external integrations and external write actions.
- Full visual workflow designer.
- Automatic employee-to-employee collaboration and team-lead hierarchy.
- Full company-wide performance management and learning-effectiveness reports.
- Model fine-tuning or self-modifying agent instructions.
- Multi-device offline conflict resolution beyond basic idempotent sync.

## Delivery phases

1. **Phase 0 — Foundation and safety:** Auth, organization isolation, RLS, core records, cost guard, audit, CI. Continue to preserve.
2. **Phase 1 — Virtual company structure:** Nine departments, Kanako CEO Office, employee profiles, role/capability model, task center. Current focus: verify department seed and finish structured role/skill profiles.
3. **Phase 2 — CEO and workforce operating loop:** CEO planning/delegation, workload-aware assignment, task monitoring, blockers, escalation, performance evaluation, executive briefings.
4. **Phase 3 — Learning engine:** feedback-to-memory workflow, evidence, approvals, expiry/conflict handling, measure improvement.
5. **Phase 4 — Offline-first AI:** PWA installability, local model readiness, offline execution, durable outbox, sync conflict handling, security.
6. **Phase 5 — Research and knowledge:** controlled web research, citations, prompt-injection defenses, indexed knowledge and offline knowledge packs.
7. **Phase 6 — Workflow automation:** visual/structured builder, schedules, event triggers, retries, recovery, notifications, approval gates.
8. **Phase 7 — Reports and QA:** department KPIs, employee evaluations, company analytics, scheduled reports, exports.
9. **Phase 8 — Integrations:** connectors, credential management, read/write scopes, approvals, end-to-end connector testing.
10. **Phase 9 — Production readiness:** security review, performance, accessibility, backup/restore, incident response, E2E tests, owner-approved deployment.

## Phase 1 verification update — 2026-11-24

Verified in the Dev test workspace and controlled database transactions:
- Nine departments are created for the test organization; Kanako is in CEO Office.
- The eight named department manager profiles were created once; repeating the starter-team action did not create duplicates. All nine profiles remain Draft with no model configured and no execution permissions enabled.
- Owner-authored project-plan proposal, owner approval, and atomic creation of two queued tasks passed in the UI.
- Duplicate approval, unknown-department rejection, and all-or-nothing rollback passed in database tests.
- The task assignee directory returned all nine employee profiles. Assigning the Operations task to Riley Reid persisted in Dev and appeared after a page refresh.
- Online workspace context is shared through the authenticated membership/cookie resolver used by the main dashboard, server actions, and Virtual Office. Workspace switching is membership-validated and appears when an account has multiple workspaces.
- Offline local messages, drafts, snapshots, and run records are now namespaced by organization in IndexedDB. The Preview build passed for this change. Database-level offline sync idempotency is now covered by the rollback-only regression suite; browser-level sync and cross-workspace offline switching still require end-to-end testing with more than one authorized workspace.
- Offline AI result synchronization now uses a Dev-only atomic database function: the run insert, task transition to `in_review`, and activity-log entry commit or roll back together. Retries are serialized by organization and local result ID; repeated successful sync returns the existing run. The sync endpoint delegates to this function, and offline snapshots now include only active employees with both execution capabilities. The repeatable rollback-only regression suite verified first sync plus duplicate retry. Browser-level sync, cross-workspace switching, and explicit failure-path tests remain outstanding.
- Added `supabase/tests/phase1_regression.sql`, a rollback-only database regression suite. It checks organization and learning-memory/event read isolation; project-plan owner authorization, cross-workspace plan protection, valid approval, duplicate protection, invalid status/empty plan/blank title rejection, invalid-department all-or-nothing rollback; AI task review gate and approved completion; owner-controlled learning-memory approval and non-member write rejection; and offline sync idempotency plus mismatched replay IDs, empty output, draft employees, wrong task assignees, and stale/completed task rejection. The exact committed suite executed successfully against Dev; follow-up queries confirmed zero leftover temporary organizations, agents, tasks, reports, memories, learning events, and runs.
- GitHub Actions database CI remains deferred rather than being added unsafely: this branch has no `supabase/config.toml`, no `seed.sql`, and no initial full-schema baseline migration (the 32 tracked migrations are incremental feature changes). The current regression SQL also depends on a pre-created Dev workspace and owner identity, so it is not yet a hermetic local fixture. The existing quality workflow runs typecheck/lint/build only and targets `main`. A proper DB CI job needs a reproducible local Supabase schema/auth fixture setup; no paid project, external service, or production secret will be introduced to shortcut that work.

Safety status: all testing and deployment work above used Dev/Preview only. No Production database or environment changes were made. AI execution and model-provider calls remain disabled.

## Immediate next steps
1. [Verified] Nine-department migration and organization-creation behavior passed in a controlled transaction and a real Dev test workspace.
2. [Verified] Project-plan proposal, approval, atomic task creation, duplicate-approval protection, invalid department rejection, and transaction rollback passed. Task assignment to Riley Reid persisted after refresh.
3. [Partially complete] Online shared organization context is implemented and code-reviewed across dashboard, server actions, and Virtual Office. Offline IndexedDB records are organization-scoped; database-level offline sync idempotency passed. Browser-level sync and cross-workspace offline switching still need testing with more than one authorized workspace.
4. [Preview deployed and CI verified — 2026-11-25] CEO Command Center now surfaces workforce readiness, overdue/blocked/unassigned work, failed workflow and agent runs, executive alerts, department health, active employee workload/capacity, AI run outcomes (awaiting review, failed, approved, revision requested), and the five most recent pending approvals. Workload signals are informational only; no automatic reassignment or approval occurs. Latest exact commit `3aa136d5d2fb853122c29478e199802c599f4cc4` passed assignment tests, typecheck, lint, and build in GitHub Actions and is deployed READY to Vercel Preview. Browser-level functional verification of the dashboard and offline flows remains separate.
5. [Code, regression tests, CI, and Preview verified — 2026-11-25] Employee profiles store skill tags, maximum concurrent tasks, and availability. CEO delegation deterministically ranks candidates by department alignment and complete skill-tag matches, restricts Kanako's model choice to the highest-fit group, and uses capacity/recent outcomes as tie-breakers. Five dependency-free Node assignment-ranking tests, TypeScript check, lint, and production build passed for commit `3aa136d5d2fb853122c29478e199802c599f4cc4`; the exact commit is READY on Preview. Database capacity is independently rechecked atomically, including the successful two-session concurrency probe. End-to-end authenticated browser verification remains outstanding.
6. [Expanded regression suite and live concurrency probe passed in Dev] `supabase/tests/phase1_regression.sql` covers organization and learning read isolation; project-plan authorization, cross-workspace protection, validation, duplicate protection, and atomic rollback; task review/completion; learning approval and non-member write rejection; capacity-boundary rejection; and offline sync idempotency and invalid replay cases. A separate two-session concurrency probe against a temporary one-slot employee confirmed one competing assignment succeeds while the other is rejected after waiting for the employee row lock. All temporary probe agents/tasks were cleaned up and verified at zero leftovers. GitHub Actions database CI remains deferred: the repository lacks a full-schema baseline, `supabase/config.toml`, and `seed.sql`, while the current SQL suite depends on a pre-created Dev workspace and owner identity. Browser-level offline tests remain.
7. Only after expanding and automating the regression coverage, continue with workflow triggers and advanced research.

## Release gates
- A green CI run for the exact commit.
- Supabase migrations applied and verified.
- RLS and API authorization tests pass.
- Offline and online flows tested on real supported browsers/devices.
- AI/provider spending explicitly approved before any billable model call.
- Production deployment explicitly approved by the owner.


## Dev security and performance review — 2026-11-25

Reviewed Supabase security and performance advisors for the Dev project; no Production resources were changed.

- [Reviewed; intentional with caveat] `public.create_organization(text)` is a SECURITY DEFINER function callable by authenticated users. Its definition sets an empty search_path, requires `auth.uid()`, validates the organization name, and creates the caller as owner together with the nine departments and draft Kanako profile. EXECUTE is granted to authenticated/service_role/postgres, not anon or PUBLIC. SECURITY DEFINER is currently required for the owner-bootstrap inserts under RLS. Do not switch it to SECURITY INVOKER or revoke authenticated EXECUTE without designing and testing an alternative onboarding path. Keep this as a documented, reviewed exception; re-evaluate before Production.
- [Configuration follow-up] Supabase Auth leaked-password protection is disabled in Dev. This is a project Auth setting, not a schema migration. Enable and verify it before any Production release; no setting was changed during this review.
- [Performance warning] Seven multiple-permissive-policy findings include redundant `test_*` policies alongside the app's canonical policies on `agent_runs`, `ai_agents`, `organization_members`, and `tasks`. Their predicates were inspected and overlap with the canonical membership/admin policies. Do not drop them automatically: first establish their origin and confirm the canonical policies fully cover each intended access path, then prepare a Dev-only cleanup migration and regression test it.
- [Performance info] Five foreign-key indexes are currently missing on `office_commands.created_by` and `task_updates` actor/target/task references. Review query patterns before adding indexes; this is optimization, not a Phase 1 release blocker.
- [Performance info] The advisor reports 36 unused indexes. The Dev workspace has very low activity, so "unused" is not evidence that these indexes are unnecessary. Do not drop them based on this snapshot.
- Existing regression suite was inspected: it exercises organization isolation, owner/admin authorization, atomic plan approval, task review, learning permissions, capacity boundaries, and offline sync idempotency. Browser-level offline and cross-workspace tests remain open.

No database DDL, Auth configuration, Production setting, or paid service was changed during this review.


## Phase 1 follow-up review — 2026-11-25

- [Origin not established; cleanup held] Rechecked all 32 tracked SQL migration files on `feature/phase1-atomic-project-plan-approval`: none defines the seven Dev `test_*` RLS policies reported by the advisor. The repository currently has incremental feature migrations but no initial full-schema baseline, so the current Git history cannot establish who/what originally created those policies. Do not drop them until the source of the Dev-only policies is confirmed and a rollback plan is reviewed.
- [Redundancy confirmed in current Dev policy catalog] The seven policies are on `agent_runs` (insert/select), `ai_agents` (select/update), `organization_members` (select), and `tasks` (select/update). Each overlaps a canonical app policy for the same operation. Canonical policies use the shared `private.is_org_member` / `private.has_org_role` helpers; the `test_*` policies repeat membership checks directly against `organization_members`. The `test_members_read` predicate is narrower than the canonical `members_select_org` policy. These are performance/redundancy warnings, not evidence of a demonstrated authorization bypass. No policy was dropped or modified.
- [Assignment guard reviewed] The Dev `assign_task_to_agent` function locks the selected employee row before counting open assignments, then validates same-workspace employee/task, owner/admin caller, active status, availability, configured model, `task_execution` capability, queued/blocked task state, and `max_concurrent_tasks`. Locking the employee row serializes concurrent assignments to that employee before the capacity count. The existing rollback-only capacity-boundary test passed. The function does not independently enforce skill-tag or department-fit matching; those remain selection/ranking responsibilities in the CEO delegation layer and should be covered by app-level tests before treating matching as fully verified.
- [Scope and safety] This was read-only inspection of Dev and GitHub. No RLS policy, function, schema, Auth setting, Production resource, or paid service was changed.

Next:
1. Confirm the historical source of the seven `test_*` policies if an authoritative setup script or earlier baseline can be recovered. Until then, retain them and keep the warning documented.
2. Run the new Node assignment-ranking regression tests and verify the Preview build/typecheck/lint for deterministic skill/department fit; fix any failures before treating matching as verified.
3. Keep browser-level offline and cross-workspace tests open; do not mark them passed without a supported browser test run.


## Assignment concurrency verification — 2026-11-25

- [Passed in Dev] Ran two independent authenticated database transactions concurrently against a temporary active employee with `max_concurrent_tasks = 1`. Each transaction first acquired the employee row lock and then attempted to assign a different queued task. Exactly one assignment committed; the competing transaction waited and was rejected with the expected capacity error. This validates the row-lock/capacity-check behavior under a real concurrent race, beyond the earlier single-session capacity-boundary test.
- [Cleanup verified] Removed the temporary probe employee, both temporary tasks, and their delegation activity records. A follow-up query confirmed zero remaining probe agents and tasks. The existing two user-created Phase 1 tasks and all nine draft employee profiles were not changed.
- [Matching still incomplete] Code review confirms the delegation route calculates a lexical skill-match count and passes it, department data, and task department to the AI selector. However, it does not deterministically rank/enforce skill or department fit before asking the model; a model response is still the deciding selection. This is not yet sufficient to claim skill/department matching is verified. Keep AI delegation gated and do not activate employee profiles until deterministic matching and app-level tests are added.
- [No production or billing changes] The probe used the existing free Dev project only. No schema, migration, auth, Production, Vercel environment, or paid-provider settings were changed.


## Deterministic workforce matching implementation — 2026-11-25

- [Implemented; automated verification pending] Added `lib/ai-workforce/assignment-ranking.ts`. Candidate ranking now uses exact complete-token skill-tag matches and department alignment as deterministic fit signals. Department alignment carries the strongest weight; skill matches contribute next. Remaining capacity, recent success rate, and stable ID order break ties.
- [Guardrail added] The CEO delegation route now supplies only the highest-fit candidate group to the AI selector. Kanako can choose among equally ranked candidates but cannot override a stronger deterministic department/skill match. The route still requires the existing execution feature flag, owner/admin membership, active employee status, configured model, task-execution capability, availability, and remaining capacity. The database function remains the final atomic capacity/authorization guard.
- [Tests added] Added five native Node test cases for department preference, complete skill-tag matching, capacity tie-breaking, skill-only matching when no department is selected, and empty candidate lists. Added `npm run test:assignment` and included it in the GitHub Actions quality workflow. The workflow now also runs on the focused Phase 1 branch. No new package dependency was added.
- [Not yet verified] The new tests and build must run successfully on the focused branch before the matching change is considered complete. AI execution remains gated; no model call was made.
- [Safety] Code and workflow changes are limited to the Phase 1 feature branch. No Supabase schema/data, Production environment, billing plan, or paid service was changed.


## Assignment matching quality-check follow-up — 2026-11-25

- [Passed on commit 15937a8] The five assignment-ranking Node tests passed (5/5), and TypeScript type-check passed.
- [Lint blocker identified] The same quality workflow then failed at lint on pre-existing UI issues: an anchor used for internal navigation, intentional state hydration/reset in effects flagged by the current React lint rule, and an unused import. The assignment tests and typecheck were not the cause; the workflow skipped the build after lint failed.
- [Fix committed; re-verification pending] Updated the offline workspace navigation to use Next.js Link, documented narrowly scoped lint suppressions for state hydration/reset effects, and removed an unused import. These are targeted quality-check fixes, not new product scope.
- [Next gate] Wait for the final focused-branch CI run and matching Preview deployment; require assignment tests, typecheck, lint, and build to pass before marking deterministic matching verified.
- [Safety] All changes remain on the Phase 1 feature branch. No Production resources, Supabase schema/data, paid plans, or paid AI services were changed.


## Deterministic assignment matching — verification complete — 2026-11-25

- [Verified] Focused GitHub Actions Quality checks passed on commit `51a5176c47e0d3054ff5eb94d50d136759ab6324`: assignment-ranking tests, TypeScript, lint, and build all succeeded.
- [Verified] Vercel Preview deployment `dpl_4e3Za6AnMaWKrcTEnxBxaTDm5cRW` reached READY on the same commit. The existing feature-branch Preview alias was assigned without error.
- [Verified] The Preview build completed Next.js compilation, TypeScript, static page generation (15/15), and output deployment. No Production target was selected.
- [Safety] No Supabase schema/data, Production environment, billing plan, or paid AI service was changed.
- [Next roadmap work] Continue with browser-level offline sync and cross-workspace switching tests, then complete the CEO Command Center department-health/workload/run-outcome/pending-approval visibility. Keep all verification in the Dev workspace and Preview environment.

## CEO Command Center workload and approvals follow-up — 2026-11-25

- [Implemented; CI/Preview verification pending] Extended the existing owner dashboard with a pending-approvals queue (up to five visible, with a link to the Approval Center) and an employee workload table for active employees.
- Workload rows show department, open assigned tasks against each employee's configured concurrent-task limit, remaining capacity, high-priority assignments, and availability/capacity signal. Draft profiles remain excluded. If no employees are active, the dashboard explains why no workload rows are shown.
- The dashboard is informational only; it does not automatically assign or reassign work. This stays within Phase 1 CEO Command Center visibility and the free Dev/Preview workflow.
- [Still open] Browser-level offline sync and cross-workspace switching tests remain unverified. The repository has no Playwright setup yet, and the current execution environment cannot reach the Preview URL; do not mark browser E2E as passed until an actual supported browser run is available.
- [Safety] This change is limited to the Phase 1 feature branch. No Supabase data/schema, Production deployment, paid plan, or AI provider was changed.

## Phase 1 employee profile audit — 2026-11-25

- [Verified in Dev] Audited all nine AI employee profiles in `KANAKO Phase 1 Test Workspace`. All nine have a department assignment, role description, operating instructions, and non-empty skill tags. Kanako's CEO profile was the only profile missing skill tags; populated that empty field with `strategic planning`, `task orchestration`, `workload balancing`, `risk escalation`, and `executive reporting`.
- [Safety verified] All nine profiles remain Draft, have no configured model, and have an empty capabilities array. No employee was activated and no AI execution permission was enabled. This preserves the existing approval and cost gates.
- [Scope] The update was limited to the Dev test workspace. Production data and schema were not changed; no paid service or provider call was used.
