-- Phase 6: scheduled maintenance (called hourly by the cron route via the admin client).
-- Expires overdue goals (notifying un-completed assignees) and sends 24h "due soon" reminders.
create or replace function public.run_goal_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) Expire overdue, still-active goals.
  create temp table _expiring on commit drop as
    select id, group_id, scope, title
    from public.goals
    where status = 'active' and due_at is not null and due_at < now();

  update public.goals set status = 'expired'
  where id in (select id from _expiring);

  insert into public.notifications (user_id, group_id, goal_id, type, title, body)
  select ga.user_id, e.group_id, e.id, 'goal_expired', 'Goal expired',
         'Your goal "' || e.title || '" has expired — you can still complete it late.'
  from _expiring e
  join public.goal_assignments ga on ga.goal_id = e.id
  where ga.status <> 'completed';

  insert into public.group_activity (group_id, actor_id, goal_id, type, summary)
  select e.group_id, null, e.id, 'goal_expired', 'Goal expired: ' || e.title
  from _expiring e
  where e.scope = 'group' and e.group_id is not null;

  -- 2) Remind for goals due within 24h that haven't been reminded yet.
  create temp table _soon on commit drop as
    select id, group_id, title
    from public.goals
    where status = 'active' and due_at is not null and reminded_at is null
      and due_at >= now() and due_at < now() + interval '24 hours';

  update public.goals set reminded_at = now()
  where id in (select id from _soon);

  insert into public.notifications (user_id, group_id, goal_id, type, title, body)
  select ga.user_id, s.group_id, s.id, 'goal_expiring_soon', 'Due soon',
         'Your goal "' || s.title || '" is due within 24 hours.'
  from _soon s
  join public.goal_assignments ga on ga.goal_id = s.id
  where ga.status <> 'completed';
end;
$$;
