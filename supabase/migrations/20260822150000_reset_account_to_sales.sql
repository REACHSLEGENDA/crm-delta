-- Delta Capital CRM: administrative rollback of a handed-off account.
--
-- When an account is pushed down the pipeline chain by mistake, an admin can
-- send it back to the start: the Cumplimiento and Retencion records are removed
-- and the Ventas record returns to its opening stage, ready to be worked again.
--
-- Restricted to SUPERADMIN: this destroys the compliance and retention history
-- of that account, so it must not be reachable by the agent who made the error.

begin;

create or replace function public.reset_account_to_sales(
  target_lead_id uuid,
  reset_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  sales_deal_id uuid;
begin
  if public.get_user_role(auth.uid()) <> 'SUPERADMIN' then
    raise exception 'Solo un administrador puede regresar una cuenta al inicio.';
  end if;

  if target_lead_id is null then
    raise exception 'Falta el prospecto a reiniciar.';
  end if;

  -- Drop the downstream records.
  delete from public.deals
  where lead_id = target_lead_id
    and pipeline <> 'Ventas';
  get diagnostics removed = row_count;

  -- Return the sales record to the opening stage. Clearing the closing fields
  -- matters: a deal left as closed would be counted as won by the dashboard.
  update public.deals
  set stage = 'Nuevo lead',
      closed_at = null,
      close_reason = null,
      loss_reason = null
  where lead_id = target_lead_id
    and pipeline = 'Ventas'
  returning id into sales_deal_id;

  -- Reopen the prospect as well (the stage sync only mirrors Ventas).
  update public.leads
  set status = 'Nuevo',
      is_burned = false,
      burned_at = null,
      burn_reason = null
  where id = target_lead_id;

  insert into public.activities (lead_id, deal_id, user_id, title, description, type, status, completed_at)
  values (
    target_lead_id,
    sales_deal_id,
    auth.uid(),
    'Cuenta reiniciada por administración',
    coalesce(nullif(trim(reset_reason), ''), 'La cuenta regresó al inicio del flujo comercial.'),
    'reset',
    'completed',
    now()
  );

  return removed;
end;
$$;

revoke all on function public.reset_account_to_sales(uuid, text) from public, anon;
grant execute on function public.reset_account_to_sales(uuid, text) to authenticated;

comment on function public.reset_account_to_sales is
  'SUPERADMIN only. Removes the Cumplimiento/Retencion records of a lead and returns its Ventas deal to the opening stage.';

commit;
