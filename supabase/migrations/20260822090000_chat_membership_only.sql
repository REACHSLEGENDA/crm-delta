-- Delta Capital CRM: make the internal chat strictly membership-based.
--
-- Previously channels were visible by role/department/name (e.g. "Ventas",
-- "Compliance", "Retention", "Líderes" and the general/ventas/soporte/alertas
-- channel types were auto-shown to matching roles). This migration removes all
-- of those role/department/name branches. From now on a channel is visible and
-- readable ONLY to the users listed in its `members` array (plus SUPERADMIN so
-- administrators can still manage the workspace). Because message visibility
-- reuses public.can_access_channel(), this also gates message reads/writes to
-- channel members only.
--
-- The restrictive "Active accounts only" policy from
-- 20260818120000_harden_access_and_sync_pipeline.sql is intentionally left in
-- place and is NOT dropped here.

begin;

-- Membership-only access check. Same signature/attributes as the original so
-- dependent message policies keep working. Returns true only for a member of
-- the channel, or for a SUPERADMIN.
create or replace function public.can_access_channel(channel_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels c
    where c.id = channel_uuid
      and (
        public.get_user_role(auth.uid()) = 'SUPERADMIN'
        or auth.uid() = any(coalesce(c.members, '{}'::uuid[]))
      )
  );
$$;

revoke all on function public.can_access_channel(uuid) from public, anon;
grant execute on function public.can_access_channel(uuid) to authenticated, service_role;

-- Channel visibility is now membership-only (SUPERADMIN retained for admin).
drop policy if exists "Authorized users can read channels" on public.channels;
create policy "Authorized users can read channels"
on public.channels for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERADMIN'
  or auth.uid() = any(coalesce(members, '{}'::uuid[]))
);

commit;
