-- Lead recycling guardrail and call-quality outcomes.
-- A lead is automatically sent to Burn when it reaches a second distinct agent.

alter type public.call_disposition add value if not exists 'Número inexistente';

alter table public.leads
  add column if not exists is_burned boolean not null default false,
  add column if not exists burned_at timestamptz,
  add column if not exists burn_reason text,
  add column if not exists contact_outcome text not null default 'pending';

alter table public.leads
  drop constraint if exists leads_contact_outcome_check;

alter table public.leads
  add constraint leads_contact_outcome_check
  check (contact_outcome in ('pending', 'valid', 'invalid_number', 'direct_voicemail'));

create table if not exists public.lead_agent_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  first_assigned_at timestamptz not null default now(),
  last_assigned_at timestamptz not null default now(),
  assignment_count integer not null default 1 check (assignment_count > 0),
  unique (lead_id, agent_id)
);

create index if not exists idx_leads_burned_created
  on public.leads(is_burned, created_at desc);
create index if not exists idx_leads_contact_outcome
  on public.leads(contact_outcome);
create index if not exists idx_lead_agent_assignments_lead
  on public.lead_agent_assignments(lead_id, first_assigned_at);

insert into public.lead_agent_assignments (lead_id, agent_id, first_assigned_at, last_assigned_at)
select id, agent_id, coalesce(created_at, now()), coalesce(updated_at, created_at, now())
from public.leads
where agent_id is not null
on conflict (lead_id, agent_id) do nothing;

create or replace function public.guard_lead_agent_recycling()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  distinct_agents integer;
  actor_role text;
begin
  actor_role := coalesce(public.get_user_role(auth.uid())::text, 'SYSTEM');

  if old.is_burned and new.agent_id is distinct from old.agent_id and actor_role <> 'SUPERADMIN' then
    raise exception 'Este prospecto está en Burn y ya no puede reasignarse.';
  end if;

  if old.is_burned and new.is_burned = false and actor_role <> 'SUPERADMIN' then
    raise exception 'Solo SUPERADMIN puede recuperar un prospecto de Burn.';
  end if;

  if new.agent_id is distinct from old.agent_id and new.agent_id is not null then
    select count(distinct agent_id)
      into distinct_agents
    from public.lead_agent_assignments
    where lead_id = old.id;

    -- El segundo agente todavía puede trabajar el lead. Cualquier movimiento
    -- posterior lo manda a Burn y conserva al último responsable real.
    if coalesce(distinct_agents, 0) >= 2 and actor_role <> 'SUPERADMIN' then
      new.agent_id := old.agent_id;
      new.is_burned := true;
      new.burned_at := coalesce(new.burned_at, now());
      new.burn_reason := coalesce(
        nullif(new.burn_reason, ''),
        'Límite automático: el prospecto ya pasó por 2 agentes distintos.'
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.record_lead_agent_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.agent_id is not null and (tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id) then
    insert into public.lead_agent_assignments (lead_id, agent_id)
    values (new.id, new.agent_id)
    on conflict (lead_id, agent_id) do update
      set last_assigned_at = now(),
          assignment_count = public.lead_agent_assignments.assignment_count + 1;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_lead_agent_recycling() from public, anon, authenticated;
revoke all on function public.record_lead_agent_assignment() from public, anon, authenticated;

drop trigger if exists guard_lead_agent_recycling_trigger on public.leads;
create trigger guard_lead_agent_recycling_trigger
before update of agent_id, is_burned on public.leads
for each row execute function public.guard_lead_agent_recycling();

drop trigger if exists record_lead_agent_assignment_trigger on public.leads;
create trigger record_lead_agent_assignment_trigger
after insert or update of agent_id on public.leads
for each row execute function public.record_lead_agent_assignment();

alter table public.lead_agent_assignments enable row level security;

drop policy if exists "Users read accessible lead assignment history" on public.lead_agent_assignments;
create policy "Users read accessible lead assignment history"
on public.lead_agent_assignments
for select
to authenticated
using (
  public.is_active_user()
  and exists (
    select 1
    from public.leads l
    where l.id = lead_agent_assignments.lead_id
  )
);

grant select on public.lead_agent_assignments to authenticated;

comment on column public.leads.is_burned is
  'True when a lead must leave the active recycling pool.';
comment on column public.leads.contact_outcome is
  'Call-quality classification: pending, valid, invalid_number, direct_voicemail.';
comment on table public.lead_agent_assignments is
  'Auditable history of the distinct agents who have received each lead.';
