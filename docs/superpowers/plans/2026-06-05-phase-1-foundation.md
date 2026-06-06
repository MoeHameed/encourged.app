# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the encouraged.app skeleton — Next.js 16 app, Supabase (local, with full schema + RLS + auth trigger), email/password auth, onboarding, and a mobile app shell — so feature phases can build on a working, testable base.

**Architecture:** Next.js 16 App Router (src dir) on Vercel; Supabase for Auth + Postgres + RLS, accessed via `@supabase/ssr` (browser/server/middleware clients). Pure domain logic lives in `src/lib/domain/` as framework-free, unit-tested functions. DB schema/RLS/triggers are versioned SQL migrations applied to a local Supabase stack (Docker).

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind, shadcn/ui, `@supabase/ssr`, `@supabase/supabase-js`, Supabase CLI (via `pnpm dlx`), Vitest, @testing-library/react, jsdom.

**Conventions for every task:** package manager is `pnpm`; the Supabase CLI is invoked as `pnpm dlx supabase`; Docker Desktop must be running before any `supabase` command. Commit messages follow Conventional Commits.

---

### Task 1: Scaffold the Next.js 16 app

**Files:**
- Create: entire Next.js scaffold at repo root (`package.json`, `src/app/*`, `tsconfig.json`, `next.config.ts`, `tailwind` config, `.gitignore`, etc.)

- [ ] **Step 1: Initialize git**

Run: `git init && git branch -M main`
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Scaffold into the repo root**

Run:
```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```
Expected: project files created. The existing `docs/` folder is preserved (create-next-app only blocks on conflicting files like `package.json`, not arbitrary folders). If it refuses due to `docs/`, temporarily `mv docs ../docs-tmp`, scaffold, then `mv ../docs-tmp docs`.

- [ ] **Step 3: Verify it builds and the dev server boots**

Run: `pnpm build`
Expected: `Compiled successfully`. Then `pnpm dev` boots on `http://localhost:3000` (Ctrl-C after confirming "Ready").

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 app"
```

---

### Task 2: Test tooling (Vitest + Testing Library)

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `src/lib/__tests__/smoke.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```
(Keep the existing `dev`/`build`/`start`/`lint` scripts.)

- [ ] **Step 5: Write a smoke test** — `src/lib/__tests__/smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: add Vitest + Testing Library"
```

---

### Task 3: shadcn/ui base components

**Files:**
- Create: `components.json`, `src/components/ui/*`, `src/lib/utils.ts` (generated)

- [ ] **Step 1: Initialize shadcn**

Run: `pnpm dlx shadcn@latest init -d`
Expected: creates `components.json`, `src/lib/utils.ts`, and base Tailwind tokens. (`-d` accepts defaults.)

- [ ] **Step 2: Add the base components used across the app**

Run:
```bash
pnpm dlx shadcn@latest add button card input textarea label dialog badge avatar dropdown-menu sonner skeleton
```
Expected: files added under `src/components/ui/`.

- [ ] **Step 3: Verify build still passes**

Run: `pnpm build`
Expected: `Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: add shadcn/ui base components"
```

---

### Task 4: Supabase clients + local stack

**Files:**
- Create: `supabase/config.toml` (via init), `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `middleware.ts`, `.env.local`, `.env.example`

- [ ] **Step 1: Install Supabase libs**

Run: `pnpm add @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Initialize Supabase and start the local stack**

Run:
```bash
pnpm dlx supabase init
pnpm dlx supabase start
```
Expected: Docker pulls images, then prints `API URL`, `anon key`, `service_role key`, `DB URL`. (Docker Desktop must be running.) Copy the anon/service keys for the env files.

- [ ] **Step 3: Create `.env.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@yourdomain.com
CRON_SECRET=
```

- [ ] **Step 4: Create `.env.local`** with the real local values from Step 2 (anon + service_role keys). Confirm `.env.local` is in `.gitignore` (create-next-app adds it).

- [ ] **Step 5: Browser client** — `src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 6: Server client** — `src/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component; safe to ignore when middleware refreshes sessions
          }
        },
      },
    },
  );
}
```

- [ ] **Step 7: Middleware session helper** — `src/lib/supabase/middleware.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/app", "/onboarding"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  return response;
}
```

- [ ] **Step 8: Root middleware** — `middleware.ts`

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 9: Verify build**

Run: `pnpm build`
Expected: `Compiled successfully`.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: add Supabase clients, middleware, env scaffolding"
```

---

### Task 5: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

- [ ] **Step 1: Write the schema migration** — `supabase/migrations/0001_schema.sql`

```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'UTC',
  email_on_new_goal boolean not null default true,
  email_on_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- group_members  (unique(user_id) enforces one-group-only)
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  unique(user_id)
);

-- group_invites  (email = single-use; link = multi-use)
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  type text not null check (type in ('email','link')),
  token text unique not null,
  invited_email text,
  max_uses integer,
  uses integer not null default 0,
  created_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('personal','group')),
  group_id uuid references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'active'
    check (status in ('active','expired','completed_by_everyone','archived','completed')),
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- goal_assignments
create table public.goal_assignments (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','completed','partial','skipped')),
  last_note text,
  completed_at timestamptz,
  is_late boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(goal_id, user_id)
);

-- completion_records (append-only)
create table public.completion_records (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('done','partial','skipped')),
  note text,
  is_late boolean not null default false,
  created_at timestamptz not null default now()
);

-- notifications (per-user)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- group_activity (shared feed, append-only)
create table public.group_activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  goal_id uuid references public.goals(id) on delete cascade,
  type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

-- helpful indexes
create index on public.group_members(group_id);
create index on public.goals(group_id) where group_id is not null;
create index on public.goal_assignments(user_id);
create index on public.goal_assignments(goal_id);
create index on public.notifications(user_id, read_at);
create index on public.group_activity(group_id, created_at desc);
create index on public.completion_records(goal_id, created_at desc);
```

- [ ] **Step 2: Apply via local reset**

Run: `pnpm dlx supabase db reset`
Expected: migrations applied, no errors; ends with `Finished supabase db reset`.

- [ ] **Step 3: Verify tables exist**

Run:
```bash
pnpm dlx supabase db reset >/dev/null 2>&1; psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\dt public.*"
```
Expected: lists all 9 tables (profiles, groups, group_members, group_invites, goals, goal_assignments, completion_records, notifications, group_activity).
(If `psql` is unavailable, use `pnpm dlx supabase db reset` success as the gate; the migration parses cleanly or it fails.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(db): add schema migration"
```

---

### Task 6: RLS policies, helper, and new-user trigger

**Files:**
- Create: `supabase/migrations/0002_rls_and_triggers.sql`

- [ ] **Step 1: Write the migration** — `supabase/migrations/0002_rls_and_triggers.sql`

```sql
-- SECURITY DEFINER helper avoids recursive RLS on group_members
create or replace function public.current_user_group_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select group_id from public.group_members where user_id = auth.uid();
$$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_groups_updated before update on public.groups
  for each row execute function public.set_updated_at();
create trigger trg_goals_updated before update on public.goals
  for each row execute function public.set_updated_at();
create trigger trg_assignments_updated before update on public.goal_assignments
  for each row execute function public.set_updated_at();

-- auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- enable RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.goals enable row level security;
alter table public.goal_assignments enable row level security;
alter table public.completion_records enable row level security;
alter table public.notifications enable row level security;
alter table public.group_activity enable row level security;

-- profiles
create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "read group profiles" on public.profiles for select
  using (id in (select user_id from public.group_members where group_id = public.current_user_group_id()));
create policy "update own profile" on public.profiles for update using (id = auth.uid());

-- groups
create policy "members read group" on public.groups for select
  using (id = public.current_user_group_id());
create policy "owner/admin update group" on public.groups for update
  using (id in (select group_id from public.group_members
                where user_id = auth.uid() and role in ('owner','admin')));
create policy "owner deletes group" on public.groups for delete
  using (owner_id = auth.uid());
create policy "any user creates group" on public.groups for insert
  with check (owner_id = auth.uid());

-- group_members
create policy "read members of my group" on public.group_members for select
  using (group_id = public.current_user_group_id());
create policy "insert self as member" on public.group_members for insert
  with check (user_id = auth.uid());

-- group_invites (management; validation/redemption happens via SECURITY DEFINER RPCs in later phases)
create policy "owner/admin manage invites" on public.group_invites for all
  using (group_id in (select group_id from public.group_members
                      where user_id = auth.uid() and role in ('owner','admin')))
  with check (group_id in (select group_id from public.group_members
                      where user_id = auth.uid() and role in ('owner','admin')));

-- goals
create policy "read own personal goals" on public.goals for select
  using (scope = 'personal' and created_by = auth.uid());
create policy "read my group goals" on public.goals for select
  using (scope = 'group' and group_id = public.current_user_group_id());
create policy "create personal goal" on public.goals for insert
  with check (scope = 'personal' and created_by = auth.uid());
create policy "owner/admin create group goal" on public.goals for insert
  with check (scope = 'group' and group_id in
    (select group_id from public.group_members where user_id = auth.uid() and role in ('owner','admin')));
create policy "owner/admin update group goal" on public.goals for update
  using (scope = 'group' and group_id in
    (select group_id from public.group_members where user_id = auth.uid() and role in ('owner','admin')));
create policy "update own personal goal" on public.goals for update
  using (scope = 'personal' and created_by = auth.uid());

-- goal_assignments
create policy "read own assignments" on public.goal_assignments for select
  using (user_id = auth.uid());
create policy "read group assignments" on public.goal_assignments for select
  using (goal_id in (select id from public.goals where group_id = public.current_user_group_id()));
create policy "update own assignment" on public.goal_assignments for update
  using (user_id = auth.uid());
create policy "insert own assignment" on public.goal_assignments for insert
  with check (user_id = auth.uid());

-- completion_records (append-only)
create policy "insert own completion" on public.completion_records for insert
  with check (user_id = auth.uid());
create policy "read own completions" on public.completion_records for select
  using (user_id = auth.uid());
create policy "read group completions" on public.completion_records for select
  using (goal_id in (select id from public.goals where group_id = public.current_user_group_id()));

-- notifications
create policy "read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update using (user_id = auth.uid());

-- group_activity
create policy "read my group activity" on public.group_activity for select
  using (group_id = public.current_user_group_id());
```

- [ ] **Step 2: Apply and verify**

Run: `pnpm dlx supabase db reset`
Expected: applies both migrations cleanly; ends with `Finished supabase db reset`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(db): add RLS, updated_at + new-user triggers, helper fn"
```

---

### Task 7: Domain logic module (TDD)

Pure, framework-free functions used by feature phases. Establishes the `src/lib/domain/` pattern and TDD rhythm.

**Files:**
- Create: `src/lib/domain/goals.ts`, `src/lib/domain/goals.test.ts`

- [ ] **Step 1: Write failing tests** — `src/lib/domain/goals.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  displayNameFallback,
  mapActionToStatus,
  isLate,
  computeDueAtEndOfDay,
  isGoalCompletedByEveryone,
} from "./goals";

describe("displayNameFallback", () => {
  it("returns the name when present", () => {
    expect(displayNameFallback("Mo", "mo@x.com")).toBe("Mo");
  });
  it("falls back to the email local-part", () => {
    expect(displayNameFallback("", "aisha@x.com")).toBe("aisha");
    expect(displayNameFallback(null, "nate@x.com")).toBe("nate");
  });
});

describe("mapActionToStatus", () => {
  it("maps completion actions to assignment statuses", () => {
    expect(mapActionToStatus("done")).toBe("completed");
    expect(mapActionToStatus("partial")).toBe("partial");
    expect(mapActionToStatus("skipped")).toBe("skipped");
  });
});

describe("isLate", () => {
  it("is false when there is no due date", () => {
    expect(isLate(null, new Date("2026-06-05T12:00:00Z"))).toBe(false);
  });
  it("is true only after the due date", () => {
    const due = new Date("2026-06-05T00:00:00Z");
    expect(isLate(due, new Date("2026-06-04T23:59:00Z"))).toBe(false);
    expect(isLate(due, new Date("2026-06-05T00:00:01Z"))).toBe(true);
  });
});

describe("computeDueAtEndOfDay", () => {
  it("returns end-of-day in the given IANA timezone as a UTC instant", () => {
    // 2026-06-05 end-of-day in New York (EDT, UTC-4) => 2026-06-06T03:59:59.999Z
    const d = computeDueAtEndOfDay("2026-06-05", "America/New_York");
    expect(d.toISOString()).toBe("2026-06-06T03:59:59.999Z");
  });
  it("returns null for an empty date", () => {
    expect(computeDueAtEndOfDay("", "UTC")).toBeNull();
  });
});

describe("isGoalCompletedByEveryone", () => {
  it("is true only when every member is 'completed'", () => {
    expect(isGoalCompletedByEveryone(["completed", "completed"])).toBe(true);
    expect(isGoalCompletedByEveryone(["completed", "partial"])).toBe(false);
    expect(isGoalCompletedByEveryone(["completed", "skipped"])).toBe(false);
    expect(isGoalCompletedByEveryone([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/lib/domain/goals.test.ts`
Expected: FAIL — cannot find module `./goals`.

- [ ] **Step 3: Implement** — `src/lib/domain/goals.ts`

```ts
export type CompletionAction = "done" | "partial" | "skipped";
export type AssignmentStatus =
  | "not_started"
  | "completed"
  | "partial"
  | "skipped";

export function displayNameFallback(
  name: string | null | undefined,
  email: string,
): string {
  if (name && name.trim()) return name;
  return email.split("@")[0];
}

export function mapActionToStatus(action: CompletionAction): AssignmentStatus {
  return action === "done" ? "completed" : action;
}

export function isLate(dueAt: Date | null, now: Date): boolean {
  if (!dueAt) return false;
  return now.getTime() > dueAt.getTime();
}

// Returns the UTC instant for 23:59:59.999 of `dateStr` (YYYY-MM-DD) in `tz`.
export function computeDueAtEndOfDay(
  dateStr: string,
  tz: string,
): Date | null {
  if (!dateStr) return null;
  // Find the UTC offset for this date in tz, then build the instant.
  const [y, m, d] = dateStr.split("-").map(Number);
  // Probe noon UTC of that calendar day to read the zone's offset.
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const tzString = probe.toLocaleString("en-US", { timeZone: tz });
  const asTz = new Date(tzString);
  const offsetMs = asTz.getTime() - probe.getTime(); // tz - utc, sign per direction
  // End of day local = 23:59:59.999 local => subtract offset to get UTC.
  const endLocalAsUtc = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  return new Date(endLocalAsUtc - offsetMs);
}

export function isGoalCompletedByEveryone(
  memberStatuses: AssignmentStatus[],
): boolean {
  if (memberStatuses.length === 0) return false;
  return memberStatuses.every((s) => s === "completed");
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test src/lib/domain/goals.test.ts`
Expected: all tests PASS. (If `computeDueAtEndOfDay` is off by the offset sign, adjust: the probe technique yields `offsetMs = local - utc`; verify against the New York case above.)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): add goal/completion pure helpers with tests"
```

---

### Task 8: Auth — server actions + pages (sign-up, login, logout, reset)

**Files:**
- Create: `src/app/auth/actions.ts`, `src/app/auth/sign-up/page.tsx`, `src/app/auth/login/page.tsx`, `src/app/auth/reset/page.tsx`, `src/components/auth/AuthForm.tsx`

- [ ] **Step 1: Auth server actions** — `src/app/auth/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect("/app");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function requestReset(formData: FormData) {
  const email = String(formData.get("email"));
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset`,
  });
  redirect("/auth/login?message=Check your email for a reset link");
}
```

- [ ] **Step 2: Reusable form** — `src/components/auth/AuthForm.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  action,
  cta,
  showPassword = true,
  error,
  message,
}: {
  action: (formData: FormData) => void;
  cta: string;
  showPassword?: boolean;
  error?: string;
  message?: string;
}) {
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {showPassword && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>
      )}
      <Button type="submit" className="w-full">
        {cta}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Pages** — sign-up / login / reset

`src/app/auth/sign-up/page.tsx`:
```tsx
import Link from "next/link";
import { signUp } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <AuthForm action={signUp} cta="Sign up" error={error} />
      <p className="text-sm text-muted-foreground">
        Have an account?{" "}
        <Link className="underline" href="/auth/login">Log in</Link>
      </p>
    </main>
  );
}
```

`src/app/auth/login/page.tsx`:
```tsx
import Link from "next/link";
import { login } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <AuthForm action={login} cta="Log in" error={error} message={message} />
      <div className="flex gap-4 text-sm text-muted-foreground">
        <Link className="underline" href="/auth/sign-up">Sign up</Link>
        <Link className="underline" href="/auth/reset">Forgot password?</Link>
      </div>
    </main>
  );
}
```

`src/app/auth/reset/page.tsx`:
```tsx
import { requestReset } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default function ResetPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <AuthForm action={requestReset} cta="Send reset link" showPassword={false} />
    </main>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: `Compiled successfully` (routes `/auth/sign-up`, `/auth/login`, `/auth/reset` listed).

- [ ] **Step 5: Manual smoke (local)**

With `pnpm dlx supabase start` and `pnpm dev` running: visit `/auth/sign-up`, create a user. Confirm in Supabase Studio (`http://127.0.0.1:54323`) that a row appears in `auth.users` **and** `public.profiles` (the trigger fired).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(auth): email/password sign-up, login, logout, reset"
```

---

### Task 9: Onboarding (display_name + timezone + path choice)

**Files:**
- Create: `src/app/onboarding/page.tsx`, `src/app/onboarding/actions.ts`

- [ ] **Step 1: Onboarding action** — `src/app/onboarding/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const displayName = String(formData.get("display_name")).trim();
  const timezone = String(formData.get("timezone")) || "UTC";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("profiles")
    .update({ display_name: displayName, timezone })
    .eq("id", user.id);

  redirect("/app");
}
```

- [ ] **Step 2: Onboarding page** — `src/app/onboarding/page.tsx`

```tsx
import { saveProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Welcome 👋</h1>
      <p className="text-muted-foreground">Tell us your name to get started.</p>
      <form action={saveProfile} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input id="display_name" name="display_name" required />
        </div>
        {/* Capture the browser timezone without client JS state */}
        <input type="hidden" name="timezone" id="timezone" />
        <Button type="submit" className="w-full">Continue</Button>
      </form>
      <script
        // sets the hidden timezone field from the browser before submit
        dangerouslySetInnerHTML={{
          __html:
            "document.getElementById('timezone').value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';",
        }}
      />
    </main>
  );
}
```

- [ ] **Step 3: Verify build + manual smoke**

Run: `pnpm build` → `Compiled successfully`. Manually: sign up → land on `/onboarding` → submit name → land on `/app`; confirm `profiles.display_name`/`timezone` updated in Studio.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(onboarding): capture display name + timezone"
```

---

### Task 10: App shell (layout, bottom nav, header, empty state)

**Files:**
- Create: `src/app/app/layout.tsx`, `src/app/app/page.tsx`, `src/components/shell/MobileBottomNav.tsx`, `src/components/shell/DashboardHeader.tsx`, `src/components/shell/EmptyStateCard.tsx`, `src/components/shell/MobileBottomNav.test.tsx`

- [ ] **Step 1: Failing component test** — `src/components/shell/MobileBottomNav.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileBottomNav } from "./MobileBottomNav";

describe("MobileBottomNav", () => {
  it("renders Home and Notifications links", () => {
    render(<MobileBottomNav inGroup={false} />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/app/notifications",
    );
  });
  it("shows a Group link only when the user is in a group", () => {
    const { rerender } = render(<MobileBottomNav inGroup={false} />);
    expect(screen.queryByRole("link", { name: /group/i })).toBeNull();
    rerender(<MobileBottomNav inGroup={true} />);
    expect(screen.getByRole("link", { name: /group/i })).toHaveAttribute("href", "/app/group");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/components/shell/MobileBottomNav.test.tsx`
Expected: FAIL — cannot find module `./MobileBottomNav`.

- [ ] **Step 3: Implement nav** — `src/components/shell/MobileBottomNav.tsx`

```tsx
import Link from "next/link";

export function MobileBottomNav({ inGroup }: { inGroup: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t bg-background p-2 sm:hidden">
      <Link href="/app" className="flex flex-col items-center px-3 py-1 text-xs">
        Home
      </Link>
      {inGroup && (
        <Link href="/app/group" className="flex flex-col items-center px-3 py-1 text-xs">
          Group
        </Link>
      )}
      <Link href="/app/notifications" className="flex flex-col items-center px-3 py-1 text-xs">
        Notifications
      </Link>
    </nav>
  );
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test src/components/shell/MobileBottomNav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Header + empty state**

`src/components/shell/DashboardHeader.tsx`:
```tsx
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  name,
  groupName,
}: {
  name: string;
  groupName?: string | null;
}) {
  return (
    <header className="flex items-center justify-between gap-2 p-4">
      <div>
        <p className="text-lg font-semibold">Hi, {name} 👋</p>
        {groupName && <p className="text-sm text-muted-foreground">{groupName}</p>}
      </div>
      <form action={logout}>
        <Button variant="ghost" size="sm" type="submit">Log out</Button>
      </form>
    </header>
  );
}
```

`src/components/shell/EmptyStateCard.tsx`:
```tsx
import { Card, CardContent } from "@/components/ui/card";

export function EmptyStateCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: App layout + dashboard** — `src/app/app/layout.tsx`

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileBottomNav } from "@/components/shell/MobileBottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-20">
      {children}
      <MobileBottomNav inGroup={!!membership} />
    </div>
  );
}
```

`src/app/app/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/shell/DashboardHeader";
import { EmptyStateCard } from "@/components/shell/EmptyStateCard";
import { displayNameFallback } from "@/lib/domain/goals";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user!.id)
    .single();

  const name = displayNameFallback(profile?.display_name, profile?.email ?? "");

  return (
    <>
      <DashboardHeader name={name} />
      <div className="space-y-4 p-4">
        <EmptyStateCard message="Nothing here yet. Create your first goal!" />
      </div>
    </>
  );
}
```

- [ ] **Step 7: Verify build + tests**

Run: `pnpm build && pnpm test`
Expected: build `Compiled successfully`; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(shell): app layout, mobile nav, header, empty state"
```

---

## Self-Review

**Spec coverage (Phase 1 scope):**
- Next.js + Tailwind + shadcn → Tasks 1, 3 ✓
- Supabase clients (browser/server/middleware) → Task 4 ✓
- Full schema (all 9 tables incl. `group_activity`) → Task 5 ✓
- RLS + `current_user_group_id()` helper + new-user trigger + updated_at → Task 6 ✓
- One-group-only (`unique(user_id)`) → Task 5 ✓
- Auth email/password (sign-up/login/logout/reset) → Task 8 ✓
- Onboarding display_name + timezone (D12/D15) → Task 9 ✓
- App shell + mobile bottom nav (`MobileBottomNav`, `DashboardHeader`, `EmptyStateCard`) → Task 10 ✓
- `.env.example` → Task 4 ✓
- Domain logic + TDD pattern → Task 7 ✓
- Route protection (middleware) → Task 4/8 ✓

Deferred to later phases by design: feature RPCs (`join_group`, `record_completion`, `transfer_ownership`, `recompute_group_goal`), invite/email/notification logic, Resend SMTP config, cron. These belong to Phases 4–6.

**Placeholder scan:** none — every step has concrete commands/code.

**Type consistency:** `displayNameFallback`, `mapActionToStatus`, `isLate`, `computeDueAtEndOfDay`, `isGoalCompletedByEveryone`, `AssignmentStatus`, `CompletionAction` are defined in Task 7 and consumed consistently (Task 10 uses `displayNameFallback`). Supabase client factory is `createClient()` in all three modules (browser/server/middleware) — server/browser export the same name from different paths, imported by path, which is intentional and consistent.

**Risk note for the executor:** `computeDueAtEndOfDay`'s offset math is the one place to watch — verify against the New York assertion in Task 7 Step 1 and adjust the sign if needed before moving on.
