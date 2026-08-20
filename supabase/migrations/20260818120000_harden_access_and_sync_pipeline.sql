-- Delta Capital CRM: active-account enforcement, private compliance files,
-- and transactional synchronization between leads and deals.

begin;

alter type public.channel_type add value if not exists 'privado';

alter table public.channels
  add column if not exists members uuid[] not null default '{}'::uuid[];

-- Security helpers intentionally return no role/team/department for disabled
-- accounts. They are SECURITY DEFINER to avoid recursive profile RLS checks.
create or replace function public.is_active_user(user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_uuid
      and p.active is true
  );
$$;

create or replace function public.get_user_role(user_uuid uuid)
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = user_uuid
    and p.active is true;
$$;

create or replace function public.get_user_team(user_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.team_id
  from public.profiles p
  where p.id = user_uuid
    and p.active is true;
$$;

create or replace function public.get_profile_team(profile_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.team_id
  from public.profiles p
  where p.id = profile_uuid;
$$;

create or replace function public.get_user_department(user_uuid uuid)
returns public.user_department
language sql
stable
security definer
set search_path = public
as $$
  select p.department
  from public.profiles p
  where p.id = user_uuid
    and p.active is true;
$$;

revoke all on function public.is_active_user(uuid) from public, anon;
revoke all on function public.get_user_role(uuid) from public, anon;
revoke all on function public.get_user_team(uuid) from public, anon;
revoke all on function public.get_profile_team(uuid) from public, anon;
revoke all on function public.get_user_department(uuid) from public, anon;
grant execute on function public.is_active_user(uuid) to authenticated, service_role;
grant execute on function public.get_user_role(uuid) to authenticated, service_role;
grant execute on function public.get_user_team(uuid) to authenticated, service_role;
grant execute on function public.get_profile_team(uuid) to authenticated, service_role;
grant execute on function public.get_user_department(uuid) to authenticated, service_role;

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
    join public.profiles p on p.id = auth.uid()
    where c.id = channel_uuid
      and p.active is true
      and (
        p.role = 'SUPERADMIN'
        or (
          c.type::text = 'privado'
          and auth.uid() = any(coalesce(c.members, '{}'::uuid[]))
        )
        or (
          c.type::text <> 'privado'
          and case
            when c.name = 'Ventas' then p.role in ('AGENT', 'MANAGER') or p.department = 'Ventas'
            when c.name = 'Compliance' then p.role = 'MANAGER' or p.department = 'Cumplimiento'
            when c.name = 'Retention' then p.role = 'MANAGER' or p.department = 'Retencion'
            when c.name = 'Líderes' then p.role = 'MANAGER'
            when c.type::text = 'general' then true
            when c.type::text = 'ventas' then p.role in ('AGENT', 'MANAGER') or p.department = 'Ventas'
            when c.type::text = 'soporte' then p.role in ('SUPERVISOR', 'MANAGER')
            when c.type::text = 'alertas' then p.role = 'MANAGER'
            else false
          end
        )
      )
  );
$$;

revoke all on function public.can_access_channel(uuid) from public, anon;
grant execute on function public.can_access_channel(uuid) to authenticated, service_role;

-- Never trust role/department metadata supplied to the public Auth signup
-- endpoint. Administrative registration promotes and activates the profile
-- only after authorization in the admin_create_user Edge Function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    department,
    active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'AGENT'::public.user_role,
    'Ventas'::public.user_department,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Restrictive policies are ANDed with every existing permissive policy. This
-- closes broad legacy policies such as "authenticated users" without having to
-- duplicate each table's role rules. Profiles is excluded so a disabled user
-- can still read their own `active = false` flag and receive a useful message.
do $$
declare
  target_table record;
begin
  for target_table in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity is true
      and c.relname <> 'profiles'
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'Active accounts only',
      target_table.table_name
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (public.is_active_user(auth.uid())) with check (public.is_active_user(auth.uid()))',
      'Active accounts only',
      target_table.table_name
    );
  end loop;
end
$$;

-- Replace legacy role policies whose names described restrictions that their
-- expressions did not actually enforce. Delete remains SUPERADMIN-only.
drop policy if exists "Superadmins can do all on profiles" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Managers can read profiles of their team" on public.profiles;
drop policy if exists "Managers and compliance can read profiles" on public.profiles;
drop policy if exists "Supervisors can read team profiles" on public.profiles;

create policy "Superadmins can do all on profiles"
on public.profiles for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Managers and compliance can read profiles"
on public.profiles for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'MANAGER'
  or public.get_user_department(auth.uid()) = 'Cumplimiento'
);

create policy "Supervisors can read team profiles"
on public.profiles for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_user_team(auth.uid())
);

drop policy if exists "Superadmins can do all on leads" on public.leads;
drop policy if exists "Managers can read and edit leads of their team" on public.leads;
drop policy if exists "Managers can read and edit all leads" on public.leads;
drop policy if exists "Agents can manage their own leads" on public.leads;
drop policy if exists "Supervisors can read leads of their team" on public.leads;
drop policy if exists "Managers can create and edit leads" on public.leads;
drop policy if exists "Agents can create and edit own leads" on public.leads;

create policy "Superadmins can do all on leads"
on public.leads for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');

create policy "Managers can create and edit leads"
on public.leads for select to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Managers can insert leads"
on public.leads for insert to authenticated
with check (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Managers can update leads"
on public.leads for update to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER')
with check (public.get_user_role(auth.uid()) = 'MANAGER');

create policy "Agents can create and edit own leads"
on public.leads for select to authenticated
using (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Agents can insert own leads"
on public.leads for insert to authenticated
with check (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Agents can update own leads"
on public.leads for update to authenticated
using (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid())
with check (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());

create policy "Supervisors can read leads of their team"
on public.leads for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_user_team(auth.uid())
);

drop policy if exists "Superadmins can do all on deals" on public.deals;
drop policy if exists "Managers can read and edit deals of their team" on public.deals;
drop policy if exists "Managers can read and edit all deals" on public.deals;
drop policy if exists "Agents can manage their own deals" on public.deals;
drop policy if exists "Supervisors can read deals of their team" on public.deals;
drop policy if exists "Managers can create and edit deals" on public.deals;
drop policy if exists "Agents can create and edit own deals" on public.deals;

create policy "Superadmins can do all on deals"
on public.deals for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');
create policy "Managers can create and edit deals"
on public.deals for select to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Managers can insert deals"
on public.deals for insert to authenticated
with check (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Managers can update deals"
on public.deals for update to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER')
with check (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Agents can create and edit own deals"
on public.deals for select to authenticated
using (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Agents can insert own deals"
on public.deals for insert to authenticated
with check (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Agents can update own deals"
on public.deals for update to authenticated
using (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid())
with check (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Supervisors can read deals of their team"
on public.deals for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_user_team(auth.uid())
);

drop policy if exists "Superadmins can do all on contacts" on public.contacts;
drop policy if exists "Managers can read and edit contacts of their team" on public.contacts;
drop policy if exists "Managers can read and edit all contacts" on public.contacts;
drop policy if exists "Agents can manage their own contacts" on public.contacts;
drop policy if exists "Supervisors can read contacts of their team" on public.contacts;
drop policy if exists "Managers can create and edit contacts" on public.contacts;
drop policy if exists "Agents can create and edit own contacts" on public.contacts;

create policy "Superadmins can do all on contacts"
on public.contacts for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');
create policy "Managers can create and edit contacts"
on public.contacts for select to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Managers can insert contacts"
on public.contacts for insert to authenticated
with check (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Managers can update contacts"
on public.contacts for update to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER')
with check (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Agents can create and edit own contacts"
on public.contacts for select to authenticated
using (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Agents can insert own contacts"
on public.contacts for insert to authenticated
with check (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Agents can update own contacts"
on public.contacts for update to authenticated
using (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid())
with check (public.get_user_role(auth.uid()) = 'AGENT' and agent_id = auth.uid());
create policy "Supervisors can read contacts of their team"
on public.contacts for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_user_team(auth.uid())
);

drop policy if exists "Superadmins can manage all activities" on public.activities;
drop policy if exists "Users can view activities of their team or ownership" on public.activities;
drop policy if exists "Authenticated users can insert activities" on public.activities;
drop policy if exists "Managers can read activities" on public.activities;
drop policy if exists "Supervisors can read team activities" on public.activities;
drop policy if exists "Users can read own activities" on public.activities;
drop policy if exists "Users can insert own activities" on public.activities;

create policy "Superadmins can manage all activities"
on public.activities for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');
create policy "Managers can read activities"
on public.activities for select to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Supervisors can read team activities"
on public.activities for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_team(user_id) = public.get_user_team(auth.uid())
);
create policy "Users can read own activities"
on public.activities for select to authenticated
using (user_id = auth.uid());
create policy "Users can insert own activities"
on public.activities for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Superadmins can manage all calls" on public.calls;
drop policy if exists "Managers can read and edit calls of their team" on public.calls;
drop policy if exists "Agents can manage their own calls" on public.calls;
drop policy if exists "Supervisors can read calls of their team" on public.calls;
drop policy if exists "Managers can read calls" on public.calls;
drop policy if exists "Users can insert calls" on public.calls;
drop policy if exists "Agents can update own calls" on public.calls;

create policy "Superadmins can manage all calls"
on public.calls for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');
create policy "Managers can read calls"
on public.calls for select to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Users can insert calls"
on public.calls for insert to authenticated
with check (
  agent_id = auth.uid()
  and public.get_user_role(auth.uid()) in ('AGENT', 'MANAGER')
);
create policy "Agents can update own calls"
on public.calls for update to authenticated
using (
  agent_id = auth.uid()
  and public.get_user_role(auth.uid()) in ('AGENT', 'MANAGER')
)
with check (
  agent_id = auth.uid()
  and public.get_user_role(auth.uid()) in ('AGENT', 'MANAGER')
);
create policy "Supervisors can read calls of their team"
on public.calls for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_team(agent_id) = public.get_user_team(auth.uid())
);

drop policy if exists "Superadmins can manage all notes" on public.notes;
drop policy if exists "Authenticated users can view/manage notes depending on team/owner" on public.notes;
drop policy if exists "Managers can read notes" on public.notes;
drop policy if exists "Supervisors can read team notes" on public.notes;
drop policy if exists "Users can read own notes" on public.notes;
drop policy if exists "Users can insert own notes" on public.notes;
drop policy if exists "Users can update own notes" on public.notes;

create policy "Superadmins can manage all notes"
on public.notes for all to authenticated
using (public.get_user_role(auth.uid()) = 'SUPERADMIN')
with check (public.get_user_role(auth.uid()) = 'SUPERADMIN');
create policy "Managers can read notes"
on public.notes for select to authenticated
using (public.get_user_role(auth.uid()) = 'MANAGER');
create policy "Supervisors can read team notes"
on public.notes for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_team(user_id) = public.get_user_team(auth.uid())
);
create policy "Users can read own notes"
on public.notes for select to authenticated
using (user_id = auth.uid());
create policy "Users can insert own notes"
on public.notes for insert to authenticated
with check (user_id = auth.uid());
create policy "Users can update own notes"
on public.notes for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Authenticated users can read and join chat channels" on public.channels;
drop policy if exists "Superadmins and Managers can manage channels" on public.channels;
drop policy if exists "Authorized users can read channels" on public.channels;
drop policy if exists "Leaders can manage channels" on public.channels;

create policy "Authorized users can read channels"
on public.channels for select to authenticated
using (public.can_access_channel(id));
create policy "Leaders can manage channels"
on public.channels for all to authenticated
using (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'))
with check (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'));

drop policy if exists "Authenticated users can read messages" on public.messages;
drop policy if exists "Authenticated users can send messages" on public.messages;
drop policy if exists "Users can delete/update their own messages" on public.messages;
drop policy if exists "Channel members can read messages" on public.messages;
drop policy if exists "Channel members can send messages" on public.messages;
drop policy if exists "Users can manage own channel messages" on public.messages;

create policy "Channel members can read messages"
on public.messages for select to authenticated
using (public.can_access_channel(channel_id));
create policy "Channel members can send messages"
on public.messages for insert to authenticated
with check (
  user_id = auth.uid()
  and public.can_access_channel(channel_id)
);
create policy "Users can manage own channel messages"
on public.messages for update to authenticated
using (
  user_id = auth.uid()
  and public.can_access_channel(channel_id)
)
with check (
  user_id = auth.uid()
  and public.can_access_channel(channel_id)
);
create policy "Users can delete own channel messages"
on public.messages for delete to authenticated
using (
  user_id = auth.uid()
  and public.can_access_channel(channel_id)
);

-- Compliance staff need read access to the leads they review, regardless of
-- sales assignment. Disabled accounts are still rejected by the restrictive
-- policy above and by get_user_department().
drop policy if exists "Compliance can read leads" on public.leads;
create policy "Compliance can read leads"
on public.leads
for select
to authenticated
using (public.get_user_department(auth.uid()) = 'Cumplimiento');

-- Replace the original public compliance-document policy with role- and
-- ownership-aware access.
drop policy if exists "Superadmins can do all on compliance_documents" on public.compliance_documents;
drop policy if exists "Compliance department can do all" on public.compliance_documents;
drop policy if exists "Anyone can read compliance docs" on public.compliance_documents;
drop policy if exists "Compliance documents read" on public.compliance_documents;
drop policy if exists "Compliance documents insert" on public.compliance_documents;
drop policy if exists "Compliance documents delete" on public.compliance_documents;

create policy "Compliance documents read"
on public.compliance_documents
for select
to authenticated
using (
  public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER')
  or public.get_user_department(auth.uid()) = 'Cumplimiento'
  or uploaded_by = auth.uid()
  or exists (
    select 1
    from public.leads l
    where l.id = compliance_documents.lead_id
      and (
        l.agent_id = auth.uid()
        or (
          public.get_user_role(auth.uid()) = 'SUPERVISOR'
          and l.team_id = public.get_user_team(auth.uid())
        )
      )
  )
);

create policy "Compliance documents insert"
on public.compliance_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.leads l
    where l.id = compliance_documents.lead_id
  )
);

create policy "Compliance documents delete"
on public.compliance_documents
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or public.get_user_role(auth.uid()) = 'SUPERADMIN'
  or public.get_user_department(auth.uid()) = 'Cumplimiento'
);

-- Compliance files must not have permanent public URLs.
update storage.buckets
set public = false
where id = 'compliance_docs';

drop policy if exists "Public Access to compliance docs" on storage.objects;
drop policy if exists "Auth Users Insert to compliance docs" on storage.objects;
drop policy if exists "Auth Users Delete from compliance docs" on storage.objects;
drop policy if exists "Active users read compliance files" on storage.objects;
drop policy if exists "Active users upload compliance files" on storage.objects;
drop policy if exists "Authorized users delete compliance files" on storage.objects;

create policy "Active users read compliance files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'compliance_docs'
  and public.is_active_user(auth.uid())
  and exists (
    select 1
    from public.compliance_documents d
    where d.file_path = storage.objects.name
  )
);

create policy "Active users upload compliance files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'compliance_docs'
  and public.is_active_user(auth.uid())
  and exists (
    select 1
    from public.leads l
    where l.id::text = coalesce((storage.foldername(name))[1], '')
  )
);

create policy "Authorized users delete compliance files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'compliance_docs'
  and public.is_active_user(auth.uid())
  and (
    owner_id = auth.uid()::text
    or public.get_user_role(auth.uid()) = 'SUPERADMIN'
    or public.get_user_department(auth.uid()) = 'Cumplimiento'
  )
  and exists (
    select 1
    from public.compliance_documents d
    where d.file_path = storage.objects.name
  )
);

-- Canonical mappings used by both trigger directions.
create or replace function public.lead_status_for_deal_stage(stage_value public.deal_stage)
returns public.lead_status
language sql
immutable
strict
set search_path = public
as $$
  select case
    when stage_value::text = 'Nuevo lead' then 'Nuevo'::public.lead_status
    else stage_value::text::public.lead_status
  end;
$$;

create or replace function public.deal_stage_for_lead_status(status_value public.lead_status)
returns public.deal_stage
language sql
immutable
strict
set search_path = public
as $$
  select case
    when status_value::text = 'Nuevo' then 'Nuevo lead'::public.deal_stage
    else status_value::text::public.deal_stage
  end;
$$;

create or replace function public.sync_deal_stage_to_lead()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_status public.lead_status;
begin
  if new.lead_id is null then
    return new;
  end if;

  expected_status := public.lead_status_for_deal_stage(new.stage);

  update public.leads
  set status = expected_status
  where id = new.lead_id
    and status is distinct from expected_status;

  return new;
end;
$$;

create or replace function public.sync_lead_status_to_deals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_stage public.deal_stage;
begin
  expected_stage := public.deal_stage_for_lead_status(new.status);

  update public.deals
  set stage = expected_stage
  where lead_id = new.id
    and stage is distinct from expected_stage;

  return new;
end;
$$;

revoke all on function public.sync_deal_stage_to_lead() from public, anon, authenticated;
revoke all on function public.sync_lead_status_to_deals() from public, anon, authenticated;

drop trigger if exists sync_deal_stage_to_lead_trigger on public.deals;
create trigger sync_deal_stage_to_lead_trigger
after insert or update of stage, lead_id on public.deals
for each row
execute function public.sync_deal_stage_to_lead();

drop trigger if exists sync_lead_status_to_deals_trigger on public.leads;
create trigger sync_lead_status_to_deals_trigger
after update of status on public.leads
for each row
when (old.status is distinct from new.status)
execute function public.sync_lead_status_to_deals();

-- Repair already-existing mismatches using the most recently updated deal for
-- each prospect as the current pipeline stage.
with latest_deal as (
  select distinct on (d.lead_id)
    d.lead_id,
    d.stage
  from public.deals d
  where d.lead_id is not null
  order by d.lead_id, d.updated_at desc, d.created_at desc, d.id desc
)
update public.leads l
set status = public.lead_status_for_deal_stage(latest_deal.stage)
from latest_deal
where l.id = latest_deal.lead_id
  and l.status is distinct from public.lead_status_for_deal_stage(latest_deal.stage);

commit;
