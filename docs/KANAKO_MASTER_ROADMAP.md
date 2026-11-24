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
4. [Foundation implemented] CEO Command Center shows workforce readiness, overdue/blocked/unassigned work, failed workflow runs, and executive alerts. Continue with department health, workload balancing, run outcomes, and pending approvals.
5. [Implemented foundation] Employee profiles store skill tags, maximum concurrent tasks, and availability. CEO delegation ranks eligible employees by skill fit, department, capacity, and recent outcomes; an atomic RLS-respecting database function rechecks capacity before assignment. Fuller performance history and load-balancing tests remain.
6. [Expanded rollback-only regression suite passed in Dev] `supabase/tests/phase1_regression.sql` covers organization and learning read isolation; project-plan authorization, cross-workspace protection, validation, duplicate protection, and atomic rollback; task review/completion; learning approval and non-member write rejection; capacity-aware assignment rejection at the configured concurrent-task limit; and offline sync idempotency and invalid replay cases. The capacity boundary test passed in Dev and temporary agent/task fixtures were rolled back (zero leftovers). GitHub Actions database CI remains deferred: the repository lacks a full-schema baseline, `supabase/config.toml`, and `seed.sql`, while the current SQL suite depends on a pre-created Dev workspace and owner identity. Browser-level offline tests remain.
7. Only after expanding and automating the regression coverage, continue with workflow triggers and advanced research.

## Release gates
- A green CI run for the exact commit.
- Supabase migrations applied and verified.
- RLS and API authorization tests pass.
- Offline and online flows tested on real supported browsers/devices.
- AI/provider spending explicitly approved before any billable model call.
- Production deployment explicitly approved by the owner.
