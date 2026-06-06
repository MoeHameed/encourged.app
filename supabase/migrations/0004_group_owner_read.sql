-- A group owner must be able to read their group even before the membership row
-- exists. create_group runs `insert into groups ... returning id` BEFORE inserting
-- the owner's group_members row; without owner visibility, RETURNING fails the
-- SELECT policy and the whole call errors with an RLS violation.
drop policy if exists "members read group" on public.groups;
create policy "members read group" on public.groups for select
  using (
    id = public.current_user_group_id()
    or owner_id = auth.uid()
  );
