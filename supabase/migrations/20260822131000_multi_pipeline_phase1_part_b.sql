-- Delta Capital CRM -- Phase 1 (Part B): columns, pipeline-aware sync, RLS.
-- Run AFTER 20260822130000_multi_pipeline_phase1.sql (the enum values).

begin;

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.deals
  add column if not exists pipeline public.deal_pipeline not null default 'Ventas',
  -- The originating sales agent. Never reassigned when the account is handed to
  -- Compliance or Retention, so commission reporting and the agent's own history
  -- survive the handoff.
  add column if not exists sales_agent_id uuid references public.profiles(id) on delete set null;

-- Existing rows were all sold by their current agent.
update public.deals
set sales_agent_id = agent_id
where sales_agent_id is null and agent_id is not null;

create index if not exists idx_deals_pipeline_stage on public.deals (pipeline, stage);
create index if not exists idx_deals_sales_agent on public.deals (sales_agent_id);

-- ---------------------------------------------------------------------------
-- Pipeline-aware lead <-> deal synchronization
--
-- CRITICAL: the existing triggers cast deals.stage into lead_status. Compliance
-- and Retention stages have no lead_status counterpart, so without this guard
-- moving a deal out of Ventas would raise a cast error and abort the update.
-- The lead mirrors the Ventas pipeline only.
-- ---------------------------------------------------------------------------

create or replace function public.sync_deal_stage_to_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_status public.lead_status;
begin
  if new.lead_id is null or new.pipeline <> 'Ventas' then
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
security definer
set search_path = public
as $$
declare
  expected_stage public.deal_stage;
begin
  expected_stage := public.deal_stage_for_lead_status(new.status);

  update public.deals
  set stage = expected_stage
  where lead_id = new.id
    and pipeline = 'Ventas'
    and stage is distinct from expected_stage;

  return new;
end;
$$;

-- The agent sync must also leave other pipelines alone: once an account is in
-- Compliance or Retention it belongs to that department's owner, not the
-- prospect's sales agent.
create or replace function public.sync_lead_agent_to_deals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.deals
  set agent_id = new.agent_id
  where lead_id = new.id
    and pipeline = 'Ventas'
    and agent_id is distinct from new.agent_id;

  return new;
end;
$$;

revoke all on function public.sync_deal_stage_to_lead() from public, anon, authenticated;
revoke all on function public.sync_lead_status_to_deals() from public, anon, authenticated;
revoke all on function public.sync_lead_agent_to_deals() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security, per pipeline
-- ---------------------------------------------------------------------------

-- Agents work only their own department's pipeline.
drop policy if exists "Agents can create and edit own deals" on public.deals;
drop policy if exists "Agents can update own deals" on public.deals;
drop policy if exists "Agents read own pipeline deals" on public.deals;
drop policy if exists "Agents update own pipeline deals" on public.deals;

create policy "Agents read own pipeline deals"
on public.deals for select to authenticated
using (
  public.get_user_role(auth.uid()) = 'AGENT'
  and agent_id = auth.uid()
);

create policy "Agents update own pipeline deals"
on public.deals for update to authenticated
using (
  public.get_user_role(auth.uid()) = 'AGENT'
  and agent_id = auth.uid()
  and pipeline::text = public.get_user_department(auth.uid())::text
)
with check (
  public.get_user_role(auth.uid()) = 'AGENT'
  and agent_id = auth.uid()
  and pipeline::text = public.get_user_department(auth.uid())::text
);

-- A sales agent keeps read-only visibility of the accounts they originated,
-- which is what commission reporting is built on.
drop policy if exists "Sales agents read originated deals" on public.deals;
create policy "Sales agents read originated deals"
on public.deals for select to authenticated
using (sales_agent_id = auth.uid());

-- Compliance owns its pipeline and reads Ventas for context.
drop policy if exists "Compliance reads sales pipeline" on public.deals;
create policy "Compliance reads sales pipeline"
on public.deals for select to authenticated
using (
  public.get_user_department(auth.uid()) = 'Cumplimiento'
  and pipeline in ('Ventas', 'Cumplimiento')
);

drop policy if exists "Compliance manages compliance pipeline" on public.deals;
create policy "Compliance manages compliance pipeline"
on public.deals for update to authenticated
using (
  public.get_user_department(auth.uid()) = 'Cumplimiento'
  and pipeline = 'Cumplimiento'
)
with check (
  public.get_user_department(auth.uid()) = 'Cumplimiento'
  and pipeline = 'Cumplimiento'
);

commit;
