-- Delta Capital CRM: close the chat privacy hole left by blanket RLS policies.
--
-- 20260822090000_chat_membership_only.sql made channel/message access
-- membership-based, but several permissive policies that grant access to every
-- authenticated user were still present on public.channels and public.messages.
-- PostgreSQL ORs permissive policies together, so those policies overrode the
-- membership rule entirely: any logged-in user could read every channel and
-- every message.
--
-- This migration drops the blanket policies and re-grants channel
-- administration to SUPERADMIN/MANAGER through per-command policies, so admins
-- keep INSERT/UPDATE/DELETE without regaining blanket SELECT.

begin;

-- Channels: remove blanket read and the FOR ALL policies (FOR ALL implies SELECT).
drop policy if exists "All authenticated can read channels" on public.channels;
drop policy if exists "Leaders can manage channels" on public.channels;
drop policy if exists "Superadmins can manage channels" on public.channels;

-- Administration without SELECT: SUPERADMIN/MANAGER may create, rename and
-- remove channels. Reading stays membership-only via
-- "Authorized users can read channels".
drop policy if exists "Admins insert channels" on public.channels;
create policy "Admins insert channels"
on public.channels for insert to authenticated
with check (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'));

drop policy if exists "Admins update channels" on public.channels;
create policy "Admins update channels"
on public.channels for update to authenticated
using (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'))
with check (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'));

drop policy if exists "Admins delete channels" on public.channels;
create policy "Admins delete channels"
on public.channels for delete to authenticated
using (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'));

-- Messages: remove blanket read/insert. Reading and posting stay gated by
-- public.can_access_channel() through the "Channel members ..." policies.
drop policy if exists "Authenticated can read messages" on public.messages;
drop policy if exists "Authenticated can insert messages" on public.messages;

-- Deleting was allowed for any message by SUPERADMIN/MANAGER, including in
-- channels they cannot see. "Users can delete own channel messages" already
-- covers a member deleting their own message.
drop policy if exists "Users can delete own messages" on public.messages;

-- Only SUPERADMIN/MANAGER may open conversations. Agents and supervisors can
-- participate in the channels they are added to, but cannot create their own.
-- "Admins insert channels" above is now the only INSERT path.
drop policy if exists "Users can create private channels" on public.channels;

commit;
