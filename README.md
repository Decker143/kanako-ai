# KANAKO AI

KANAKO AI is a secure, organization-based virtual office platform built with Next.js 16, Supabase, Vercel, and the Vercel AI SDK.

## Connected services

- **GitHub** — source control and automated quality checks.
- **Vercel** — Next.js hosting, server-side execution, and AI Gateway integration.
- **Supabase** — authentication, Postgres data, organization isolation, and Row Level Security.

## Implemented foundation

- Email/password sign-up, sign-in, sign-out, and email verification callback.
- Organization onboarding with eight default departments.
- Organization-scoped dashboard, departments, task queue, and task assignment.
- AI employee profile management with draft/paused/active lifecycle.
- Guarded AI employee task execution with persistent agent run records.
- Human approval requests and owner/admin decisions.
- Workflow draft builder and step definitions.
- Organization knowledge documents stored in Postgres.
- Persistent conversations and AI chat endpoint.
- Reports library and activity log.
- Supabase RLS on all application tables, including agent execution runs.
- GitHub Actions type-check, lint, and production build validation.

## AI execution and spending guard

AI model execution is intentionally **disabled by default** using `KANAKO_AI_EXECUTION_ENABLED=false`. This prevents model-provider calls until the workspace owner explicitly approves AI usage and spending.

When approved, configure a valid Vercel AI Gateway model ID (provider/model format) and use Vercel AI Gateway OIDC on Vercel deployments or an AI Gateway API key for local development. Only workspace owners and admins can use billable AI execution. Never expose provider credentials in browser code.

AI employees must have a model configured and be explicitly activated before they can run assigned tasks. Workflow automation remains draft-only until the durable workflow executor and integration permissions are implemented.

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
