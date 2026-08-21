-- Real organizational hierarchy:
-- department -> one or more teams -> one leader -> assigned members.

alter table public.teams
  add column if not exists department public.user_department,
  add column if not exists leader_id uuid references public.profiles(id) on delete set null,
  add column if not exists active boolean not null default true;

create unique index if not exists teams_one_active_assignment_per_leader
  on public.teams(leader_id)
  where leader_id is not null and active = true;

create index if not exists idx_teams_department_active
  on public.teams(department, active);

create or replace function public.get_led_team(user_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teams t
  where t.leader_id = user_uuid
    and t.active = true
  limit 1;
$$;

revoke all on function public.get_led_team(uuid) from public, anon;
grant execute on function public.get_led_team(uuid) to authenticated, service_role;

create or replace function public.crm_record_belongs_to_team(
  record_lead_id uuid,
  record_deal_id uuid,
  record_contact_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_team_id is not null and (
    exists (select 1 from public.leads l where l.id = record_lead_id and l.team_id = target_team_id)
    or exists (select 1 from public.deals d where d.id = record_deal_id and d.team_id = target_team_id)
    or exists (select 1 from public.contacts c where c.id = record_contact_id and c.team_id = target_team_id)
  );
$$;

revoke all on function public.crm_record_belongs_to_team(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.crm_record_belongs_to_team(uuid, uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.configure_department_team(
  target_team_id uuid,
  team_name text,
  team_department public.user_department,
  team_leader_id uuid,
  member_ids uuid[],
  team_description text default null,
  team_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  actor_department public.user_department;
  resolved_team_id uuid;
  previous_members uuid[] := '{}'::uuid[];
  affected_members uuid[];
  invalid_members integer;
begin
  actor_role := public.get_user_role(auth.uid());
  actor_department := public.get_user_department(auth.uid());

  if actor_role not in ('SUPERADMIN', 'MANAGER') then
    raise exception 'No tienes permiso para configurar equipos.';
  end if;
  if actor_role = 'MANAGER' and actor_department is distinct from team_department then
    raise exception 'Un manager solo puede configurar equipos de su departamento.';
  end if;
  if nullif(trim(team_name), '') is null then
    raise exception 'El nombre del equipo es obligatorio.';
  end if;
  if team_leader_id is null then
    raise exception 'El equipo debe tener un líder.';
  end if;

  select count(*)
    into invalid_members
  from public.profiles p
  where p.id = any(array_append(coalesce(member_ids, '{}'::uuid[]), team_leader_id))
    and (
      p.department is distinct from team_department
      or p.active = false
      or (p.id = team_leader_id and p.role not in ('MANAGER', 'SUPERVISOR'))
    );

  if invalid_members > 0 then
    raise exception 'El líder y los miembros deben estar activos y pertenecer al mismo departamento.';
  end if;

  if not exists (select 1 from public.profiles where id = team_leader_id) then
    raise exception 'El líder seleccionado no existe.';
  end if;

  if target_team_id is null then
    insert into public.teams (name, description, department, leader_id, active)
    values (trim(team_name), nullif(trim(team_description), ''), team_department, team_leader_id, team_active)
    returning id into resolved_team_id;
  else
    select array_agg(id) into previous_members
    from public.profiles
    where team_id = target_team_id;

    update public.teams
    set name = trim(team_name),
        description = nullif(trim(team_description), ''),
        department = team_department,
        leader_id = team_leader_id,
        active = team_active,
        updated_at = now()
    where id = target_team_id
    returning id into resolved_team_id;

    if resolved_team_id is null then
      raise exception 'El equipo no existe.';
    end if;
  end if;

  affected_members := (
    select array_agg(distinct member_id)
    from unnest(
      coalesce(previous_members, '{}'::uuid[])
      || coalesce(member_ids, '{}'::uuid[])
      || array[team_leader_id]
    ) as members(member_id)
  );

  update public.profiles
  set team_id = null,
      updated_at = now()
  where team_id = resolved_team_id
    and id <> team_leader_id
    and not (id = any(coalesce(member_ids, '{}'::uuid[])));

  update public.profiles
  set team_id = resolved_team_id,
      updated_at = now()
  where id = any(array_append(coalesce(member_ids, '{}'::uuid[]), team_leader_id));

  update public.leads l
  set team_id = p.team_id, updated_at = now()
  from public.profiles p
  where l.agent_id = p.id and p.id = any(coalesce(affected_members, '{}'::uuid[]));

  update public.deals d
  set team_id = p.team_id, updated_at = now()
  from public.profiles p
  where d.agent_id = p.id and p.id = any(coalesce(affected_members, '{}'::uuid[]));

  update public.contacts c
  set team_id = p.team_id, updated_at = now()
  from public.profiles p
  where c.agent_id = p.id and p.id = any(coalesce(affected_members, '{}'::uuid[]));

  return resolved_team_id;
end;
$$;

revoke all on function public.configure_department_team(uuid, text, public.user_department, uuid, uuid[], text, boolean) from public, anon;
grant execute on function public.configure_department_team(uuid, text, public.user_department, uuid, uuid[], text, boolean) to authenticated;

create or replace function public.sync_record_team_from_agent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.agent_id is null then
    new.team_id := null;
  else
    new.team_id := public.get_profile_team(new.agent_id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_record_team_from_agent() from public, anon, authenticated;

drop trigger if exists sync_lead_team_from_agent_trigger on public.leads;
create trigger sync_lead_team_from_agent_trigger
before insert or update of agent_id on public.leads
for each row execute function public.sync_record_team_from_agent();

drop trigger if exists sync_deal_team_from_agent_trigger on public.deals;
create trigger sync_deal_team_from_agent_trigger
before insert or update of agent_id on public.deals
for each row execute function public.sync_record_team_from_agent();

drop trigger if exists sync_contact_team_from_agent_trigger on public.contacts;
create trigger sync_contact_team_from_agent_trigger
before insert or update of agent_id on public.contacts
for each row execute function public.sync_record_team_from_agent();

drop policy if exists "Managers configure department teams" on public.teams;
create policy "Managers configure department teams"
on public.teams for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'MANAGER'
  and department = public.get_user_department(auth.uid())
);

-- profiles is shared with the trading platform (trading_accounts.profile_id).
-- The colleague directory must stay inside the CRM: scope it to staff on BOTH
-- sides (the reader and the row shown) so trading clients neither appear in it
-- nor can read it. Guarded with to_regclass so the function stays valid on
-- environments where the trading tables are absent (local/CI).
create or replace function public.is_trading_client(profile_uuid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if to_regclass('public.trading_accounts') is null then
    return false;
  end if;
  return exists (
    select 1 from public.trading_accounts ta where ta.profile_id = profile_uuid
  );
end;
$$;

revoke all on function public.is_trading_client(uuid) from public, anon;
grant execute on function public.is_trading_client(uuid) to authenticated, service_role;

drop policy if exists "Authenticated users read active colleague directory" on public.profiles;
drop policy if exists "Staff read active colleague directory" on public.profiles;
create policy "Staff read active colleague directory"
on public.profiles for select to authenticated
using (
  public.is_active_user()
  and active = true
  and not public.is_trading_client(id)
  and not public.is_trading_client(auth.uid())
);

-- Remove the temporary department-wide supervisor scope. Team leaders now see
-- only records connected to their configured team.
drop policy if exists "Supervisors can read department profiles" on public.profiles;
drop policy if exists "Supervisors can read department leads" on public.leads;
drop policy if exists "Supervisors can update department leads" on public.leads;
drop policy if exists "Supervisors can read department deals" on public.deals;
drop policy if exists "Supervisors can update department deals" on public.deals;
drop policy if exists "Supervisors can read department contacts" on public.contacts;
drop policy if exists "Supervisors can update department contacts" on public.contacts;
drop policy if exists "Supervisors can read department activities" on public.activities;
drop policy if exists "Supervisors can read department calls" on public.calls;
drop policy if exists "Supervisors can update department calls" on public.calls;
drop policy if exists "Supervisors can read department notes" on public.notes;

drop policy if exists "Team leaders read profiles" on public.profiles;
create policy "Team leaders read profiles" on public.profiles for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);

drop policy if exists "Team leaders read leads" on public.leads;
drop policy if exists "Team leaders update leads" on public.leads;
create policy "Team leaders read leads" on public.leads for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);
create policy "Team leaders update leads" on public.leads for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);

drop policy if exists "Team leaders read deals" on public.deals;
drop policy if exists "Team leaders update deals" on public.deals;
create policy "Team leaders read deals" on public.deals for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);
create policy "Team leaders update deals" on public.deals for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);

drop policy if exists "Team leaders read contacts" on public.contacts;
drop policy if exists "Team leaders update contacts" on public.contacts;
create policy "Team leaders read contacts" on public.contacts for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);
create policy "Team leaders update contacts" on public.contacts for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and team_id = public.get_led_team(auth.uid())
);

drop policy if exists "Team leaders read activities" on public.activities;
create policy "Team leaders read activities" on public.activities for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and (
    public.get_profile_team(user_id) = public.get_led_team(auth.uid())
    or public.crm_record_belongs_to_team(lead_id, deal_id, contact_id, public.get_led_team(auth.uid()))
  )
);

drop policy if exists "Team leaders read calls" on public.calls;
drop policy if exists "Team leaders update calls" on public.calls;
create policy "Team leaders read calls" on public.calls for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_team(agent_id) = public.get_led_team(auth.uid())
);
create policy "Team leaders update calls" on public.calls for update to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_team(agent_id) = public.get_led_team(auth.uid())
) with check (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and public.get_profile_team(agent_id) = public.get_led_team(auth.uid())
);

drop policy if exists "Team leaders read notes" on public.notes;
create policy "Team leaders read notes" on public.notes for select to authenticated using (
  public.get_user_role(auth.uid()) = 'SUPERVISOR'
  and (
    public.get_profile_team(user_id) = public.get_led_team(auth.uid())
    or public.crm_record_belongs_to_team(lead_id, deal_id, contact_id, public.get_led_team(auth.uid()))
  )
);

comment on function public.configure_department_team is
  'Creates or updates a department team, assigns its leader/members, and synchronizes operational records.';
