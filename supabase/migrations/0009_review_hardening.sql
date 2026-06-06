-- 0009: security hardening from the final review.

-- (#4) Only the service_role (admin client / cron) may run maintenance — not end users.
revoke execute on function public.run_goal_maintenance() from public, anon, authenticated;
grant execute on function public.run_goal_maintenance() to service_role;

-- (#3 email binding) + (#5 race-safe member cap): redefine accept_invite.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.group_invites;
  v_count int;
  v_actor text;
  v_email text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_invite from public.group_invites where token = p_token;
  if v_invite.id is null then raise exception 'invalid invite'; end if;
  if v_invite.revoked_at is not null then raise exception 'this invite was revoked'; end if;
  if v_invite.expires_at < now() then raise exception 'this invite has expired'; end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'this invite has already been used';
  end if;

  -- email invites are bound to the address they were sent to
  if v_invite.type = 'email' then
    select lower(email) into v_email from public.profiles where id = v_uid;
    if v_email is distinct from v_invite.invited_email then
      raise exception 'This invite was sent to a different email address';
    end if;
  end if;

  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'You are already in a group. Leave it first to join another.';
  end if;

  -- serialize concurrent joins to the same group so the 1000-member cap is race-safe
  perform pg_advisory_xact_lock(hashtextextended(v_invite.group_id::text, 0));

  select count(*) into v_count from public.group_members where group_id = v_invite.group_id;
  if v_count >= 1000 then raise exception 'This group is full'; end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, v_uid, 'member');

  insert into public.goal_assignments (goal_id, user_id, status)
  select g.id, v_uid, 'not_started'
  from public.goals g
  where g.group_id = v_invite.group_id
    and g.scope = 'group'
    and g.status in ('active', 'expired', 'completed_by_everyone');

  update public.goals set status = 'active'
  where group_id = v_invite.group_id and scope = 'group' and status = 'completed_by_everyone';

  update public.group_invites
  set uses = uses + 1,
      used_at = case when type = 'email' then now() else used_at end
  where id = v_invite.id;

  select display_name into v_actor from public.profiles where id = v_uid;

  insert into public.group_activity (group_id, actor_id, type, summary)
  values (v_invite.group_id, v_uid, 'member_joined', coalesce(v_actor, 'Someone') || ' joined the group');

  insert into public.notifications (user_id, group_id, type, title, body)
  select gm.user_id, v_invite.group_id, 'member_joined', 'New member',
         coalesce(v_actor, 'Someone') || ' joined your group'
  from public.group_members gm
  where gm.group_id = v_invite.group_id and gm.role in ('owner', 'admin') and gm.user_id <> v_uid;

  return v_invite.group_id;
end;
$$;
