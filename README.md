# encouraged.app

A friendly, mobile-first accountability app. Create private groups, set shared goals, and cheer each other on. Built with Next.js 16, Supabase (Auth + Postgres + RLS), and Resend.

- **Design spec:** `docs/superpowers/specs/2026-06-05-encouraged-app-design.md`
- **Implementation plans:** `docs/superpowers/plans/`

## Prerequisites

- Node.js 20+ (tested on 24)
- pnpm 10+
- Docker Desktop (for local Supabase) — must be running

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (Postgres, Auth, Studio, Mailpit). Docker must be running.
pnpm dlx supabase start

# 3. Create .env.local from the template, then fill in the keys printed by:
#    pnpm dlx supabase status
cp .env.example .env.local
#    Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.

# 4. Apply the database migrations (schema + RLS + triggers)
pnpm dlx supabase db reset

# 5. Seed sample accounts (see below)
pnpm seed

# 6. Run the app
pnpm dev
```

Open http://localhost:3000 — you'll be routed to the login page.

### Sample accounts

`pnpm seed` creates these (all password `Password123!`):

| Email | Password |
| --- | --- |
| `alice@encouraged.test` | `Password123!` |
| `bob@encouraged.test` | `Password123!` |
| `carol@encouraged.test` | `Password123!` |

> Re-run `pnpm seed` after every `pnpm dlx supabase db reset` (a reset wipes the database).

### Local tooling

- **Supabase Studio:** http://127.0.0.1:54323 (browse tables/auth)
- **Mailpit (local email inbox):** http://127.0.0.1:54324 (auth confirmation / reset emails land here in dev)

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run the Vitest suite |
| `pnpm lint` | ESLint |
| `pnpm seed` | Seed sample accounts into local Supabase |

## Environment variables

See `.env.example`. Summary:

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-safe Supabase key |
| `SUPABASE_SECRET_KEY` | Server-only key (bypasses RLS — never expose to the browser) |
| `NEXT_PUBLIC_APP_URL` | Base app URL (used in email links) |
| `RESEND_API_KEY` | Resend API key (transactional email) |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `encouraged <hi@yourdomain.com>` |
| `CRON_SECRET` | Bearer secret for the goal-expiry cron endpoint |

## Production setup (when deploying)

1. **Supabase:** create a cloud project. Push migrations with `pnpm dlx supabase db push` (link the project first). Copy its publishable/secret keys into your host's env.
2. **Auth email:** configure Supabase Auth → SMTP to use Resend (the built-in email is heavily rate-limited). Add your production `${NEXT_PUBLIC_APP_URL}/auth/confirm` to Supabase Auth **Redirect URLs**.
3. **Resend:** verify your sending domain and set `RESEND_API_KEY` / `RESEND_FROM_EMAIL`.
4. **Vercel:** deploy, set all env vars, and add the goal-expiry cron in `vercel.json` (added in the Notifications phase).

## Architecture notes

- **Routing/session:** `proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session and guards `/app` and `/onboarding`. `/` routes signed-in users to `/app` and everyone else to `/auth/login`.
- **DB access:** browser/server/proxy Supabase clients live in `src/lib/supabase/`. Cross-user writes (fan-out) go through `security definer` Postgres functions; the `admin` client (secret key) is server-only for cron.
- **Domain logic:** pure, unit-tested helpers in `src/lib/domain/`.
- **One group per user** is enforced by a `unique(user_id)` constraint on `group_members`.
