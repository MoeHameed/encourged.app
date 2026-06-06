-- Phase 7: membership lifecycle (owner/admin management). All security definer with role checks.

create or replace function public.promote_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_group uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.group_members where user_id = v_uid and role = 'owner';
  if v_group is null then raise exception 'only the owner can promote members'; end if;

  update public.group_members set role = 'admin'
  where user_id = p_user_id and group_id = v_group and role = 'member';
  if not found then raise exception 'member not found'; end if;

  insert into public.notifications (user_id, group_id, type, title, body)
  values (p_user_id, v_group, 'promoted_to_admin', 'You are now an admin', 'You were promoted to admin of your group.');
end; $$;

create or replace function public.demote_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_group uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.group_members where user_id = v_uid and role = 'owner';
  if v_group is null then raise exception 'only the owner can demote admins'; end if;

  update public.group_members set role = 'member'
  where user_id = p_user_id and group_id = v_group and role = 'admin';
  if not found then raise exception 'admin not found'; end if;
end; $$;

create or replace function public.remove_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_group uuid; v_my_role text; v_target_role text; r record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_user_id = v_uid then raise exception 'use leave group instead'; end if;

  select group_id, role into v_group, v_my_role from public.group_members where user_id = v_uid;
  if v_group is null then raise exception 'not in a group'; end if;

  select role into v_target_role from public.group_members where user_id = p_user_id and group_id = v_group;
  if v_target_role is null then raise exception 'that person is not in your group'; end if;

  if v_my_role = 'owner' then
    if v_target_role = 'owner' then raise exception 'cannot remove the owner'; end if;
  elsif v_my_role = 'admin' then
    if v_target_role <> 'member' then raise exception 'admins can only remove members'; end if;
  else
    raise exception 'only owners and admins can remove members';
  end if;

  delete from public.completion_records cr using public.goals g
    where cr.goal_id = g.id and g.group_id = v_group and cr.user_id = p_user_id;
  delete from public.goal_assignments ga using public.goals g
    where ga.goal_id = g.id and g.group_id = v_group and ga.user_id = p_user_id;
  delete from public.group_members where user_id = p_user_id and group_id = v_group;

  for r in select id from public.goals where group_id = v_group and scope = 'group' and status <> 'archived' loop
    perform public.recompute_group_goal(r.id);
  end loop;
end; $$;

create or replace function public.leave_group()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_group uuid; v_role text; r record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select group_id, role into v_group, v_role from public.group_members where user_id = v_uid;
  if v_group is null then raise exception 'not in a group'; end if;
  if v_role = 'owner' then raise exception 'Owner must transfer ownership or delete the group first'; end if;

  delete from public.completion_records cr using public.goals g
    where cr.goal_id = g.id and g.group_id = v_group and cr.user_id = v_uid;
  delete from public.goal_assignments ga using public.goals g
    where ga.goal_id = g.id and g.group_id = v_group and ga.user_id = v_uid;
  delete from public.group_members where user_id = v_uid and group_id = v_group;

  for r in select id from public.goals where group_id = v_group and scope = 'group' and status <> 'archived' loop
    perform public.recompute_group_goal(r.id);
  end loop;
end; $$;

create or replace function public.transfer_ownership(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_group uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.group_members where user_id = v_uid and role = 'owner';
  if v_group is null then raise exception 'only the owner can transfer ownership'; end if;
  if not exists (select 1 from public.group_members where user_id = p_user_id and group_id = v_group) then
    raise exception 'that person is not in your group';
  end if;

  update public.group_members set role = 'owner' where user_id = p_user_id and group_id = v_group;
  update public.group_members set role = 'admin' where user_id = v_uid and group_id = v_group;
  update public.groups set owner_id = p_user_id where id = v_group;

  insert into public.notifications (user_id, group_id, type, title, body)
  values (p_user_id, v_group, 'promoted_to_admin', 'You are now the owner', 'Group ownership was transferred to you.');
end; $$;

create or replace function public.delete_group()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_group uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select group_id into v_group from public.group_members where user_id = v_uid and role = 'owner';
  if v_group is null then raise exception 'only the owner can delete the group'; end if;
  -- cascades remove members, group goals + their assignments/records, invites, activity, group notifications
  delete from public.groups where id = v_group;
end; $$;
