-- Delta Capital CRM: hand a prospect to the Recovery track.
-- Run AFTER 20260823120000_recovery_stages.sql.
--
-- Administration picks the prospect and the retention agent explicitly: recovery
-- work is targeted, not round-robin, because whoever handled the account before
-- usually determines who should try to win it back.

begin;

create or replace function public.send_lead_to_recovery(
  target_lead_id uuid,
  target_agent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  agent_department public.user_department;
  lead_name text;
  existing_deal_id uuid;
  result_id uuid;
begin
  if public.get_user_role(auth.uid()) not in ('SUPERADMIN', 'MANAGER') then
    raise exception 'Solo administración puede enviar cuentas a Recovery.';
  end if;

  select department into agent_department
  from public.profiles
  where id = target_agent_id and active is true;

  if agent_department is null then
    raise exception 'El agente seleccionado no existe o está inactivo.';
  end if;
  if agent_department <> 'Retencion' then
    raise exception 'Recovery se asigna a personal de Retención.';
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into lead_name
  from public.leads where id = target_lead_id;

  if lead_name is null then
    raise exception 'El prospecto no existe.';
  end if;

  -- Reuse the Retencion record if the account already has one.
  select id into existing_deal_id
  from public.deals
  where lead_id = target_lead_id and pipeline = 'Retencion'
  limit 1;

  if existing_deal_id is not null then
    update public.deals
    set stage = 'REC1 Asignado',
        agent_id = target_agent_id,
        updated_at = now()
    where id = existing_deal_id
    returning id into result_id;
  else
    insert into public.deals (name, value, currency, stage, pipeline, lead_id, agent_id, sales_agent_id)
    select coalesce(nullif(lead_name, ''), 'Recovery'), 0, 'USD', 'REC1 Asignado', 'Retencion',
           target_lead_id, target_agent_id, l.agent_id
    from public.leads l
    where l.id = target_lead_id
    returning id into result_id;
  end if;

  insert into public.notifications (user_id, title, content, metadata)
  values (
    target_agent_id,
    'Cuenta de Recovery asignada',
    format('%s te fue asignada para recuperación.', lead_name),
    jsonb_build_object('kind', 'recovery_assignment', 'lead_id', target_lead_id)
  );

  insert into public.activities (lead_id, deal_id, user_id, title, description, type, status, completed_at)
  values (
    target_lead_id, result_id, auth.uid(),
    'Enviada a Recovery',
    format('La cuenta entró al proceso de recuperación con %s.', lead_name),
    'recovery', 'completed', now()
  );

  return result_id;
end;
$$;

revoke all on function public.send_lead_to_recovery(uuid, uuid) from public, anon;
grant execute on function public.send_lead_to_recovery(uuid, uuid) to authenticated;

commit;
