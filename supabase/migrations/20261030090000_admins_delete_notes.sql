-- Delta Capital CRM: let administration remove comments.
--
-- Until now only SUPERADMIN could delete a note (through the blanket "manage
-- all notes" policy); managers could read them and nothing else. Comments get
-- posted to the wrong prospect, or carry a phone number that should never have
-- been written down, and the only person who could clear that was the owner of
-- the account. This gives MANAGER the same delete reach over notes they can
-- already read, and leaves every other role untouched: an agent still cannot
-- delete even their own comment, so the history of a worked account stays
-- intact unless administration decides otherwise.

begin;

drop policy if exists "Managers can delete notes" on public.notes;
create policy "Managers can delete notes"
on public.notes for delete to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');

comment on table public.notes is
  'Comments on leads, deals and contacts. Authors write their own; only SUPERADMIN and MANAGER may delete.';

commit;
