# KANAKO AI

KANAKO AI is a secure, organization-based virtual office platform built with Next.js 16, Supabase, Vercel, and the Vercel AI SDK.

## Connected services

- **GitHub** — source control and automated quality checks.
- **Vercel** — Next.js hosting, server-side execution, and AI Gateway integration.
- **Supabase** — authentication, Postgres data, organization isolation, and Row Level Security.

## Implemented foundation

- Email/password sign-up, sign-in, sign-out, and email verification callback.
- Organization onboarding with nine default departments, including CEO Office and Kanako assigned as AI CEO.
- Organization-scoped dashboard, departments, task queue, and task assignment.
- AI employee profile management with draft/paused/active lifecycle.
- Guarded AI employee task execution with persistent agent run records.
- Human approval requests and owner/admin decisions.
- Manual workflow executor with durable run history, single-running-run protection, and four internal-only actions: create task, request approval, search knowledge, and log activity.
- AI CEO task delegation endpoint that selects only an eligible active AI employee and assigns the task without starting execution.
- Organization knowledge documents stored in Postgres.
- Persistent conversations and AI chat endpoint.
- Reports library and activity log.
- Supabase RLS on all application tables, including agent execution runs.
- GitHub Actions type-check, lint, and production build validation.

## AI execution and spending guard

AI model execution is intentionally **disabled by default** using `KANAKO_AI_EXECUTION_ENABLED=false`. This prevents model-provider calls until the workspace owner explicitly approves AI usage and spending.

When approved, configure a valid Vercel AI Gateway model ID (provider/model format) and use Vercel AI Gateway OIDC on Vercel deployments or an AI Gateway API key for local development. Only workspace owners and admins can use billable AI execution. Never expose provider credentials in browser code.

AI employees must have a model configured and be explicitly activated before they can run assigned tasks. Workflow execution is limited to explicitly activated manual workflows and internal database actions. Scheduled/event triggers, external integrations, and autonomous tool access are not enabled. AI CEO delegation is also gated by `KANAKO_AI_EXECUTION_ENABLED` and does not execute the delegated task.

## Environment

Copy `.env.example` to `.env.local`. Required Supabase values are available in the Supabase project settings and are already configured in the linked Vercel project. Never commit secrets or use the Supabase service-role key in browser code.

## Local development

```bash
npm install
npm run dev
```

Node.js 20.9+ is required. Next.js 16 uses `proxy.ts` for Supabase session refresh.

## Validation

GitHub Actions runs:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Deployment policy

The repository is linked to the existing Vercel project `kanako-ai`. Automatic Git deployments are disabled while development and review continue. Do not deploy to production until the owner explicitly approves.


## AI employee permissions

AI employee capabilities are owner/admin-managed and enforced by the server at execution time:

- `task_execution`: required before an employee can be activated or run a task.
- `knowledge_read`: allows the employee run to receive organization Knowledge Base documents.
- `department_read`: allows the employee run to receive department descriptions.

New employees start with no capabilities. Permissions are an allowlist; unselected context is not sent to the model. A database partial unique index prevents more than one running AI execution for the same task in an organization. Model execution remains disabled until explicitly approved.


## Human review of AI work

AI employee task outputs enter `in_review` after a successful model run. Workspace owners and admins can approve the result (which completes the task) or request revisions (which returns the task to the queue). Review decisions, reviewer identity, timestamps, and optional notes are stored with the run output and included in activity logs. The regular task status form cannot bypass an outstanding AI review. A database trigger also blocks direct API/database completion unless the latest successful AI run has an explicit approved decision. A revision request returns the task to the queue; it must be re-run and approved before completion.


AI employees can only start tasks in `queued` or `blocked` status. Tasks in `in_review` cannot be rerun or reassigned; an owner/admin must approve the current output or request revisions first. A revision returns the task to `queued`, where a new execution can be started.


## Evolving AI employees

KANAKO records task approvals, revision requests, and failed runs in `agent_learning_events`. Reviewer corrections become pending `agent_memories`; owners/admins must approve a memory before it is injected into future runs. AI employees also receive recent learning history and their own approved memories as task context. Memories are scoped to one employee and organization, are never silently written into the employee's core instructions, and cannot override current instructions or safety rules.

This is retrieval-based learning, not model fine-tuning or autonomous self-modification. It improves future behavior by reusing approved feedback and examples while keeping a human review boundary.

## Offline-first workspace

The `/offline` route is a static PWA shell that can be cached by the service worker. It uses WebLLM to run a small quantized Llama 3.2 1B model locally in a WebGPU-capable browser. The model must be downloaded once while online; subsequent local chat and cached employee task execution can run without sending prompts to a cloud model. An employee can remain a draft for cloud purposes and still be included in the offline snapshot when both `task_execution` and `local_execution` permissions are explicitly granted. Browser/device support and memory availability vary.

Offline task drafts, local chat history, employee snapshots, and local AI run outputs are stored in IndexedDB on that device. The employee snapshot contains only active/draft employees with explicit local execution permission, queued/blocked tasks, approved memories, and recent feedback. Task drafts can be manually synchronized to the selected organization when the user is online and signed in. Local employee results can also be synced into the cloud AI Workforce queue, where they enter `in_review` and require owner/admin approval. The sync endpoint is idempotent. Offline mode does not provide cloud database access, live web research, shared conversations, or external integrations. Browser storage may be cleared or evicted, so this is not a replacement for backups. Cached workspace data is stored in the local browser profile; use a trusted device and do not use offline caching on a shared/public computer.

## Permission-gated internet research

AI employees can use the `internet_research` capability only when `KANAKO_WEB_RESEARCH_ENABLED=true` and `BRAVE_SEARCH_API_KEY` are configured on the server. The adapter uses Brave's LLM Context endpoint, returns source URLs and excerpts to the model, and limits each run to a small number of tool steps. Search results are treated as untrusted reference content.

No Brave key or plan has been configured. Brave Search requires an activated plan and prepaid credits; the provider currently advertises $5 per 1,000 requests and $5 monthly credits. Do not enable or purchase it without explicit approval. A model configured for the agent must support tool calling for this feature to work.


## Product roadmap and architecture

The complete product vision, implementation status, delivery phases, and release gates are maintained in [docs/KANAKO_MASTER_ROADMAP.md](docs/KANAKO_MASTER_ROADMAP.md). The system boundaries, permissions, online/offline model, learning safety, and approval architecture are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
