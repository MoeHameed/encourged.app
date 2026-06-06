# encouraged.app — Design Spec (MVP)

- **Status:** Approved direction (medium-to-large scale). Authoritative build contract.
- **Date:** 2026-06-05
- **Repo:** `coconut` · **Product:** encouraged.app
- **Supersedes:** the initial product spec. Where this doc and the initial spec disagree, this doc wins. The "Decisions Log" below records every deviation and why.

---

## 1. Summary

encouraged.app is a mobile-first accountability web app for private groups and personal goals. An admin creates a shared goal once; every member sees it and self-reports completion (Done / Partial / Skipped, with an optional note). The group sees a light activity feed and gets a small number of high-signal notifications. The feeling is friendly, encouraging, low-pressure — **not** a complex habit tracker.

**Core loop:** Admin creates shared goal → everyone sees it → each person records completion → group sees activity → accountability happens naturally.

**Scale target:** medium-to-large groups (tens to ~1,000 members). All fan-out (assignments, notifications, emails) is designed to stay safe at the 1,000 ceiling.

---

## 2. Decisions Log (changes vs. the initial spec)

These are the resolved decisions. Everything else from the initial spec stands.

| # | Area | Decision | Why |
|---|------|----------|-----|
| D1 | One-group rule | Enforce with **`unique(user_id)`** on `group_members` (initial spec's `unique(group_id,user_id)` did not actually enforce it). | The stated rule wasn't enforceable as written. |
| D2 | Membership lifecycle | Add **Leave group**, **Transfer ownership**, **Delete group (cascade)**. Owner must transfer or delete to leave. | No exit/transfer existed; an owner was trapped. |
| D3 | Completion notifications | Completions do **not** create per-user notifications. They feed a group-scoped **activity feed** only. | `member completes → email/notify all` is O(members²); catastrophic at 1,000. |
| D4 | Email events | The **only** broadcast email is *new group goal* (respects a per-user toggle, sent via Resend batch). Other emails: invite, auth (verify/reset), optional "expiring soon". | Keep email rare and high-signal; stay within provider limits. |
| D5 | Activity feed | New append-only **`group_activity`** table as the feed's source. | §10.1 feed had no data source. |
| D6 | Expiration | **Vercel Cron** → secured route handler, hourly. "Expired" is a property of the **goal**, not the assignment. | Needed a scheduler (absent from stack) and a clear ownership of state. |
| D7 | Assignment status | Drop `expired` from `goal_assignments.status` → `('not_started','completed','partial','skipped')`. Lateness = `is_late`. | Removes redundant/ambiguous state; late completion stays allowed. |
| D8 | Completion model | `completion_records` = **append-only log**. `goal_assignments` = **current state** + editable `last_note`. | Resolves the overlap; "edit note" has a clear target. |
| D9 | Invites | One `group_invites` table with `type ('email'\|'link')`, `max_uses`, `uses`, `expires_at` (default **7 days**), `revoked_at`. | Single `used_at` couldn't model multi-use links. |
| D10 | Already-in-group + invite | Block with "leave your current group first" (link to leave flow). | Join flow ignored this case. |
| D11 | Group-size cap | `max_members` constant (1,000) enforced in a **join RPC** (race-safe), not a per-group column. | It's a fixed limit, not config. |
| D12 | Timezone | `due_at timestamptz` (UTC), stored as end-of-day in creator's tz; add `profiles.timezone`. | Avoid off-by-one "due Friday" expiries. |
| D13 | Auth emails | Route Supabase Auth email through **Resend SMTP**. | Default Supabase email is heavily rate-limited. |
| D14 | Email prefs | Add minimal per-user email prefs + unsubscribe. | Compliance + sanity. |
| D15 | Onboarding | Capture **display_name** (fallback: email prefix). | Activity feed needs a name. |
| D16 | Invite route | Public **`/invite/[token]`** (outside auth-guarded `/app`). | Must work logged-out. |
| D17 | Hosting | **Vercel**. | Native Cron + Next.js integration. |
| D18 | completed_by_everyone | = every current member's assignment is `completed` (strict "done"). Recomputed on assignment/membership change; a new member reverts it to `active`. | Make the aggregate precise and consistent. |

---

## 3. Goals & Non-Goals

**MVP includes:** personal goals; private invite-only groups; shared group goals assigned to all members; self-reported completion (Done/Partial/Skipped + note); in-app notifications; selective email; group activity feed; mobile-first responsive UI.

**Non-goals (unchanged):** payments, streaks, leaderboards, comments, nudges, daily check-ins, complex analytics, native app, push notifications, public groups, goal templates, social sharing, file/photo proof, recurring goals. (The "group feed" non-goal is honored: `group_activity` is a lightweight recent-activity list, not a social feed with reactions/threads.)

---

## 4. User Types & Roles

- **Individual user** — signed in; personal goals only.
- **Member** — belongs to one group.
- **Admin** — member who can manage goals/invites/members.
- **Owner** — group creator; full control incl. promote/demote, transfer, delete.

### Permissions

| Action | Owner | Admin | Member |
|---|--:|--:|--:|
| Create group (when not in one) | Yes | Yes | Yes |
| Edit group name/description | Yes | Yes | No |
| Delete group | Yes | No | No |
| **Transfer ownership** | Yes | No | No |
| Invite users (email + link) | Yes | Yes | No |
| Remove members | Yes (anyone) | Yes (members only) | No |
| Promote member → admin | Yes | No | No |
| Demote admin → member | Yes | No | No |
| **Leave group** | No¹ | Yes | Yes |
| Create / edit / archive group goals | Yes | Yes | No |
| View group goals | Yes | Yes | Yes |
| Complete own assigned goal | Yes | Yes | Yes |
| Edit own completion note | Yes | Yes | Yes |
| Create / manage personal goals | Yes | Yes | Yes |

¹ Owner cannot leave directly; must **transfer ownership** or **delete** the group first.

---

## 5. Core Rules

### 5.1 Groups & Membership Lifecycle
- A user belongs to **at most one group** (enforced by `unique(user_id)` on `group_members`) and may have unlimited personal goals.
- Anyone not currently in a group can **create** a group (becomes owner) or **join** via invite.
- **Leave (non-owner):** removes the row; deletes that user's assignments + completion records for that group's goals; recomputes affected goals' `completed_by_everyone`; personal goals untouched.
- **Transfer ownership (owner):** target member becomes `owner`, previous owner becomes `admin`.
- **Delete group (owner):** cascade-deletes group, members, group goals, their assignments, their completion records, invites, and group-scoped notifications/activity. All members freed.
- Max size **1,000**, enforced atomically in a join RPC.

### 5.2 Invites
- Two types in one table: **email** (single-use, tied to `invited_email`) and **link** (multi-use).
- Default expiry **7 days**. Admins can revoke and regenerate.
- Valid = not expired, not revoked, and (`max_uses` null OR `uses < max_uses`).
- Joining requires an account (sign up / log in first). Accepting consumes one use (increments `uses`, sets `used_at` for email type) inside the join RPC.
- A user already in a group who opens an invite is blocked with guidance to leave first.

### 5.3 Goals
- **Personal:** `scope='personal'`, `group_id=null`, visible only to creator, one assignment (the creator).
- **Group:** `scope='group'`, valid `group_id`, created by owner/admin, assigned to every current member (one assignment each).
- **New members** receive assignments for all `active` (and `expired`, still-completable) group goals on join.
- Same creation form for time-based (has `due_at`) and completion-based (no `due_at`). Due date optional but recommended.

### 5.4 Status Model
- **`goals.status`** (aggregate / lifecycle):
  - personal: `active | completed | expired | archived`
  - group: `active | expired | completed_by_everyone | archived`
- **`goal_assignments.status`** (per-user current state): `not_started | completed | partial | skipped`
- **Expiration:** if `due_at` passes and the goal isn't `completed_by_everyone`/`archived`, goal → `expired`. **Late completion is still allowed**; late records set `is_late=true` and the UI shows "Completed late."
- **completed_by_everyone:** every current member's assignment is `completed` (strict). Recomputed when an assignment or membership changes.

### 5.5 Completion Records
- Tapping Done/Partial/Skipped **inserts** a `completion_records` row (append-only) and **updates** the user's `goal_assignments` (`status`, `completed_at`, `is_late`, `last_note`), writes a `group_activity` row (group goals), and recomputes `completed_by_everyone`.
- **Editing a note** updates `goal_assignments.last_note` only (the log keeps its historical snapshots).
- Mapping: Done→`completed`, Partial→`partial`, Skipped→`skipped`.

---

## 6. Notifications & Activity

Two separate systems:

### 6.1 Per-user notifications (`notifications`, read/unread)
Things that need *your* attention.

| Event | Recipients | In-app | Email |
|---|---|:--:|:--:|
| New group goal created | all members | Yes | Yes (if `email_on_new_goal`) |
| Goal expiring soon (~24h) & you haven't completed | you | Yes | Optional (`email_on_reminders`, default off) |
| Goal expired & you didn't complete | you | Yes | No |
| New member joined | owner + admins | Yes | No |
| You were promoted to admin | you | Yes | No |
| You were invited (email invite) | invited email | — | Yes (the invite) |

### 6.2 Group activity feed (`group_activity`, shared, no read state)
The light "what's happening" stream — **no** email, **no** per-user rows.
- Types: `goal_created`, `completion_recorded`, `member_joined`, `goal_expired`, `goal_completed_by_everyone`.
- Example rows: "Aisha completed Run 5km", "New goal: Sunday long run", "Nate marked Stretching as partial".

### 6.3 Email infrastructure
- All transactional + auth email via **Resend** (auth via Supabase custom SMTP pointed at Resend).
- Broadcast (new-goal) uses Resend **batch** send and honors `email_on_new_goal`.
- Every non-auth email includes an unsubscribe link toggling the relevant pref.
- Emails are short and plain (subject/body per initial spec §11).

---

## 7. Expiration & Scheduling

- **Vercel Cron** (hourly) → `POST /api/cron/expire-goals`, protected by a `CRON_SECRET` bearer check.
- Job: (1) goals with `due_at < now()` still `active` → `expired` + `group_activity('goal_expired')` + per-user `notifications` for members not `completed`; (2) goals due within ~24h → "expiring soon" notifications (idempotent — track via a `reminded_at` column to avoid duplicates).
- "Expired" never blocks completion; it only changes display and triggers the one-time notifications.

---

## 8. Data Model

Postgres (Supabase). All ids `uuid` default `gen_random_uuid()`; all timestamps `timestamptz`. `created_at`/`updated_at` default `now()` (updated_at via trigger).

### 8.1 profiles
```sql
profiles
- id uuid pk references auth.users(id) on delete cascade
- email text not null
- display_name text not null
- avatar_url text
- timezone text not null default 'UTC'        -- IANA, captured at onboarding
- email_on_new_goal boolean not null default true
- email_on_reminders boolean not null default false
- created_at / updated_at
```

### 8.2 groups
```sql
groups
- id uuid pk
- name text not null
- description text
- owner_id uuid references profiles(id)
- created_at / updated_at
-- max size is a constant (1000) enforced in the join RPC, not a column
```

### 8.3 group_members
```sql
group_members
- id uuid pk
- group_id uuid references groups(id) on delete cascade
- user_id uuid references profiles(id) on delete cascade
- role text not null check (role in ('owner','admin','member'))
- joined_at timestamptz default now()
- unique(user_id)            -- D1: enforces "one group only"
```

### 8.4 group_invites
```sql
group_invites
- id uuid pk
- group_id uuid references groups(id) on delete cascade
- type text not null check (type in ('email','link'))
- token text unique not null
- invited_email text         -- set when type='email'
- max_uses integer           -- email=1; link=null (unlimited) or a number
- uses integer not null default 0
- created_by uuid references profiles(id)
- expires_at timestamptz not null default (now() + interval '7 days')
- used_at timestamptz         -- set for email type on redemption
- revoked_at timestamptz
- created_at
```

### 8.5 goals
```sql
goals
- id uuid pk
- scope text not null check (scope in ('personal','group'))
- group_id uuid references groups(id) on delete cascade   -- null for personal
- created_by uuid references profiles(id)
- title text not null
- description text
- due_at timestamptz                                       -- null = completion-based
- status text not null check (status in
    ('active','expired','completed_by_everyone','archived','completed'))
- reminded_at timestamptz                                  -- expiring-soon idempotency
- created_at / updated_at
-- personal goals use status in (active,completed,expired,archived)
-- group goals use status in (active,expired,completed_by_everyone,archived)
```

### 8.6 goal_assignments
```sql
goal_assignments
- id uuid pk
- goal_id uuid references goals(id) on delete cascade
- user_id uuid references profiles(id) on delete cascade
- status text not null default 'not_started'
    check (status in ('not_started','completed','partial','skipped'))
- last_note text                 -- editable current note
- completed_at timestamptz
- is_late boolean not null default false
- updated_at
- unique(goal_id, user_id)
```

### 8.7 completion_records  (append-only log)
```sql
completion_records
- id uuid pk
- goal_id uuid references goals(id) on delete cascade
- user_id uuid references profiles(id) on delete cascade
- action text not null check (action in ('done','partial','skipped'))
- note text                      -- snapshot at time of action
- is_late boolean not null default false
- created_at
```

### 8.8 notifications  (per-user, read/unread)
```sql
notifications
- id uuid pk
- user_id uuid references profiles(id) on delete cascade
- group_id uuid references groups(id) on delete cascade
- goal_id uuid references goals(id) on delete cascade
- type text not null            -- group_goal_created | goal_expiring_soon |
                                --   goal_expired | member_joined | promoted_to_admin
- title text not null
- body text
- read_at timestamptz
- created_at
```

### 8.9 group_activity  (shared feed, append-only)
```sql
group_activity
- id uuid pk
- group_id uuid references groups(id) on delete cascade
- actor_id uuid references profiles(id)
- goal_id uuid references goals(id) on delete cascade
- type text not null            -- goal_created | completion_recorded |
                                --   member_joined | goal_expired | goal_completed_by_everyone
- summary text not null         -- pre-rendered display string
- created_at
```

### 8.10 Server-side RPCs (Postgres functions, `security definer`)
- `join_group(token)` — validate invite, enforce 1,000 cap atomically, insert member, create assignments for active/expired group goals, increment invite use, write activity + owner/admin notifications.
- `transfer_ownership(group_id, new_owner_id)`.
- `record_completion(goal_id, action, note)` — insert log, upsert assignment, recompute aggregate, write activity.
- `recompute_group_goal(goal_id)` — set/clear `completed_by_everyone`.
- Helper `current_user_group_id()` used by RLS to avoid recursive policies on `group_members`.

---

## 9. Row Level Security (overview)

- **profiles:** read own; read profiles of users sharing your group; update own.
- **groups:** members read their group; owner/admin update; owner delete.
- **group_members:** members read their group's rows; writes via RPCs / owner-admin policies.
- **goals:** read own personal; read group goals for your group; insert personal (self); owner/admin insert/edit/archive group goals.
- **goal_assignments:** read own; read assignments for goals in your group; update own; admin read all in group.
- **completion_records:** insert own; read own + your group's; no update/delete (append-only).
- **notifications:** read/update own only.
- **group_activity:** read your group's; insert via RPCs only.
- **group_invites:** owner/admin manage; public validation of a single token happens through a `security definer` RPC (so logged-out/other users can preview an invite without broad read access).

> **Implementation note:** policies that reference `group_members` from within `group_members` cause infinite recursion in Supabase. Use the `security definer` helper `current_user_group_id()` instead of inline subqueries.

---

## 10. Routes (Next.js 16 App Router)

```
/                         Landing
/auth/sign-up
/auth/login
/auth/reset               Password reset (Supabase)
/onboarding               Choose: personal only / create group / join group; capture display_name + timezone
/invite/[token]           PUBLIC accept-invite (handles logged-out → auth → back → join)
/app                      Dashboard
/app/goals/new            Create personal goal
/app/goals/[goalId]       Goal detail (personal or group)
/app/group                Group dashboard
/app/group/goals/new      Create group goal (admin)
/app/group/settings       Group settings (admin/owner)
/app/notifications        Notifications
/api/cron/expire-goals    Cron target (CRON_SECRET protected)
```

Mutations use **Server Actions**; cron uses a **Route Handler**.

---

## 11. Components

`GoalCard`, `GoalStatusBadge`, `GoalCompletionButtons`, `GoalProgressSummary`, `CreateGoalForm`, `GroupMemberList`, `InviteMemberForm`, `InviteLinkCard`, `NotificationBell`, `NotificationList`, `ActivityFeed`, `MobileBottomNav`, `DashboardHeader`, `EmptyStateCard`, `LeaveGroupDialog`, `TransferOwnershipDialog`.

---

## 12. Tech Stack & Hosting

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, mobile-first.
- **Backend:** Supabase (Auth email/password, Postgres, RLS), Server Actions + Route Handlers, Postgres RPCs (`security definer`).
- **Email:** Resend (transactional + batch; Supabase auth via Resend SMTP).
- **Hosting:** Vercel (incl. Vercel Cron).

---

## 13. External Setup (requires the user's accounts)

The codebase + migrations will be complete; these steps need real credentials:

1. **Supabase project** → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Run the provided SQL migrations.
2. **Resend** → `RESEND_API_KEY` + verified sending domain; configure Supabase Auth custom SMTP to Resend.
3. **App config** → `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`.
4. **Deploy** to Vercel; add the Cron schedule (`vercel.json`).

A `.env.example` and a setup README will document all of the above.

---

## 14. Build Order

1. **Foundation** — Next.js + Tailwind + shadcn; Supabase client/SSR; auth (sign-up/login/reset); schema migrations + RLS + RPCs; app shell + mobile bottom nav; `.env.example` + setup docs.
2. **Personal goals** — create form, list, detail, Done/Partial/Skipped, notes.
3. **Groups** — create/onboarding, group dashboard, member list, roles, settings, leave/transfer/delete.
4. **Invites** — token gen (email + link), Resend email, accept flow, expiry/revoke, join RPC + cap.
5. **Group goals** — create, fan-out assignment, completion, progress count, member-status table, activity feed.
6. **Notifications** — table + bell + list; create on key events; new-goal email (batch + prefs); cron for expiry/reminders.
7. **Polish** — empty/loading/error states, microcopy, mobile pass, end-to-end test of core flows.

---

## 15. Acceptance Criteria

- Sign up, log in, reset password (auth emails via Resend).
- Create/manage personal goals; mark Done/Partial/Skipped with optional notes.
- Create a private group (creator = owner); enforced one-group-per-user.
- Invite by email and by shareable link; invites expire after 7 days; revoke/regenerate.
- Join via a valid invite; blocked if already in a group; 1,000 cap enforced.
- Owner/admin/member roles; promote/demote; **leave**, **transfer ownership**, **delete (cascade)**.
- Admin creates group goals; auto-assigned to all members (and to new joiners).
- Members complete their own assignment; group sees per-member statuses and a completion count.
- Activity feed shows recent group events; no completion-spam.
- Per-user in-app notifications for key events; new-goal email (respecting prefs + unsubscribe).
- Overdue goals marked **expired** via cron; **late completion allowed** and labeled.
- Works well on mobile; friendly empty/loading/error states.

---

## 16. Deferred (explicitly out of MVP)

Avatars upload, recurring goals, multiple groups per user, digests, push, analytics, reactions/comments — all post-MVP. Group activity is intentionally minimal (no reactions/threads) to honor the "not a social feed" non-goal.
