-- Phase 2/3 RPCs. All run with invoker rights (RLS applies) and are guarded by auth.uid().

-- create_personal_goal: insert a personal goal + the creator's assignment (atomic).
create or replace function public.create_personal_goal(
  p_title text,
  p_description text,
  p_due_at timestamptz
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_goal_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'title is required';
  end if;

  insert into public.goals (scope, created_by, title, description, due_at, status)
  values ('personal', v_uid, trim(p_title), nullif(trim(p_description), ''), p_due_at, 'active')
  returning id into v_goal_id;

  insert into public.goal_assignments (goal_id, user_id, status)
  values (v_goal_id, v_uid, 'not_started');

  return v_goal_id;
end;
$$;

-- record_completion: append a completion log row and update the caller's assignment.
-- (Group-goal activity/aggregate handling is added in the group-goals phase.)
create or replace function public.record_completion(
  p_goal_id uuid,
  p_action text,
  p_note text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_goal public.goals;
  v_is_late boolean;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_action not in ('done', 'partial', 'skipped') then
    raise exception 'invalid action: %', p_action;
  end if;
  if not exists (
    select 1 from public.goal_assignments
    where goal_id = p_goal_id and user_id = v_uid
  ) then
    raise exception 'no assignment for this goal';
  end if;

  select * into v_goal from public.goals where id = p_goal_id;
  v_is_late := v_goal.due_at is not null and now() > v_goal.due_at;
  v_status := case p_action when 'done' then 'completed' else p_action end;

  insert into public.completion_records (goal_id, user_id, action, note, is_late)
  values (p_goal_id, v_uid, p_action, nullif(trim(p_note), ''), v_is_late);

  update public.goal_assignments
  set status = v_status,
      last_note = nullif(trim(p_note), ''),
      completed_at = case when p_action = 'done' then now() else completed_at end,
      is_late = v_is_late,
      updated_at = now()
  where goal_id = p_goal_id and user_id = v_uid;
end;
$$;

-- create_group: create a group with the caller as owner. Enforces one group per user.
create or replace function public.create_group(
  p_name text,
  p_description text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'group name is required';
  end if;
  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'You are already in a group';
  end if;

  insert into public.groups (name, description, owner_id)
  values (trim(p_name), nullif(trim(p_description), ''), v_uid)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'owner');

  return v_group_id;
end;
$$;
