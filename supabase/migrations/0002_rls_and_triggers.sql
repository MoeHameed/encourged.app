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
