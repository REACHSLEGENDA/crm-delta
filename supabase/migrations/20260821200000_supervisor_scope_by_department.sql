-- Supervisor visibility was scoped to team_id, but no lead/deal/contact/profile
-- in this dataset has a team assigned (teams table is not actually in use yet).
-- Rescope supervisors by department instead, which is populated for every
-- profile. This can be revisited once real teams are set up.

create or replace function public.get_profile_department(profile_uuid uuid)
returns public.user_department
language sql
stable
security definer
set search_path = public
as $$
  select p.department
  from public.profiles p
  where p.id = profile_uuid;
$$;

revoke all on function public.get_profile_department(uuid) from public, anon;
grant execute on function public.get_profile_department(uuid) to authenticated, service_role;

-- Profiles
drop policy if exists "Supervisors can read team profiles" on public.profiles;
create policy "Supervisors can read department profiles" on public.profiles for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and department = public.get_user_department(auth.uid())
);

-- Leads
drop policy if exists "Supervisors can read team leads" on public.leads;
drop policy if exists "Supervisors can update team leads" on public.leads;
create policy "Supervisors can read department leads" on public.leads for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);
create policy "Supervisors can update department leads" on public.leads for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);

-- Deals
drop policy if exists "Supervisors can read team deals" on public.deals;
drop policy if exists "Supervisors can update team deals" on public.deals;
create policy "Supervisors can read department deals" on public.deals for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);
create policy "Supervisors can update department deals" on public.deals for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);

-- Contacts
drop policy if exists "Supervisors can read team contacts" on public.contacts;
drop policy if exists "Supervisors can update team contacts" on public.contacts;
create policy "Supervisors can read department contacts" on public.contacts for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);
create policy "Supervisors can update department contacts" on public.contacts for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and agent_id is not null
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);

-- Activities
drop policy if exists "Supervisors can read team activities" on public.activities;
create policy "Supervisors can read department activities" on public.activities for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_department(user_id) = public.get_user_department(auth.uid())
);

-- Calls
drop policy if exists "Supervisors can read team calls" on public.calls;
drop policy if exists "Supervisors can update team calls" on public.calls;
create policy "Supervisors can read department calls" on public.calls for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);
create policy "Supervisors can update department calls" on public.calls for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_department(agent_id) = public.get_user_department(auth.uid())
);

-- Notes
drop policy if exists "Supervisors can read team notes" on public.notes;
create policy "Supervisors can read department notes" on public.notes for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_department(user_id) = public.get_user_department(auth.uid())
);
