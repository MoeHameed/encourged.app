-- Phase 4: invites.

-- Create an invite (email = single-use to an address; link = multi-use). Owner/admin only.
create or replace function public.create_group_invite(p_type text, p_email text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid := public.current_user_group_id();
  v_token text := encode(gen_random_bytes(18), 'hex');
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_group is null then raise exception 'not in a group'; end if;
  if p_type not in ('email', 'link') then raise exception 'invalid invite type'; end if;
  if not exists (
    select 1 from public.group_members
    where user_id = v_uid and group_id = v_group and role in ('owner', 'admin')
  ) then
    raise exception 'only owners and admins can invite';
  end if;

  insert into public.group_invites (group_id, type, token, invited_email, max_uses, created_by)
  values (
    v_group,
    p_type,
    v_token,
    case when p_type = 'email' then lower(trim(p_email)) else null end,
    case when p_type = 'email' then 1 else null end,
    v_uid
  );
  return v_token;
end;
$$;

-- Public, read-only preview of an invite so a (possibly logged-out) visitor sees the group name.
create or replace function public.get_invite_preview(p_token text)
returns table (group_name text, valid boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.group_invites;
  v_name text;
begin
  select * into v_invite from public.group_invites where token = p_token;
  if v_invite.id is null then
    return query select null::text, false, 'invalid'; return;
  end if;
  select name into v_name from public.groups where id = v_invite.group_id;
  if v_invite.revoked_at is not null then
    return query select v_name, false, 'revoked'; return;
  end if;
  if v_invite.expires_at < now() then
    return query select v_name, false, 'expired'; return;
  end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    return query select v_name, false, 'used'; return;
  end if;
  return query select v_name, true, null::text;
end;
$$;

-- Redeem an invite: join the group, get assigned to open group goals, notify admins.
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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_invite from public.group_invites where token = p_token;
  if v_invite.id is null then raise exception 'invalid invite'; end if;
  if v_invite.revoked_at is not null then raise exception 'this invite was revoked'; end if;
  if v_invite.expires_at < now() then raise exception 'this invite has expired'; end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'this invite has already been used';
  end if;

  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'You are already in a group. Leave it first to join another.';
  end if;

  select count(*) into v_count from public.group_members where group_id = v_invite.group_id;
  if v_count >= 1000 then raise exception 'This group is full'; end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, v_uid, 'member');

  -- assign the new member to every open group goal
  insert into public.goal_assignments (goal_id, user_id, status)
  select g.id, v_uid, 'not_started'
  from public.goals g
  where g.group_id = v_invite.group_id
    and g.scope = 'group'
    and g.status in ('active', 'expired', 'completed_by_everyone');

  -- a brand-new member means a previously "everyone done" goal is no longer complete
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
