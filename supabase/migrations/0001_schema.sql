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
