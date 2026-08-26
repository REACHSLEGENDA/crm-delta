-- Delta Capital CRM: make the lead <-> deal stage sync actually propagate.
--
-- sync_deal_stage_to_lead() and sync_lead_status_to_deals() were created without
-- SECURITY DEFINER, so the UPDATE they run against the *other* table executed
-- with the calling user's privileges and was filtered by that table's RLS
-- policies. When the caller could not update the counterpart row the statement
-- silently affected zero rows -- no error, no sync. Moving a prospect from
-- "Perdido" to "Nuevo" in Prospectos therefore left its deal stuck in Perdido.
--
-- Keeping the two records consistent is a system invariant, not a per-user
-- permission decision, so both functions now run as their owner. The trigger
-- pair is still guarded against recursion by the "IS DISTINCT FROM" filters.

begin;

create or replace function public.sync_deal_stage_to_lead()
returns trigger
language plpgsql
security definer
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
    and stage is distinct from expected_stage;

  return new;
end;
$$;

revoke all on function public.sync_deal_stage_to_lead() from public, anon, authenticated;
revoke all on function public.sync_lead_status_to_deals() from public, anon, authenticated;

commit;
