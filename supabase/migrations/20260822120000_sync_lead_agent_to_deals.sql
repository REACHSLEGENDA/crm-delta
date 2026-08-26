-- Delta Capital CRM: keep the deal's owner in sync with its prospect's owner.
--
-- leads.status <-> deals.stage was already synchronized, but leads.agent_id was
-- not. Reassigning a prospect (for example moving it back to the Pool) left the
-- deal pointing at the previous agent, so the pipeline kept showing that agent
-- deals they no longer own -- 1542 of 1727 deals had drifted.
--
-- deals.team_id is intentionally left alone here: the existing
-- sync_deal_team_from_agent_trigger recalculates it from the new agent's
-- profile whenever deals.agent_id changes.

begin;

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
    and agent_id is distinct from new.agent_id;

  return new;
end;
$$;

revoke all on function public.sync_lead_agent_to_deals() from public, anon, authenticated;

drop trigger if exists sync_lead_agent_to_deals_trigger on public.leads;
create trigger sync_lead_agent_to_deals_trigger
after update of agent_id on public.leads
for each row
when (old.agent_id is distinct from new.agent_id)
execute function public.sync_lead_agent_to_deals();

-- One-time realignment of the deals that already drifted.
update public.deals d
set agent_id = l.agent_id
from public.leads l
where l.id = d.lead_id
  and d.agent_id is distinct from l.agent_id;

commit;
