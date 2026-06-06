-- Phase 5: group goals.

-- Recompute a group goal's aggregate status from its assignments.
create or replace function public.recompute_group_goal(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all_done boolean;
  v_any boolean;
  v_due timestamptz;
  v_status text;
begin
  select bool_and(status = 'completed'), count(*) > 0
    into v_all_done, v_any
  from public.goal_assignments where goal_id = p_goal_id;

  select due_at into v_due from public.goals where id = p_goal_id;

  if v_any and v_all_done then
    v_status := 'completed_by_everyone';
  elsif v_due is not null and now() > v_due then
    v_status := 'expired';
  else
    v_status := 'active';
  end if;

  update public.goals
  set status = v_status
  where id = p_goal_id and scope = 'group' and status <> 'archived';
end;
$$;

-- Create a group goal (owner/admin), assign every member, notify them, log activity.
create or replace function public.create_group_goal(
  p_title text,
  p_description text,
  p_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
  v_goal_id uuid;
  v_actor text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'title is required'; end if;

  select group_id into v_group from public.group_members
  where user_id = v_uid and role in ('owner', 'admin');
  if v_group is null then
    raise exception 'only owners and admins can create group goals';
  end if;

  insert into public.goals (scope, group_id, created_by, title, description, due_at, status)
  values ('group', v_group, v_uid, trim(p_title), nullif(trim(p_description), ''), p_due_at, 'active')
  returning id into v_goal_id;

  insert into public.goal_assignments (goal_id, user_id, status)
  select v_goal_id, gm.user_id, 'not_started'
  from public.group_members gm where gm.group_id = v_group;

  select display_name into v_actor from public.profiles where id = v_uid;

  insert into public.group_activity (group_id, actor_id, goal_id, type, summary)
  values (v_group, v_uid, v_goal_id, 'goal_created', 'New goal: ' || trim(p_title));

  insert into public.notifications (user_id, group_id, goal_id, type, title, body)
  select gm.user_id, v_group, v_goal_id, 'group_goal_created', 'New group goal', trim(p_title)
  from public.group_members gm
  where gm.group_id = v_group and gm.user_id <> v_uid;

  return v_goal_id;
end;
$$;

-- Replace record_completion with a security-definer version that also handles group goals
-- (writes to group_activity, which has no INSERT policy, and recomputes the aggregate).
create or replace function public.record_completion(
  p_goal_id uuid,
  p_action text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_goal public.goals;
  v_is_late boolean;
  v_status text;
  v_actor text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_action not in ('done', 'partial', 'skipped') then
    raise exception 'invalid action: %', p_action;
  end if;
  -- authorization: the caller must actually be assigned this goal
  if not exists (
    select 1 from public.goal_assignments where goal_id = p_goal_id and user_id = v_uid
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

  if v_goal.scope = 'group' then
    select display_name into v_actor from public.profiles where id = v_uid;
    insert into public.group_activity (group_id, actor_id, goal_id, type, summary)
    values (
      v_goal.group_id, v_uid, p_goal_id, 'completion_recorded',
      coalesce(v_actor, 'Someone') || ' marked "' || v_goal.title || '" as ' || p_action
    );
    perform public.recompute_group_goal(p_goal_id);
  end if;
end;
$$;
