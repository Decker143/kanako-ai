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
2. **Phase 1 — Virtual company structure:** Nine departments, Kanako CEO Office, employee profiles, role/capability model, task center. Department seeding and the nine structured role/skill profiles are verified in Dev. Remaining Phase 1 gates are authenticated multi-workspace/offline API browser verification and final CEO Command Center functional verification; keep employee activation and AI execution gated.
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
3. [Partially complete] Online shared organization context is implemented and code-reviewed across dashboard, server actions, and Virtual Office. Offline IndexedDB records are organization-scoped; database-level offline sync idempotency passed. Chromium tests now verify local draft persistence, organization-key isolation, and manual sync intent using mocked API endpoints. Authenticated workspace switching and real API sync still need end-to-end testing with more than one authorized workspace.
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

- [CI/Preview verified on commit 3aa136d5d2fb853122c29478e199802c599f4cc4] Extended the existing owner dashboard with a pending-approvals queue (up to five visible, with a link to the Approval Center) and an employee workload table for active employees.
- Workload rows show department, open assigned tasks against each employee's configured concurrent-task limit, remaining capacity, high-priority assignments, and availability/capacity signal. Draft profiles remain excluded. If no employees are active, the dashboard explains why no workload rows are shown.
- The dashboard is informational only; it does not automatically assign or reassign work. This stays within Phase 1 CEO Command Center visibility and the free Dev/Preview workflow.
- [Historical status superseded by the browser-test harness update below] At this point browser-level offline sync and cross-workspace switching were unverified and no Playwright setup existed. The later Chromium suite now verifies local UI persistence, organization-key separation, and explicit manual-sync behavior against mocked endpoints; authenticated real-API and true multi-workspace E2E remain open.
- [Safety] This change is limited to the Phase 1 feature branch. No Supabase data/schema, Production deployment, paid plan, or AI provider was changed.

## Phase 1 employee profile audit — 2026-11-25

- [Verified in Dev] Audited all nine AI employee profiles in `KANAKO Phase 1 Test Workspace`. All nine have a department assignment, role description, operating instructions, and non-empty skill tags. Kanako's CEO profile was the only profile missing skill tags; populated that empty field with `strategic planning`, `task orchestration`, `workload balancing`, `risk escalation`, and `executive reporting`.
- [Safety verified] All nine profiles remain Draft, have no configured model, and have an empty capabilities array. No employee was activated and no AI execution permission was enabled. This preserves the existing approval and cost gates.
- [Scope] The update was limited to the Dev test workspace. Production data and schema were not changed; no paid service or provider call was used.


## Phase 1 browser-test harness update — 2026-11-25

- [CI verified] Added a Playwright browser-test harness to the existing free GitHub Actions quality workflow, pinned to the supported Ubuntu 24.04 runner. The exact commit `35217758be06cf5b12738514045c36887cb4b81e` passed the complete workflow: dependency installation, five assignment-ranking tests, TypeScript, lint, production build, Chromium installation, and all offline workspace browser tests. The earlier Ubuntu 26.04 Chromium-install failure was a runner compatibility issue and is superseded by this passing run.
- [Browser UI behavior verified with mocked API responses] Three browser tests passed: local task drafts survive reload; local drafts are separated when the active organization key changes; and a task draft is sent only after the user explicitly presses **Sync tasks**. The tests run against the actual Offline page in Chromium, but mock the snapshot and sync HTTP endpoints.
- [Still not verified end-to-end] These tests do not authenticate against Supabase, exercise the real snapshot/sync API handlers, prove server-side membership isolation, or test two genuinely authorized workspaces through the full sign-in/workspace-switch flow. Database-level atomic sync/idempotency remains separately covered by the Dev regression suite. Do not describe the current browser suite as full authenticated offline-sync E2E.
- [Roadmap alignment] This is a test-enablement step for the already-planned Phase 1 organization-scoped workspace validation and the Phase 4 offline-first requirements. It does not add product scope or change the roadmap sequence. The CEO Command Center visibility work remains within the existing Phase 1/2 operating-visibility foundation; workflow triggers, advanced research, integrations, and other later-phase features remain deferred.
- [Next gate] Extend browser coverage only where it closes the stated gaps: authenticated Preview/Dev workspace switching and real API sync behavior, using the existing free Dev/Preview setup. Keep AI execution disabled and do not introduce paid services or Production changes.
- [Safety] No Supabase schema/data, Production environment, employee activation, AI-provider call, or billing plan was changed for this browser-test work.

## Phase 1 owner-visible UI verification review — 2026-11-25

- [Manually inspected in the Dev test workspace from owner-provided UI evidence] Knowledge Base loads with zero documents; no unapproved or synthetic knowledge was added.
- [Manually inspected] Workflow Automation loads with zero workflows and zero runs. The UI exposes only manual internal actions (task creation, approval request, knowledge search, activity logging); scheduled/event triggers, retries, external integrations, and AI execution remain unavailable/gated. No workflow was saved or executed during this inspection.
- [Manually inspected] Reports library shows the approved Phase 1 project-plan record and its two created queued tasks. The record states employee assignment is separate and was not performed automatically.
- [Manually inspected] Activity Logs show approval.requested, approval.approved, and approval.rejected entries corresponding to the UI approval tests.
- [Manually inspected] Virtual Office displays all nine draft profiles, nine departments, two open tasks, zero active runs, and zero online employees. Employee execution remains inactive; no meeting was created.
- [Manually inspected] Command Center summary matches the workspace evidence: nine departments, nine saved profiles, two queued tasks, zero pending approvals, zero active employees/runs, and one unassigned Analytics & QA task. Workload/alerts are informational; no automatic reassignment or approval is performed.
- [Interpretation] These checks establish owner-visible page rendering and consistency of displayed Dev workspace records. They do not independently prove authenticated server-side authorization, multi-organization isolation, real offline API sync, or every interactive control. Keep those E2E gates open.
- [Phase 1 status] The manual UI review of the listed workspace modules is complete. Phase 1 is not declared fully complete: authenticated multi-workspace/offline API verification and interactive CEO Command Center behavior remain outstanding. Do not activate employees, configure models, enable AI execution, create extra test records, or change Production to close these gaps.
- [Safety and roadmap alignment] This is a verification/documentation update only. It adds no product scope and makes no Supabase schema/data, Production, billing, or paid-service changes.


## Authenticated offline snapshot check — 2026-11-25

- [Manually verified through the signed-in Dev Preview UI] The owner opened Offline Workspace while online in `KANAKO Phase 1 Test Workspace` and used **Refresh offline snapshot**. The UI reported a successful refresh with **0 eligible AI employees** and **2 queued or blocked tasks**.
- [Code path confirmed] The button calls the real `GET /api/offline/snapshot?organizationId=...` endpoint, checks the HTTP response and required arrays, then stores the returned snapshot in organization-scoped IndexedDB. The endpoint calls Supabase Auth `getUser()`, verifies organization membership and owner/admin role, and scopes employees, tasks, departments, memories, learning events, prior runs, and knowledge to the selected organization. This is stronger than the earlier mocked Playwright snapshot test: the owner-provided UI evidence confirms the authenticated snapshot request succeeded against the Dev Preview environment.
- [Still open] This single successful owner-workspace request does not prove denial for a non-member, isolation across two real authorized organizations, or real POST task/result synchronization. Those remain release gates. The task-sync endpoint also uses a unique organization/offline-client ID index for retry deduplication; the result-sync endpoint delegates to the Dev atomic sync RPC.
- [Safety and roadmap alignment] No local model was downloaded, no employee activated, no task draft created or synchronized, and no database records or schema were changed. This is verification of the existing Phase 1 organization-scoped workspace and Phase 4 offline foundation, not a scope expansion.


## Phase 1 authenticated offline-sync authorization verification — 2026-11-25

- [Passed in Dev; authenticated database-role simulation] Used the real Dev database with the test owner's UUID in the JWT subject claim and executed the checks as the PostgreSQL `authenticated` role. This validates the database authorization context and RLS behavior; it is not a claim that the protected Preview HTTP routes were exercised.
- [Task-sync persistence/idempotency passed] Replayed the task-sync route's membership lookup and insert-once logic twice with the same offline client ID. Exactly one task row persisted, and its `created_by` matched `auth.uid()`. The unique organization/offline-client ID index remains the database-level duplicate backstop.
- [AI-result sync/idempotency passed] Called the existing `sync_offline_agent_run` RPC twice with a temporary Dev-only local test employee and queued task. The first call returned `duplicate=false`; the retry returned `duplicate=true` and the same run ID. The task moved to `in_review`; the run was stored for the human-review path. The test output was a fixed local string; no model or cloud AI was called.
- [Cross-workspace isolation passed at the database layer] Created a temporary second Dev organization owned by the permanent owner, with a fixture task not shared with the Phase 1 test user. Under the test user's authenticated role, the other workspace's task query returned zero rows, task insertion was rejected by RLS (SQLSTATE 42501), and the offline-result RPC rejected the non-member at its owner/admin authorization check.
- [Cleanup verified] Removed the temporary second organization, membership, test employee, tasks, agent run, and activity record before committing the verification transaction. Final counts were zero temporary organizations, employees, tasks, runs, and activity records. The two existing Phase 1 project-plan tasks and nine real draft employee profiles were not modified.
- [Route-level E2E still open] The actual authenticated `POST /api/offline/sync` and `POST /api/offline/sync-runs` HTTP handlers were source-reviewed for `getUser()` and workspace membership/role checks, but were not called end-to-end: the Vercel Preview is deployment-protected and no authenticated browser session is available to the test runner. Keep real signed-in Preview POST/retry verification as an explicit release gate; do not mark the HTTP E2E step complete based on this database simulation.
- [Safety and roadmap alignment] Verification used only the existing free Dev Supabase project and local test payloads. No schema, migration, Auth configuration, Production resource, paid service, model provider, or real employee profile was changed. This closes the database-auth/RLS portion of the existing Phase 1 organization-isolation and offline-sync verification without changing the roadmap sequence.


## Phase 1 security review follow-up — 2026-11-25

- [Verified in Dev; no change made] Reviewed the Dev `public.create_organization(text)` function definition and effective grants. It is `SECURITY DEFINER`, but its body requires a non-null `auth.uid()`, validates organization names, uses an empty function `search_path`, and inserts the caller as the new organization owner. Effective privileges show `anon` cannot execute it; `authenticated` and `service_role` can. This is not evidence of anonymous organization creation or a demonstrated authorization bypass. Retain the current implementation pending a deliberate migration review; do not casually change its security mode because organization seeding currently spans multiple protected tables.
- [Dev hardening item; unchanged] The Supabase security advisor reports leaked-password protection is disabled in the Dev Auth configuration. This is an Auth hardening recommendation, not a Phase 1 feature blocker demonstrated by the tests. No Auth setting was changed. Review and enable only through a separately approved, supported Auth configuration change after checking compatibility and the free-plan constraints.
- [Dev performance warnings; origin unresolved] The advisor reports overlapping `test_*` policies. The prior policy-catalog review established that these duplicate or overlap canonical organization-membership policies, but the historical origin of those policies remains unverified. Keep them in place until the authoritative source and rollback path are established; no policy was dropped or modified.
- [Current quality gate rechecked] GitHub Actions run `45506634507` completed successfully, including assignment ranking tests, typecheck, lint, build, Chromium installation, and the three offline workspace browser tests. Those browser tests still mock the offline API endpoints and therefore do not replace signed-in HTTP end-to-end coverage.
- [Scope and safety] This follow-up was read-only inspection plus roadmap documentation. No Supabase schema/data/Auth setting, RLS policy, Production resource, Vercel deployment, billing plan, or AI execution was changed. Continue to keep authenticated Preview POST/retry tests, true multi-workspace browser isolation, and final interactive CEO Command Center verification as Phase 1 release gates.

## Phase 1 dashboard count accuracy

Date: 2026-11-25

- CEO Command Center Open Tasks and Pending Approvals headline totals now use organization-scoped exact-count queries instead of counting only the latest 100 loaded rows.
- Task Health and Workload descriptions explicitly disclose that those diagnostic indicators are based on the latest 100 loaded task records; this avoids implying that sample-based indicators are full-workspace totals.
- GitHub Actions Quality checks passed for commit `7a5e2b2c64c8b31d9932ce169de4e2737af98a53`: assignment tests, TypeScript typecheck, lint, production build, and Chromium offline-workspace browser tests.
- A Vercel Preview deployment for that exact commit reached READY: `dpl_C5UrtdTF6XD5RfDsegM5TMqGWQFH`. No Production deployment or promotion was performed.
- Remaining verification: authenticated owner UI smoke test on the new Preview. Preview protection was not bypassed or shared; no access link was created. Actual authenticated task-sync/result-sync HTTP E2E and browser multi-workspace verification remain separate Phase 1 release gates.
- No schema, database records, Auth settings, paid services, billing, or cloud AI execution were changed.

## Phase 1 authenticated task-sync browser verification — 2026-11-25

- [Passed in Dev Preview through the owner's signed-in browser] The owner created the temporary local draft `PHASE1 TEST - Authenticated Task Sync` with description `Temporary Dev-only verification record` and explicitly pressed **Sync tasks**. The UI confirmed `Synced 1 task(s) to the cloud`, with the local copy retained.
- [Verified in Dev database] The matching task row appeared under `KANAKO Phase 1 Test Workspace`, with the expected description, queued status, test owner's `created_by` UUID, and `metadata.source = kanako_offline_workspace` plus the stable `offline_client_id`. Exactly one matching row was present.
- [Cleanup verified] Deleted only that exact temporary task using its row ID, organization ID, title, description, and offline client ID as predicates. Follow-up counts confirmed zero remaining rows for the temporary task and the two pre-existing Phase 1 workspace tasks remained.
- [Scope of result] This is the first real signed-in browser-to-Dev HTTP verification of `POST /api/offline/sync`; it supersedes the earlier database-role simulation for the task-sync happy path. It does not yet verify task-sync retry by replaying the same HTTP request, failure handling, or authenticated cross-workspace denial through the route.
- [AI-result sync still open] Source review confirms `POST /api/offline/sync-runs` authenticates with `getUser()`, checks owner/admin membership, validates run/employee/task UUIDs and non-empty output, and delegates each accepted result to the atomic `sync_offline_agent_run` RPC. The UI currently has zero cached active employees and no local runs; all nine employee profiles remain Draft with no model or execution capability. Therefore a real browser POST test cannot be produced through the normal UI without changing employee activation/model/execution gates or injecting a synthetic local run. Neither is authorized or necessary for this safe verification step. Keep AI-result HTTP E2E as an explicit release gate; do not download a model, activate an employee, or execute AI to manufacture a test.
- [Roadmap alignment and safety] This closes the authenticated task-sync happy-path portion of the existing Phase 1 offline/API verification. Only the existing free Dev project and protected Preview were used. The temporary record was removed. No Production, schema, Auth, RLS, billing, paid service, model provider, employee profile, or cloud AI execution was changed.



## Phase 1 Analytics & QA department navigation smoke test — 2026-11-25

- [Passed in the signed-in Dev Preview UI] From the CEO Command Center, the owner opened Analytics & QA using **Review department tasks**. The application navigated to Task Center with the Analytics & QA department filter selected.
- [Record consistency verified in the UI] Task Center showed the single Analytics & QA task, **Record Phase 1 verification results**, with Low priority, Queued status, and Unassigned owner. This matched the existing Dev workspace task record.
- [Safety behavior observed] AI delegation remained gated and required explicit AI execution approval. The owner did not edit, assign, delegate, or otherwise mutate the task.
- [Scope] This closes the Analytics & QA department-to-task navigation smoke test. Together with the Operations navigation check, it verifies two distinct department links from the Command Center; it does not prove every dashboard control or the complete CEO operating loop.
- [Roadmap alignment and safety] This is verification of the existing Phase 1 department/workforce/task visibility foundation. No code, schema, database records, Production resource, billing plan, or AI execution setting was changed during this UI check.

## Phase 1 CEO Command Center interaction smoke test — 2026-11-25

- [Passed in the signed-in Dev Preview UI] The owner opened the Operations department from the CEO Command Center using **Review department tasks**. The application navigated to Task Center with the Operations department filter applied.
- [Record consistency verified in the UI] Task Center showed the single Operations task, **Verify department and workforce records**, assigned to Riley Reid, with Medium priority and Queued status. Its task history was visible. This matched the previously verified Dev workspace records.
- [Safety behavior observed] The Task Center showed that delegation to an AI employee requires AI execution approval. The owner did not edit the task, delegate it, activate an employee, or change any permissions.
- [Scope] This closes the owner-visible department-to-task navigation smoke test for the Command Center. It does not prove every dashboard control, authenticated cross-workspace browser isolation, or AI-result HTTP synchronization.
- [Roadmap alignment and safety] This is verification of the existing Phase 1 department/workforce/task visibility foundation. No code, schema, database records, Production resource, billing plan, or AI execution setting was changed during this UI check.

# Production Readiness and Live Release Governance

This policy is mandatory for every phase and every release. It defines when KANAKO AI may move from Dev/Preview into the live Production environment. Passing an individual test, completing a feature, or having a successful Preview deployment does NOT by itself authorize Production use.

## Environment rules

1. **Local / Dev:** Default environment for implementation, experiments, migrations, synthetic fixtures, regression tests, security checks, and user acceptance testing. Use free-plan resources only unless the owner explicitly approves a change.
2. **Preview / staging:** Release-candidate environment built from the exact reviewed feature-branch commit. It must use Dev/test data and safe test credentials. Preview is not Production and must never be described as live.
3. **Production:** The real live workspace and its real organization data. It is read-only for development and testing until the Production Readiness Gate below is passed and the owner gives explicit, release-specific approval.

Never use real customer or business data as test fixtures. Never copy Dev synthetic records into Production. Keep secrets, auth users, storage objects, and database resources separated by environment.

## Mandatory Production Readiness Gate

Production activation or deployment is blocked until ALL applicable items below are documented as PASS, with evidence and the exact commit/release candidate identified:

### A. Roadmap and scope
- The feature belongs to an approved roadmap phase and its acceptance criteria are complete.
- All critical and high-severity defects are resolved; remaining known limitations are documented and explicitly accepted by the owner.
- No unapproved scope, dependency, paid service, plan upgrade, model provider, or recurring cost is introduced.
- The roadmap, implementation notes, test evidence, and release notes agree on what is actually complete.

### B. Engineering and regression
- GitHub CI passes on the exact release-candidate commit: type checking, lint, production build, unit/integration tests, and applicable browser tests.
- Database migrations are reviewed for ordering, repeatability, compatibility, data impact, and rollback/recovery. Destructive or irreversible migrations require a separately approved recovery plan.
- Core user journeys are tested end-to-end in authenticated Preview using Dev data, including task lifecycle, approvals, organization/workspace isolation, offline sync/idempotency, and relevant role permissions.
- No test is described as end-to-end if it only mocks HTTP or simulates a database role. Evidence must state the actual test boundary.
- The exact release-candidate commit is frozen for review; any code change after sign-off invalidates affected test evidence and requires re-test.

### C. Security and privacy
- Authentication, authorization, owner/admin/member permissions, RLS, organization scoping, and cross-workspace denial are verified for the relevant APIs and data.
- No unresolved critical/high security finding, exposed secret, unsafe default, or known cross-tenant data leak remains.
- Sensitive data handling, logs, file access, and offline device-local storage behavior are reviewed.
- Any accepted medium/low findings have a documented impact, mitigation, and owner acceptance.

### D. Operations and recovery
- Production database backup/restore posture and a tested recovery path are confirmed before any schema or data migration.
- Deployment steps, migration order, environment variables, external integrations, monitoring, and post-deploy smoke tests are documented.
- A rollback or forward-fix plan is prepared for the application and a compatible recovery plan exists for database changes. Do not promise rollback where a migration is irreversible.
- A named release window, release owner, monitoring period, and stop/rollback criteria are defined.
- Production smoke tests are read-only or use an explicitly approved, isolated test account/fixture. Never create synthetic records in real customer workspaces without explicit approval.

### E. Cost and provider controls
- Supabase, Vercel, model providers, integrations, email/SMS, storage, and any other external service remain within the owner's approved free-plan/cost constraints.
- No paid plan, paid add-on, usage-based AI execution, billing change, or new recurring cost is activated without separate explicit approval.
- AI employee activation, cloud model calls, and external side effects remain disabled unless the owner separately approves the exact scope and controls.

### F. Owner approval
- Provide the owner a concise release brief: exact commit, scope, passed/failed tests, known limitations, security findings, migration/data impact, costs, rollback plan, and post-release checks.
- Obtain the owner's explicit approval for that specific Production release and its specified actions.
- Silence, "proceed" for Dev work, approval of a Preview test, or prior approval for a different release does NOT count as Production approval.
- If any material code, schema, data, cost, or scope change occurs after approval, pause and obtain renewed approval.

## Required release sequence

1. Implement only roadmap-approved work in the feature branch and Dev environment.
2. Run automated CI and the relevant Dev regression/security tests. Use temporary synthetic Dev fixtures only when authorized; clean them up and verify cleanup.
3. Deploy a Preview from the exact candidate commit using the free plan and Dev configuration. Do not call it Production.
4. Complete authenticated Preview acceptance tests and document which tests are real browser/API E2E versus source review, SQL simulation, or mocked browser tests.
5. Resolve blockers in the same roadmap scope. Re-run all affected tests; do not bypass a failed gate to meet a date.
6. Complete the Production Readiness Gate checklist and prepare the release brief and recovery plan.
7. STOP and request explicit, release-specific owner approval. Until approval is received, do not deploy to Production, run Production migrations, alter Production data/settings, activate cloud AI, or trigger external side effects.
8. After approval only, execute the approved release steps, verify read-only/isolated Production smoke tests, monitor, and report results. If a stop criterion is met, halt and follow the approved recovery plan.
9. Record the release commit, approval, migration identifiers, smoke-test evidence, incidents, and outcome in the roadmap/release log.

## Automatic Production blockers

Production remains blocked if any of the following applies:
- Any mandatory test or CI check fails, is missing, or has stale evidence for a different commit.
- Actual authenticated end-to-end verification is missing for a critical user journey or tenant boundary.
- A critical/high security issue or unexplained cross-workspace access remains.
- Migration impact, backup, restore, or recovery is unknown for a schema/data change.
- Required environment separation or secrets are not verified.
- Costs or provider behavior exceed or are unknown against the approved free-plan constraints.
- AI execution, customer communications, payments, bookings, or other external side effects could occur without the required explicit authorization and human approval.
- The owner has not explicitly approved the specific Production release.

## Mandatory alignment rule for all future work

Before every test, fix, refactor, or proposed resolution, identify the exact roadmap phase/objective and acceptance criterion it supports. Record the reason, expected result, test evidence, and whether it changes code, schema, data, environment, cost, or permissions. If it does not support an approved roadmap objective, do not proceed without first explaining the proposed deviation and obtaining the owner's approval. Prefer the smallest safe change that resolves the documented issue. Re-run relevant regression tests after every resolution. Keep Production untouched until the Production Readiness Gate and explicit owner approval are both satisfied.

## Current Production status

**BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.** Phase 1 is still in progress and has outstanding authenticated end-to-end release gates. Current Dev/Preview success is not Production readiness. No Production deployment, migration, data mutation, AI activation, or billing change is authorized by this policy entry.

## Phase 1 cross-workspace isolation recheck and CI run #390 — 2026-11-25

- [CI passed on the exact current branch commit] GitHub Actions run #390 (45521305302) completed with conclusion success for commit 1a747b9dd9ba7d6c5853b61c685935baaab59e22. Assignment ranking tests, TypeScript typecheck, lint, production build, Chromium installation, and offline workspace Playwright tests all passed.
- [Cross-workspace read isolation rechecked in Dev; transaction rolled back] Created a temporary organization owned by the separate permanent owner account and a fixture task inside a single database transaction. Under the Dev test user's PostgreSQL authenticated role and JWT subject, reads of the other organization's organization, membership, and task returned zero rows.
- [Cross-workspace write isolation rechecked in Dev; transaction rolled back] A direct insert into the fixture organization's task scope was explicitly attempted under the non-member authenticated role and rejected by RLS with insufficient privilege. The test transaction was rolled back, so the temporary organization, membership, and task were not persisted.
- [Boundary and limitation] This confirms the database RLS isolation behavior only. It does not exercise the protected Preview HTTP route or prove browser workspace switching across two memberships. Authenticated route-level denial and multi-workspace browser E2E remain open Phase 1 gates. The current Playwright browser suite uses mocked snapshot/sync endpoints.
- [Roadmap alignment and safety] This supports Phase 1 organization isolation and offline API authorization acceptance criteria. Dev only; no schema, migration, persistent data, Auth settings, Production resources, billing, paid service, or AI execution changed.


## Phase 1 owner-facing workspace navigation and consistency review — 2026-11-25

- [Passed in the signed-in Dev Preview UI] The owner reviewed the CEO Command Center, Virtual Office, AI Chat, Workflow Automation, Knowledge Base, Reports & Analytics, and Activity Logs without creating or changing operational records.
- [Command Center consistency] The dashboard showed 9 departments, 9 saved employee profiles, 2 open tasks, 0 pending approvals, and AI execution gated. Task health/workload indicators explicitly identify their limited loaded-record sample.
- [Virtual Office consistency] The floor showed all 9 draft employees as inactive, 2 open tasks, 0 active runs, and 0 meetings. Riley Reid's Operations profile showed the existing queued Medium task assigned to him. Victoria June's Analytics & QA profile showed no assigned task, consistent with the department's one unassigned Low-priority queued task.
- [AI Chat and workflow safety] AI Chat reported runtime not activated and disabled AI replies/tool execution. Workflow Automation showed 0 workflows and 0 runs; only manual internal actions are currently supported, with scheduled/event triggers, retries, external integrations, and AI execution disabled. No conversation or workflow was created or run.
- [Knowledge and reports consistency] Knowledge Base showed 0 documents. Reports showed the existing approved owner-authored Phase 1 Approval Test Plan with its two original tasks; no new report or plan was created.
- [Activity audit consistency] The latest 15 activity entries showed the expected approval requested/approved/rejected events, project-plan proposal/approval, task update, and nine draft employee creation events. This is a latest-15 view, not a full-history audit verification.
- [Scope and limits] These checks verify the displayed navigation, read-only workspace summaries, and consistency of the existing Dev test records. They do not complete the full CEO operating loop, prove all controls, or replace authenticated route-level E2E. Outstanding Phase 1 gates remain: signed-in HTTP verification for AI-result sync, task-sync retry/failure and cross-workspace denial, and any remaining authenticated tenant-boundary route checks. Do not activate employees, configure models, create meetings, run workflows, or execute AI merely to manufacture test evidence.
- [Roadmap alignment and safety] This records owner-visible verification of the existing Phase 1 virtual-company/workspace foundation. No application code, schema, database records, Auth settings, Production resource, Vercel deployment, billing plan, paid service, model provider, employee permissions, or AI execution setting was changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 offline synchronization gate review — 2026-11-26

- [Roadmap alignment] Phase 1 shared-workspace/offline-sync acceptance criteria: authenticated task synchronization, idempotent retry/failure behavior, AI-result synchronization through the human-review path, and organization-boundary enforcement.
- [Task-sync route source review] The signed-in POST route calls Supabase getUser(), validates a 1–50 task batch, verifies membership in the requested organization, validates UUID/title fields, checks the organization-scoped offline_client_id, and returns synced IDs. Existing browser evidence confirms one real authenticated Preview-to-Dev task POST succeeded and its exact temporary row was subsequently deleted. This does not yet prove an HTTP retry or authenticated cross-workspace denial.
- [AI-result route and RPC source review] The POST route requires a signed-in owner/admin and validates run, employee, task, and output before calling sync_offline_agent_run. The RPC is SECURITY INVOKER with empty search_path, checks owner/admin role, serializes duplicate retries with an advisory transaction lock, verifies the employee belongs to the organization and is active with task_execution and local_execution capabilities, verifies the task belongs to the same organization and is queued/blocked and not assigned elsewhere, then atomically stores the run, moves the task to in_review, and logs activity. Duplicate valid submissions return the original run ID; mismatched/incomplete reuse is rejected.
- [Test harness limitation] The current Playwright offline-workspace tests mock /api/offline/snapshot and /api/offline/sync; they test local persistence, workspace-scoped local drafts, and manual sync UI behavior, not real authenticated API authorization or database idempotency. CI #390 passed these tests, but it is not a substitute for authenticated route E2E.
- [Current safe blocker] All nine workspace employees remain Draft/inactive and have no model or execution permissions. The AI-result RPC deliberately rejects inactive employees or profiles without both task_execution and local_execution capabilities. A genuine HTTP happy-path test therefore cannot be manufactured from the current workspace without temporarily changing an employee's status/capabilities and preparing an eligible task. No such permission change or AI execution is authorized. Keep this test open rather than weakening the gate or activating an employee. A future test can use an explicitly approved temporary Dev-only fixture and fixed local output, without invoking a model, after the owner separately approves the exact temporary permission/fixture changes.
- [Next safe test sequence] Continue read-only/source-level checks and existing CI evidence. For real authenticated HTTP retry and cross-workspace route denial, use only the isolated Dev test account and temporary Dev fixture records, then delete fixtures and verify cleanup. Do not touch Production, billing, paid services, models, or external integrations.
- [Impact] This entry changes documentation only. No application code, schema, data, employee status/capabilities, Auth settings, Preview/Production deployment, billing, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 authenticated AI-result sync fixture verification — 2026-11-26

- [Roadmap alignment] This verifies the Phase 1 offline AI-result synchronization and idempotent retry acceptance criteria using an isolated synthetic Dev fixture.
- [First authenticated-role RPC submission passed] Created a temporary Dev-only employee fixture in Operations with only the two capabilities required by the existing RPC (task_execution and local_execution), plus one queued synthetic task. Under the Dev test owner's authenticated PostgreSQL role/JWT subject, sync_offline_agent_run returned synced=true, duplicate=false, status=in_review.
- [Duplicate retry passed] Replayed the same organization-scoped offline result ID with the same employee/task. The RPC returned synced=true, duplicate=true and the exact same run ID; no second run was created.
- [Atomic outcome verified] Before cleanup, exactly one run row and one activity-log row existed, and the task had transitioned to in_review.
- [Cleanup verified] Deleted the temporary run, activity entry, task, and employee fixture. Follow-up counts were zero for all four temporary record types. The nine existing employee profiles and two original Phase 1 tasks were not changed.
- [Test boundary] This is an authenticated database-role/RPC verification with a fixed synthetic output. It did not invoke a model or AI, and it is NOT an authenticated HTTP POST test through /api/offline/sync-runs. The API route's real browser/HTTP happy path, retry, and cross-workspace denial remain open E2E gates.
- [Roadmap alignment and safety] Dev only, free plan. No existing employee permissions/status, schema, Auth settings, Production resources, billing, paid services, Preview deployment, or application code were changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.

## Phase 1 offline API read-only security review — 2026-11-26

- [Roadmap alignment] This review is limited to Phase 1 authenticated workspace/offline synchronization, organization isolation, and safe human-review handoff. No feature scope was added.
- [Branch evidence] Reviewed the current branch head 57d4ccab01e45450f082b5b2af442899fa70e615 and source for POST /api/offline/sync, POST /api/offline/sync-runs, GET /api/offline/snapshot, the atomic sync RPC, related idempotency/RLS migrations, and the existing offline workspace Playwright tests.
- [Controls observed] All three routes call Supabase auth.getUser(); task sync and snapshot check organization membership; AI-result sync additionally requires owner/admin. The AI-result RPC is SECURITY INVOKER, has an empty search_path, verifies owner/admin, scopes employee and task to the same organization, checks active/local-execution capabilities, serializes retries, and records results into in_review. Database migrations define organization-scoped unique idempotency indexes for task and AI-run sync.
- [Hardening finding 1] Both sync routes iterate request arrays and access item properties without first checking that each entry is a non-null object. A malformed JSON batch containing null can throw instead of being handled as an invalid item. Add defensive item-shape validation and regression tests before considering malformed-batch handling complete.
- [Hardening finding 2] The snapshot route destructures query data but does not inspect query errors. A failed query may be represented as an empty collection, making a partial/failed snapshot look like a successful empty snapshot. Add explicit error handling and tests so incomplete snapshots fail closed with a clear server response.
- [Test coverage boundary] Existing Playwright offline workspace tests mock snapshot and task-sync endpoints. They do not cover these route-level malformed-input/error cases or actual authenticated AI-result HTTP E2E. Previously recorded database-role/RPC tests remain valid but are not HTTP route tests.
- [Impact and safety] This was a read-only source review. No application code, schema, data, Auth settings, Preview, Production, billing, AI/model execution, or paid services were changed. The two findings are Phase 1 hardening items; Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.

## Phase 1 offline API hardening fixes — 2026-11-26

- [Roadmap alignment] Resolves the two findings from the Phase 1 offline API read-only security review: malformed batch-item handling for task/result sync and fail-closed behavior when an offline snapshot query fails.
- [Task-sync fix] POST /api/offline/sync now checks each batch entry is a non-null, non-array object before reading its fields. Malformed entries are skipped using the route's existing invalid-item behavior; valid entries continue to sync.
- [AI-result sync fix] POST /api/offline/sync-runs applies the same defensive shape check before reading run fields. This prevents null, primitive, or array entries from throwing during batch processing. Existing authentication, owner/admin checks, RPC authorization, and idempotency behavior are unchanged.
- [Snapshot fix] GET /api/offline/snapshot now checks errors from the membership and organization lookups and from every required snapshot query (agents, tasks, departments, memories, learning events, previous runs, and knowledge documents). A query failure returns HTTP 500 with a clear retry message instead of silently returning a partial/empty successful snapshot. Legitimately skipped optional queries for workspaces with no eligible employees or no knowledge-read capability remain empty results.
- [Test boundary] The repository currently has Playwright browser tests and a standalone assignment-ranking test, but no route-level unit-test harness or test runner for mocking the Supabase server client. Existing Playwright tests mock these API endpoints and therefore cannot prove the new server-route branches. Do not describe those UI tests as route regression tests. Run the existing CI checks (TypeScript, lint, build, and browser suite); add dedicated authenticated route tests when a suitable test harness is approved/available. Actual authenticated AI-result HTTP E2E remains a separate open Phase 1 gate.
- [Impact] Three existing API route files changed on the approved feature branch only. No schema, migration, database records, Auth settings, employee status/capabilities, Preview/Production deployment, billing, paid services, AI/model execution, or external side effects changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 offline API hardening CI verification — 2026-11-26

- [Roadmap alignment] Verifies the existing Phase 1 offline API hardening and regression-check gate after the task-sync, AI-result sync, and fail-closed snapshot fixes.
- [CI evidence] GitHub Actions run #400 completed successfully: assignment ranking tests, TypeScript type check, ESLint, Next.js production build, Chromium installation, and offline workspace Playwright browser tests all passed. Run: https://github.com/Decker143/kanako-ai/actions/runs/45713064974.
- [Coverage limitation] The Playwright suite still mocks the offline snapshot/task-sync HTTP endpoints. This successful CI run does not constitute direct route-level regression tests, authenticated AI-result HTTP E2E, HTTP retry/failure verification, or authenticated cross-workspace denial. Those Phase 1 acceptance gates remain open.
- [Next safe step] Continue with the remaining Phase 1 authenticated route/tenant-boundary verification using only the isolated Dev workspace and approved synthetic fixtures. Do not activate real employees, enable model execution, or touch Production to manufacture test evidence.
- [Impact] Documentation-only update. No application code, schema, database data, Auth settings, employee permissions, deployment, billing, paid services, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 authenticated HTTP verification feasibility review — 2026-11-26

- [Roadmap alignment] Follow-up to the Phase 1 offline API hardening CI gate; scope remains authenticated offline task/result synchronization, retry safety, and organization isolation.
- [Route source recheck] Task sync and AI-result sync both authenticate with Supabase getUser and check workspace membership before processing. AI-result sync additionally requires owner/admin and delegates to the atomic owner/admin-checked RPC. Malformed batch elements are skipped safely. Snapshot checks errors for membership, organization, agent/task/department, memory, learning, run, and knowledge queries and returns a non-success response rather than a partial snapshot.
- [Test harness finding] Current package scripts provide assignment unit tests and Playwright E2E. Existing offline-workspace Playwright tests stub the snapshot and task-sync HTTP endpoints; repository search did not identify an existing route-level Supabase mock harness. Therefore those tests cannot prove the route authorization/query-error behaviors, and no new dependency or improvised test seam is introduced in this step.
- [Outstanding gate] Actual signed-in HTTP POST verification for AI-result sync, task-sync idempotent retry/failure, and cross-workspace route denial remains open. The previous authenticated DB-role/RPC checks are not substitutes for HTTP route tests. Completing this gate requires a safe route-level test harness or an authenticated Dev browser session; do not expose credentials, weaken auth, activate real employees, or enable AI/model execution to obtain evidence.
- [Impact] Read-only source and test-infrastructure review plus this documentation update only. No application code, schema, database data, Auth settings, employee permissions, Preview/Production deployment, billing, paid services, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 offline API handler test harness and CI verification — 2026-11-26

- [Roadmap alignment] Implements the Phase 1 regression-test gate for authenticated offline task/result sync, retry safety, workspace authorization, and fail-closed snapshot behavior. No new product feature or roadmap scope was added.
- [Test seam] Extracted the existing offline API handler logic into `lib/offline/api-handlers.ts` with explicit Supabase-client injection. The Next.js route entrypoints continue to create the normal server Supabase client and delegate to those handlers; no test-only HTTP endpoint, auth bypass, or production credential was introduced.
- [Automated coverage] Added `tests/offline-api-handlers.test.mjs` and `npm run test:offline-api`. Twelve tests cover unauthenticated task sync, task retry/idempotency at the handler boundary, task persistence failure, task workspace membership denial, AI-result owner/admin enforcement, repeated AI-result submissions passing the same idempotency key to the atomic RPC, AI-result non-member denial, AI-result RPC failure, snapshot query failure, malformed task/result batch entries, and membership-query failure.
- [CI evidence] GitHub Actions run #409 completed successfully on commit `7444fdd2db84160ce588cd1ba335d8a1a034e097`. Assignment tests, the new offline API handler tests, TypeScript, lint, Next.js build, Chromium installation, and existing offline workspace Playwright tests all passed. Run: https://github.com/Decker143/kanako-ai/actions/runs/45800161078.
- [Coverage limitation] These new tests exercise the extracted handlers with simulated Supabase responses. They are not authenticated HTTP requests against the deployed route and do not independently prove real Dev HTTP authentication, actual database idempotency over repeated HTTP requests, or cross-workspace denial through the live route. The previously completed Dev database-role/RPC checks remain separate evidence. Do not overstate this harness as authenticated HTTP E2E.
- [Preview status] A free-plan Preview deployment was requested for the exact tested feature-branch commit, deployment ID `dpl_BSKPmTo4pz29d7APEB1ubBox39qB`, URL `https://kanako-pk7eb8cop-vapepokemon143-8805.vercel.app`. At the time of this entry its Vercel state was BUILDING; no readiness or HTTP test result is claimed here.
- [Next safe step] Verify the isolated Preview build becomes READY, then perform only safe unauthenticated HTTP checks unless a valid authenticated Dev browser session is available. Do not alter test-account credentials, bypass authentication, activate real employees, enable AI/model execution, or touch Production to manufacture evidence. Keep authenticated Dev HTTP retry and cross-workspace denial open until genuinely verified.
- [Impact and safety] Feature-branch code and test/CI files only, plus this roadmap record. No schema, migration, database records, Auth settings, employee permissions, Production deployment/data, billing, paid services, or AI execution changed. Preview is not Production. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 expanded offline API handler regression coverage — CI #411 — 2026-11-26

- [Roadmap alignment] Extends the existing Phase 1 offline API authorization, malformed-input handling, and fail-closed regression coverage; no new product scope.
- [Additional tests] Added tests proving task-sync and AI-result-sync handlers safely skip null, primitive, and array entries in mixed batches, and task sync returns an error without persisting when workspace membership lookup fails.
- [CI evidence] GitHub Actions run #411 passed on commit `a96db66f64d64eeeb97fee55f3d748fc45bb8289`: assignment ranking tests, offline API handler regression tests, TypeScript, lint, Next.js build, Chromium installation, and offline workspace browser tests. Run: https://github.com/Decker143/kanako-ai/actions/runs/45801651137.
- [Test boundary] Handler tests use a simulated/injected Supabase client; existing browser tests mock API endpoints. This CI success is not proof of authenticated HTTP E2E against the live Dev database. The separate prior Dev authenticated database-role/RPC and task-sync browser evidence remains as documented; authenticated HTTP AI-result sync, task retry/failure, and cross-workspace route denial remain open.
- [Preview boundary] The READY Preview deployment previously recorded for commit `7444fdd2db84160ce588cd1ba335d8a1a034e097` predates this test-only commit and is not evidence that commit `a96db66` is deployed. No new deployment was made for this test-only change.
- [Impact and safety] Test file only plus this roadmap record. No application behavior, schema, database records, Auth settings, Production, billing, paid services, or AI/model execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 authenticated offline workspace browser checks — 2026-11-26

- [Roadmap alignment] Completes safe authenticated Dev browser checks for the existing Phase 1 offline snapshot and task-sync paths. No new product scope.
- [Snapshot HTTP/UI result] In the signed-in isolated Dev owner session, the Offline Workspace displayed “Offline snapshot refreshed successfully: 0 eligible AI employee(s), 2 queued or blocked task(s).” This is consistent with the nine employee profiles remaining Draft/inactive and the two original queued tasks. No employee was activated and no model was downloaded or run.
- [Task-sync HTTP result] A temporary local task draft was manually synced from the authenticated Preview session. The UI confirmed “Synced 1 task(s) to the cloud.” A Dev database read verified exactly one matching task row, with the expected test organization and authenticated Dev owner.
- [Cleanup] Deleted only that exact temporary task row using its verified ID, organization, title, and creator. A follow-up query confirmed zero matching temporary tasks and exactly two tasks remaining in the workspace; both original Phase 1 tasks were preserved.
- [Retry limitation] The browser UI marks a successfully synced draft as synced and no longer exposes a control to replay the same offline client ID. Therefore actual authenticated HTTP retry/duplicate protection remains unverified. Existing handler regression tests and separate authenticated database/RPC idempotency checks remain supporting but distinct evidence.
- [AI-result HTTP limitation] No eligible active employee exists in the workspace, and the AI-result route/RPC correctly requires an active employee with both task_execution and local_execution capabilities. No employee was activated, no model was downloaded, and no AI was executed. Authenticated AI-result HTTP happy-path/retry remains open.
- [CI evidence] GitHub Actions run #412 passed on branch commit `2682090068651e45ed90d94513d643da0b0d393b`: assignment ranking tests, all 12 offline API handler regression tests, TypeScript, lint, build, Chromium installation, and offline workspace browser tests. Run: https://github.com/Decker143/kanako-ai/actions/runs/45802807192.
- [Coverage boundary] CI handler tests use an injected simulated Supabase client; the existing browser suite mocks API endpoints. Neither substitutes for live authenticated HTTP retry, AI-result HTTP, or cross-workspace route-denial tests.
- [Impact and safety] Documentation-only update. Dev-only temporary task was cleaned up; the two original tasks and all nine Draft employee profiles remain unchanged. No schema, Auth settings, employee permissions, Production resources, billing, paid services, model provider, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.

## Phase 1 Command Center metric accuracy — implemented; Dev acceptance partially verified

- [Roadmap alignment] This is a Phase 1 quality improvement under the existing Command Center company-wide operating summary and workforce/task monitoring objectives. It does not introduce a new product module or expand the approved roadmap scope.
- [Problem] The current CEO Command Center calculates some task-health and workload indicators from a limited in-memory set of up to 100 recently loaded task records. When an organization has more than 100 relevant tasks, blocked, overdue, stale, unassigned, and employee/department workload indicators may omit older records and present an incomplete operational picture.
- [Recommended approach] Replace limited-page-derived organization-wide totals with exact database-side counts using the same organization, status, assignment, and due-date filters as the relevant indicators. Calculate employee and department workload from organization-wide database aggregation (or an equivalently exact, bounded query) rather than summing only the latest loaded task page. Keep task-list pagination for display; do not load every task into the browser just to calculate totals.
- [Accuracy and failure behavior] If a required count or aggregation query fails, show an unavailable/error state rather than a misleading zero or partial total. Make metric labels clear about their scope and timestamp where appropriate. Keep all queries organization-scoped and subject to existing authenticated access controls/RLS.
- [Acceptance criteria]
  1. Seed more than 100 synthetic Dev tasks across multiple statuses, departments, assignees, and due dates; confirm dashboard totals match independent exact database counts.
  2. Verify blocked, overdue, stale, unassigned, open, employee workload, and department workload values include records beyond the latest 100.
  3. Verify organization isolation: metrics for one workspace never include another workspace's tasks or employees.
  4. Verify query failures are surfaced as unavailable/error indicators, never silently converted to zero or partial success.
  5. Add automated regression coverage for >100 records, status/date/assignment filters, aggregation, and query failure handling; pass TypeScript, lint, build, and relevant browser tests.
  6. Confirm existing task-list pagination and dashboard interactions remain unchanged.
- [Implementation constraints] Dev/test data only; synthetic fixtures must be cleaned up and cleanup verified. Prefer existing Supabase capabilities and free-plan-compatible queries. No paid services, AI/model calls, employee activation, or Production schema/data changes. Review any proposed migration/RPC before applying; do not perform destructive or ambiguous changes.
- [Implementation] Implemented on the Phase 1 feature branch in `app/page.tsx` across commits `48547e25e34bc4b72ccc9086f1dd196d3c73dd29`, `65f914c2bd199e46f1c44e5edfd81ea1c8f6c6a6`, `5a0a43f283f0d33289ffa094101fc73f918d096c`, and `74dcaacc8f3a75717f3a3cfb59c2e3189225609e`. Dashboard now uses exact organization-scoped database counts for open, blocked, overdue, stale, unassigned, and high-priority tasks; exact per-active-employee workload counts; and exact per-department open, blocked, overdue, unassigned, and completed counts. Task-list pagination remains at 100 for display, while workspace-wide totals no longer depend on that page. Query failures render as unavailable (`—`) rather than zero. Recent alert details and AI-run failure counts remain explicitly limited to their loaded recent records; they are not represented as exhaustive totals.
- [Implementation approach] No schema migration, RPC, database data, Auth, or Production changes were needed. Uses existing authenticated Supabase client queries scoped by `organization_id` and existing RLS; all queries use `count: exact` and `head: true` for totals. Workload counts are queried per active employee and department, which avoids loading all task rows into the browser but adds bounded parallel database requests proportional to configured employees/departments.
- [CI verification] GitHub Actions Quality checks run #419 passed against roadmap-record commit `611eb54f3f245d429658233a62232e43d560d819`: https://github.com/Decker143/kanako-ai/actions/runs/45807333558. Assignment ranking tests, offline API handler regression tests, TypeScript type check, lint, production build, Chromium setup, and offline workspace browser tests all completed successfully. This verifies the automated project suite, not the new >100-task metric acceptance criteria or live authenticated query-failure/organization-isolation scenarios.
- [Dev acceptance — >100-task metric fixture] On 2026-11-27, ran a controlled synthetic fixture of 120 tasks in the Dev workspace across all nine departments, with varied queued/in-progress/blocked/completed statuses, priorities, due dates, and creation dates. The independent aggregate included the two original workspace tasks (122 total) and returned: 98 open, 12 blocked, 32 overdue, 30 stale (72h+), 97 unassigned, and 42 high/urgent. Department aggregates were also calculated across all 122 rows and reconciled to the workspace-wide open/blocked totals. This SQL aggregate uses the same status/date/assignment predicates as the dashboard's exact-count queries; it verifies the filter logic and >100 data shape, but does not by itself exercise the browser's Supabase count response or rendered dashboard.
- [Fixture cleanup] All 120 synthetic rows were deleted using the exact Dev organization and the unique `PHASE1 METRIC TEST ` title prefix. A follow-up query verified 0 matching temporary rows, exactly 2 workspace tasks remaining, and both original Phase 1 tasks preserved. No employee profiles were changed.
- [Coverage limitation] This workspace has zero active employees, so the per-active-employee workload display could not be exercised with synthetic assigned employees without changing employee activation/permissions. No employee was activated. Live query-failure rendering and a second-workspace runtime isolation scenario remain open; organization-scoped predicates are present in each metric query, and prior separate isolation tests remain documented.
- [Status] IMPLEMENTED ON FEATURE BRANCH — CI PASSED; >100 synthetic SQL aggregate and cleanup verified; browser-level metric acceptance, active-employee workload, query-failure, and isolation runtime tests remain pending. Do not deploy to Production. Production remains blocked under the release governance gate.
- [Release boundary] This improvement is not a Production release authorization. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE and is subject to the separate Production Readiness and Live Release Governance gate.

## Phase 1 Command Center metric follow-up — Dev read-only verification (2026-11-27)
- [Roadmap alignment] Continues the Phase 1 Command Center metric accuracy acceptance criteria: verify organization-wide totals, department aggregates, employee workload availability, query-failure behavior, and workspace-scoped access. This was a read-only check against the existing Dev workspace; no code, schema, data, Auth, permissions, environment, billing, Preview, Production, or AI execution changed.
- [Dev baseline verified] A read-only aggregate against `KANAKO Phase 1 Test Workspace` confirmed 2 existing tasks: 2 open, 0 blocked, 0 overdue, 0 stale (72h+), 1 unassigned, and 0 high/urgent. The nine department aggregates reconciled to the workspace totals: one open task in Operations and one unassigned open task in Analytics & QA; the other seven departments had zero tasks. No temporary fixture rows were present in this check.
- [Employee workload limitation] The workspace still has zero active AI employees, so per-active-employee workload rows cannot be runtime-validated without changing a profile's activation state. No employee was activated.
- [Query-failure behavior] Source review confirms failed exact-count queries are mapped to `null` and rendered as `—` with an unavailable/reload explanation. This is code-path review, not a live injected database-failure test.
- [Workspace isolation] Every Command Center exact-count query includes the active `organization_id` filter. Separate Dev authenticated-role isolation checks are already recorded above; this follow-up did not create a second workspace or modify membership.
- [Remaining acceptance gates] Authenticated Preview dashboard visual acceptance; active-employee workload with an approved safe fixture; live query-failure injection; and an authenticated runtime cross-workspace denial test remain open. Existing CI passing and Dev aggregate reconciliation do not close these gates.
- [Safety] Free-plan resources only. No Production changes. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 Command Center authenticated Preview acceptance — 2026-11-27
- [Roadmap alignment] Completes the authenticated Preview dashboard visual/content acceptance gate for the existing Phase 1 Command Center metric accuracy work. No new product scope.
- [Observed Preview state] The owner supplied the authenticated Overview / Command Center content from the protected Preview session for `KANAKO Phase 1 Test Workspace`. The page showed Supabase connected, authentication active, 9 configured departments, 9 saved AI employee definitions, 2 exact open tasks, and 0 pending approvals.
- [Metric reconciliation] Displayed task health was 0 blocked, 0 overdue, and 0 stale; workload showed 1 unassigned and 0 high-priority tasks. Department cards showed 1 open task in Operations and 1 open/unassigned task in Analytics & QA; all other departments showed zero. These values match the separately verified read-only Dev aggregate. All nine employee profiles remain Draft, so 0 active employees and no employee workload rows are expected.
- [UI and safety checks] The dashboard labels workspace-wide exact counts separately from recent-record-limited alerts and failed-run counts. It explains that a dash means a count query failed, states workload signals are informational, and confirms Kanako does not automatically reassign tasks. Authentication and database connection indicators are active; AI execution remains gated. No incorrect totals or misleading zero values were observed in the supplied page content.
- [Acceptance status] Authenticated Preview dashboard content/metric acceptance PASSED for the current Dev workspace baseline. This does not close the separate live query-failure injection, active-employee workload fixture, or authenticated cross-workspace runtime denial gates. No employee was activated and no AI execution was enabled.
- [Impact and release boundary] Inspection of the owner-supplied Preview page content only. No code, schema, database data, Auth settings, permissions, deployment, billing, paid service, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.

## Phase 1 Command Center metric acceptance — active employee and workspace isolation (2026-11-27)

- [Roadmap alignment] Completes the Phase 1 Command Center metric accuracy acceptance criteria for active-employee workload and workspace-scoped access. This is verification only; no new product scope.
- [Controlled Dev fixtures] With explicit owner approval, created a temporary synthetic active employee with no model, no provider, empty capabilities, and no execution permissions; one assigned high-priority queued task; a second temporary workspace with one task; and a temporary department. All fixtures were inside a single Dev database transaction and were rolled back.
- [Authenticated-role workload result] Under the synthetic Dev owner's authenticated database role, the main workspace query returned 3 open tasks (the 2 original tasks plus the temporary assigned task), 1 open task assigned to the synthetic active employee, and 1 visible active employee. This confirms the employee workload query has a real active employee/assignment to count while RLS is active.
- [Workspace isolation result] Under that same authenticated role, the second workspace's task count was 0. An attempted insert into the second workspace returned denied_by_rls, confirming the non-member insert was rejected by RLS.
- [Cleanup verification] The transaction was rolled back. A follow-up query verified 0 temporary organizations, departments, employees, and tasks remaining; the original workspace still has exactly 2 tasks and 0 active employees. All nine original Draft employee profiles were left unchanged.
- [Evidence boundary] This is an authenticated PostgreSQL-role/RLS simulation with temporary Dev fixtures, not an authenticated browser HTTP request to the live dashboard route. The active-employee metric and database workspace-isolation checks passed at the database level; live query-failure injection and authenticated cross-workspace HTTP route denial remain open. Source review still confirms failed metric queries map to unavailable (—) rather than zero.
- [Impact and safety] Dev-only temporary records inside a rolled-back transaction; no persistent data, schema, migration, Auth settings, permissions, Preview, Production, billing, paid services, model provider, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 Command Center metric failure helper regression — CI #428 (2026-11-27)

- [Roadmap alignment] Adds automated regression coverage for the existing Phase 1 Command Center metric accuracy and fail-closed requirements. No new product scope.
- [Implementation] Added `lib/command-center/metrics.ts` with pure helpers that preserve legitimate zero counts, map query errors to unavailable (`null`), and detect unavailable employee/department workload results. The Command Center now uses these shared helpers. Added two automated regression cases covering zero-versus-query-error handling and employee/department workload failure handling.
- [CI evidence] GitHub Actions run #428 completed successfully on feature-branch commit `71f0d0b8ad363b77f806c5b7b6a36421225989c4`. Assignment ranking tests, offline API handler and metric helper tests, TypeScript, lint, build, Chromium installation, and offline workspace browser tests all passed. Run: https://github.com/Decker143/kanako-ai/actions/runs/45863011218.
- [Coverage boundary] The new metric tests exercise pure result helpers with controlled inputs. They do not simulate a live Supabase/database query failure or prove authenticated cross-workspace denial through the deployed HTTP route. Those two runtime acceptance gates remain open.
- [Impact and safety] Feature-branch application/helper/test changes plus this roadmap record only. No database schema/data, Auth, permissions, Production, billing, paid services, model provider, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 Dev database cleanup and integrity validation — 2026-11-27

- [Roadmap alignment] Dev-only hygiene and integrity work supporting Phase 1 workspace isolation and data correctness; no product scope added.
- [Fixture identification] Confirmed the 8 initially reported records belonged to an orphaned synthetic fixture namespace whose organization and department rows were absent: one active test employee, five tasks with null titles, and two stale `running` agent runs. Found two additional orphaned organization-membership rows tied to the same missing synthetic organization and non-existent Auth users.
- [Cleanup] With explicit owner approval, deleted only the 10 identified synthetic records using exact IDs and fixture organization/user predicates. Verified the production-like Dev workspace retained exactly 1 organization, 9 departments, 9 original AI employee profiles, 2 original Phase 1 tasks, 1 legitimate membership, and 0 agent runs.
- [Policy cleanup] Compared all seven `test_*` permissive policies against the canonical organization-scoped policies already present on the same tables. Removed only the redundant test policies; the canonical membership/owner/admin policies remain. Verification returned 0 remaining `test_*` policies.
- [Foreign-key validation] Pre-validation checks found no remaining violations across the 14 affected Dev foreign keys after fixture cleanup. Validated all 14 constraints successfully; follow-up verification returned 0 unvalidated foreign keys and all 14 listed constraints report `convalidated = true`.
- [Migration tracking] Applied Dev migration version `20261126173711`, name `remove_dev_test_policies_validate_foreign_keys`; tracked the exact migration SQL in `supabase/migrations/20261126173711_remove_dev_test_policies_validate_foreign_keys.sql` on the Phase 1 feature branch.
- [Safety and scope] Dev project only. No Production database, Auth users, owner workspace records, AI employee activation, model/provider, AI execution, Vercel deployment, billing, or paid services changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 Preview environment isolation guardrail — 2026-11-27

- [Roadmap alignment] Supports the Production Readiness and Live Release Governance requirements for environment isolation and provider/cost controls. No product scope added.
- [Verified configuration] Confirmed that the four existing non-production branches (`chore/dev-schema-baseline-audit`, `feature/github-code-execution`, `feature/phase1-atomic-project-plan-approval`, and `feature/task-center-register`) each have branch-scoped Preview overrides for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, pointing to Dev project `pauzanqmxqhxczefabth`. Their latest checked Preview deployments are READY.
- [Operational control] Added `docs/PREVIEW_DEPLOYMENT_ENVIRONMENT_CHECKLIST.md` defining the mandatory branch/commit, Preview target, exact branch restriction, Dev project URL, and fresh-deployment verification steps before a Preview is used for authenticated testing or data entry.
- [Important residual risk] The global Supabase environment variables still include the Preview target and point to Production. A newly created branch without explicit branch-scoped overrides could therefore inherit Production Preview configuration. The checklist is an operational preflight; it does not technically block Vercel's automatic Preview build. Removing Preview from the global Production variables would be a separate Vercel configuration change and is not authorized by this work.
- [Impact and safety] Documentation-only GitHub changes on the Phase 1 feature branch. No application code, database schema/data, Auth, Vercel environment variables, Production deployment, billing, paid service, model/provider, or AI execution changed. Free-plan resources only. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 Dev/Production migration and schema reconciliation audit — 2026-11-27

- [Roadmap alignment] Read-only database integrity audit supporting Phase 1 database correctness and the Production Readiness Gate. No scope added.
- [Migration inventories] GitHub feature branch contains 33 SQL migration files; GitHub `main` contains 30. Dev migration history contains 7 entries; Production history contains 34. Five Dev history entries (`test_fixture_schema`, `atomic_agent_run_reservation`, `test_agent_update_policy`, `test_agent_runs_select_policy`, and `dev_additive_schema_baseline_20261124`) have no matching SQL file in the checked-in feature branch or `main`; the Dev baseline therefore cannot currently be reproduced from repository migrations. Dev also records `make_offline_run_sync_atomic` at version `20261124152148`, while the checked-in file is version `20261124150000`. Production's 34 history rows include the four original bootstrap migrations plus 30 later rows whose recorded versions/names do not exactly mirror the current GitHub filenames. These histories must not be blindly replayed or reset.
- [Schema comparison] Both databases currently expose the same 21 public tables and 206 public columns. Constraints (115), indexes (81), policies (72), and public triggers (10) have matching fingerprints. Column fingerprints differ only in `ai_agents` and `tasks`: Production requires `ai_agents.name`, `ai_agents.job_title`, and `tasks.title` to be NOT NULL; Dev permits those three columns to be NULL. All other public-table column fingerprints match.
- [Function comparison] Dev has 11 relevant public/private functions; Production has 8. The three additional Dev functions are `approve_project_plan`, `reserve_agent_task_run`, and `sync_offline_agent_run`. The two Phase 1-facing functions are present in Dev and absent from Production. The three shared private helper functions and five shared public functions have matching definition fingerprints.
- [Interpretation] This confirms the environments are not schema-identical, but does not by itself prove a defect: the extra Dev functions and relaxed Dev nullability may be deliberate test/Phase 1 differences. Production's stricter NOT NULL constraints are safer and must not be weakened to match Dev. The missing Production functions are not to be added until a release-specific migration plan has been reviewed and the Production Readiness Gate is passed.
- [Next safe step] Continue read-only mapping of each GitHub migration to the current schema objects and the recorded migration history. Prepare a proposed canonical migration-history strategy and Dev-only corrective migration plan for review; do not apply migrations, rewrite history, reset, rebase, or alter either database without a separate explicit approval.
- [Impact and safety] Read-only catalog queries and GitHub file inspection only. No code, schema, data, Auth, permissions, deployment, billing, paid service, model/provider, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.


## Phase 1 Dev migration-history object mapping — 2026-11-28

- [Roadmap alignment] Continues the Phase 1 database correctness and migration reproducibility audit. Read-only inspection of the Dev catalog and checked-in feature-branch migrations; no new product scope.
- [Historical test migrations] Rechecked the five Dev migration-history entries with no matching SQL file in the repository. The two policy entries correspond to the seven redundant `test_*` policies already removed and verified absent; the canonical organization-scoped policies remain. No current base table or schema name containing `test` remains in Dev. The earlier fixture cleanup also verified the original workspace data and 14 foreign keys.
- [Atomic reservation migration residue] The Dev-only `public.reserve_agent_task_run(uuid, uuid, uuid, jsonb)` function remains. Its catalog comment and live definition describe an atomic reservation path that checks owner/admin membership, active/available employee status, configured model and task-execution capability, task/workspace/department eligibility, and concurrency capacity before creating a running row and moving the task to `in_progress`. It is SECURITY INVOKER, has an empty search path, and is executable by `authenticated` but not `anon`. This is a retained Dev-only execution entry point whose originating migration SQL is missing from Git; it must not be assumed to be part of the canonical reproducible baseline until its origin and intended lifecycle are resolved.
- [Execution remains gated] Current Dev state has 9 employee profiles, 0 active employees, 0 configured models, and 0 agent runs (including 0 running). Therefore the reservation function's eligibility checks currently reject the saved Draft workforce. No function was invoked and no AI execution occurred.
- [Tracked Phase 1 function mapping] The checked-in feature-branch migrations `20261124140000_add_atomic_project_plan_approval.sql` and `20261124150000_make_offline_run_sync_atomic.sql` define `approve_project_plan` and `sync_offline_agent_run`, respectively. The Dev catalog contains corresponding functions with the same core transaction, authorization, idempotency, and task-transition logic. Dev history records the offline sync migration under a different version (`20261124152148`), so version/name reconciliation is still required; no claim is made that the history is reproducible.
- [Test-policy residue] The current catalog query confirms no remaining policy names containing `test`; canonical policies on `agent_runs`, `ai_agents`, `reports`, and `tasks` remain workspace-scoped. The removed policies are not required to be recreated.
- [Next safe step] Continue read-only provenance mapping for `test_fixture_schema`, `dev_additive_schema_baseline_20261124`, and `atomic_agent_run_reservation`; inspect the historical changeset/source evidence if available, and prepare a proposed baseline strategy. Do not drop the retained reservation function, rewrite migration history, create/apply migrations, reset, or modify Dev/Production without separate explicit approval.
- [Impact and safety] Read-only Dev catalog queries and GitHub migration-file inspection plus this roadmap documentation update only. No application code, database schema/data, Auth, permissions, deployment, billing, paid service, model/provider, or AI execution changed. Production remains BLOCKED — NOT AUTHORIZED FOR LIVE RELEASE.
