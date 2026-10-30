-- Delta Capital CRM: let administration clear timeline entries too.
--
-- Deleting a comment was not enough. Adding a comment used to log a second
-- "Nota agregada: ..." row in activities, so the comment showed twice and the
-- copy outlived the comment it described. The app no longer writes that row,
-- but every one already logged is still sitting in the history, and only its
-- own author or a SUPERADMIN could remove it.
--
-- MANAGER now deletes activities the same way it deletes notes. Agents keep
-- delete on their own rows only, which is what the existing policy already
-- granted them.

begin;

drop policy if exists "Managers can delete activities" on public.activities;
create policy "Managers can delete activities"
on public.activities for delete to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');

commit;
