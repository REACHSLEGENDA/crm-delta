-- Delta Capital CRM: let follow-up work count as activity on the record.
--
-- leads.updated_at only moved when the lead row itself was edited. A comment, a
-- logged call or a stage movement is written to notes / activities / calls, so
-- the prospect kept showing its import date and the "last activity" column read
-- the same stale value for every row.
--
-- These triggers bump the parent record whenever follow-up work is registered
-- against it. SECURITY DEFINER because the writer of a note is not necessarily
-- allowed to UPDATE the lead (an agent commenting on a colleague's prospect),
-- and the timestamp must move regardless.

begin;

create or replace function public.touch_parent_record_on_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lead_id is not null then
    update public.leads set updated_at = now() where id = new.lead_id;
  end if;

  if new.contact_id is not null then
    update public.contacts set updated_at = now() where id = new.contact_id;
  end if;

  return new;
end;
$$;

revoke all on function public.touch_parent_record_on_activity() from public, anon, authenticated;

drop trigger if exists touch_lead_on_note_trigger on public.notes;
create trigger touch_lead_on_note_trigger
after insert on public.notes
for each row execute function public.touch_parent_record_on_activity();

drop trigger if exists touch_lead_on_activity_trigger on public.activities;
create trigger touch_lead_on_activity_trigger
after insert on public.activities
for each row execute function public.touch_parent_record_on_activity();

drop trigger if exists touch_lead_on_call_trigger on public.calls;
create trigger touch_lead_on_call_trigger
after insert on public.calls
for each row execute function public.touch_parent_record_on_activity();

-- A deal moving through the pipeline is follow-up on the prospect behind it.
-- The existing stage sync only rewrites leads.status when the mapped status
-- actually differs, so moving between stages that share a status (or any
-- non-Ventas pipeline) left the prospect untouched.
create or replace function public.touch_lead_on_deal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lead_id is not null then
    update public.leads set updated_at = now() where id = new.lead_id;
  end if;
  return new;
end;
$$;

revoke all on function public.touch_lead_on_deal_change() from public, anon, authenticated;

drop trigger if exists touch_lead_on_deal_change_trigger on public.deals;
create trigger touch_lead_on_deal_change_trigger
after update of stage, agent_id, value on public.deals
for each row execute function public.touch_lead_on_deal_change();

-- Backfill: give every record the timestamp of its most recent registered
-- activity, so the column is meaningful on day one instead of showing the
-- import date for the whole base.
with latest as (
  select lead_id, max(created_at) as last_at
  from (
    select lead_id, created_at from public.activities where lead_id is not null
    union all
    select lead_id, created_at from public.notes where lead_id is not null
    union all
    select lead_id, created_at from public.calls where lead_id is not null
  ) events
  group by lead_id
)
update public.leads l
set updated_at = latest.last_at
from latest
where l.id = latest.lead_id
  and latest.last_at > l.updated_at;

commit;
