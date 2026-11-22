# KANAKO AI

KANAKO AI is a secure, organization-based AI office platform built with Next.js 16, Vercel, and Supabase.

## Current foundation

- Supabase email/password authentication using cookie-based SSR sessions.
- Organization onboarding using the `create_organization` database function.
- Organization-scoped department and task dashboard.
- Task creation and status updates enforced by Supabase Row Level Security.
- Vercel environment variables are configured for the linked Supabase project.

## Environment

Copy `.env.example` to `.env.local` and provide the Supabase project URL and publishable key. Never put a Supabase service-role key in a browser environment or commit secrets.

## Run locally

```bash
npm install
npm run dev
```

Node.js 20.9+ is required. The app uses Next.js 16 and its `proxy.ts` request hook for Supabase session refresh.

## Deployment

The repository is linked to the Vercel project `kanako-ai`. Production deployment is intentionally gated until the application has been reviewed and approved.

## Security

All application data is organization-scoped with database RLS. AI agent records are not treated as operational workers until an actual model provider and execution runtime are configured.
