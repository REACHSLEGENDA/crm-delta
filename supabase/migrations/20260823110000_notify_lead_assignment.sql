-- Delta Capital CRM: tell an agent when prospects land in their queue.
--
-- Fires wherever the assignment happens -- the Prospectos screen, a bulk import,
-- a supervisor reassignment -- because it lives on the table, not in one form.
--
-- Bulk assignment is the normal case, so notifications are aggregated: instead
-- of 200 rows for a 200-lead import, the agent's most recent unread assignment
-- notice from the last few minutes is updated with a running count.

begin;

create or replace function public.notify_lead_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  running_total integer;
begin
  if new.agent_id is null or new.agent_id is not distinct from old.agent_id then
    return new;
  end if;

  -- Never notify someone about their own action.
  if new.agent_id = auth.uid() then
    return new;
  end if;

  select id, coalesce((metadata->>'count')::integer, 1)
    into existing_id, running_total
  from public.notifications
  where user_id = new.agent_id
    and read = false
    and metadata->>'kind' = 'lead_assignment'
    and created_at > now() - interval '3 minutes'
  order by created_at desc
  limit 1;

  if existing_id is not null then
    update public.notifications
    set content = format('Se te asignaron %s prospectos nuevos.', running_total + 1),
        metadata = jsonb_build_object('kind', 'lead_assignment', 'count', running_total + 1),
        created_at = now()
    where id = existing_id;
  else
    insert into public.notifications (user_id, title, content, metadata)
    values (
      new.agent_id,
      'Base nueva asignada',
      format('Se te asignó el prospecto %s.', trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, ''))),
      jsonb_build_object('kind', 'lead_assignment', 'count', 1)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_lead_assignment() from public, anon, authenticated;

drop trigger if exists notify_lead_assignment_trigger on public.leads;
create trigger notify_lead_assignment_trigger
after insert or update of agent_id on public.leads
for each row execute function public.notify_lead_assignment();

commit;
