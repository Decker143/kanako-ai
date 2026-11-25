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
