<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Senna Brands Realtime Monitoring

Custom dashboard for monitoring Ayrton Senna site (ayrtonsenna.com.br, GA4 property `343005835`) during events and for general analytics.

## Stack
- Next.js 16 (App Router) + React 19 + Tailwind 4
- Supabase (Postgres + Auth) — project `sennabrands-executive-dashboard` ref `jttmabkkkdardzfptdiu`
- Vercel deploy + Vercel Cron for ingestion
- GA4 Data API via `@google-analytics/data` SDK

## Architecture

```
GA4 Data API ──┬─[Realtime API on-demand]─▶ /api/realtime ──▶ Cliente (poll 10s)
               │
               └─[Hourly cron]─▶ /api/cron/ingest ──▶ Supabase ──▶ Dashboard pages
```

- **Realtime**: GA4 Realtime API hit on demand from `/api/realtime`. No persistence.
- **Historical**: hourly Vercel Cron writes into Supabase tables (traffic, demographics, acquisition, behavior).
- **Auth**: Supabase magic link, allowlist `@ivoire.ag` and `@senna.com` (RLS + middleware enforced).

## Key paths

- `lib/ga4.ts` — singleton GA4 client (handles file-based or JSON-string credentials)
- `lib/supabase/{server,client,middleware}.ts` — Supabase clients per execution context
- `middleware.ts` — auth gate (redirects unauthenticated users to `/login`)
- `app/(auth)/login/` — magic link login UI
- `app/(dashboard)/` — protected dashboard pages
- `app/api/realtime/` — server-side realtime endpoint
- `app/api/cron/ingest/` — Vercel Cron handler (protected by `CRON_SECRET`)
- `supabase/migrations/` — DDL + RLS policies

## Credentials & env

See `.env.example`. **Never** commit `.env.local`.

In production (Vercel), the GA4 SA credentials must be set as `GOOGLE_APPLICATION_CREDENTIALS_JSON` (the entire JSON file content as a single env var string), not as a file path.

## How to run locally

```bash
cp .env.example .env.local
# preencher Supabase keys (Settings > API no Supabase Studio)
# CRON_SECRET=$(openssl rand -hex 32)
npm run dev
```

## Conventions

- Server Components by default — `'use client'` only quando necessário
- `cookies()` and `headers()` from `next/headers` are **async** (Next 15+)
- Route handlers em `app/<path>/route.ts`
- Para escrever no banco com bypass de RLS, use `createSupabaseAdminClient()` (server-only)
