-- Delta Capital CRM -- Phase 2: automatic tunnels between pipelines.
--
--   Ventas "Ganado"        -> creates the Cumplimiento record (KYC pendiente)
--   Cumplimiento "Aprobado"-> creates the Retencion record  (R1 Bienvenida)
--
-- The originating record is NOT moved: it stays in its own pipeline as history.
-- That is what the brief asks for ("crea un nuevo registro ... el registro de
-- ventas se bloquea"), and it is also what keeps commission reporting intact --
-- the Dashboard pays on deals that are "Ganado" in Ventas, so moving the row out
-- of Ventas would silently erase the agent's commission.
--
-- Ownership changes on every handoff: the account stops belonging to the seller
-- and is assigned to the receiving department.

begin;

-- ---------------------------------------------------------------------------
-- Fair assignment: the active agent of that department currently carrying the
-- fewest open accounts. This is round-robin that self-corrects, instead of a
-- counter that drifts when agents are deactivated.
-- ---------------------------------------------------------------------------
create or replace function public.pick_pipeline_agent(target_department public.user_department)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  left join public.deals d
    on d.agent_id = p.id
   and d.pipeline <> 'Ventas'
   and d.stage not in ('Aprobado', 'Rechazado', 'R7 Fidelización')
  where p.active is true
    and p.department = target_department
    and p.role = 'AGENT'
  group by p.id
  order by count(d.id) asc, p.id
  limit 1;
$$;

revoke all on function public.pick_pipeline_agent(public.user_department) from public, anon;
grant execute on function public.pick_pipeline_agent(public.user_department) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The tunnels
-- ---------------------------------------------------------------------------
create or replace function public.handoff_deal_to_next_pipeline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_agent uuid;
  origin_seller uuid;
begin
  if new.lead_id is null then
    return new;
  end if;

  origin_seller := coalesce(new.sales_agent_id, new.agent_id);

  -- Ventas -> Cumplimiento
  if new.pipeline = 'Ventas' and new.stage = 'Ganado' then
    if not exists (
      select 1 from public.deals
      where lead_id = new.lead_id and pipeline = 'Cumplimiento'
    ) then
      next_agent := public.pick_pipeline_agent('Cumplimiento');

      insert into public.deals (name, value, currency, stage, pipeline, lead_id, agent_id, sales_agent_id)
      values (new.name, new.value, coalesce(new.currency, 'USD'), 'KYC pendiente', 'Cumplimiento',
              new.lead_id, next_agent, origin_seller);

      if next_agent is not null then
        insert into public.notifications (user_id, title, content, metadata)
        values (next_agent, 'Nueva cuenta para validar',
                format('%s entró a Cumplimiento con depósito confirmado.', new.name),
                jsonb_build_object('lead_id', new.lead_id, 'pipeline', 'Cumplimiento'));
      end if;
    end if;
  end if;

  -- Cumplimiento -> Retencion
  if new.pipeline = 'Cumplimiento' and new.stage = 'Aprobado' then
    if not exists (
      select 1 from public.deals
      where lead_id = new.lead_id and pipeline = 'Retencion'
    ) then
      next_agent := public.pick_pipeline_agent('Retencion');

      insert into public.deals (name, value, currency, stage, pipeline, lead_id, agent_id, sales_agent_id)
      values (new.name, new.value, coalesce(new.currency, 'USD'), 'R1 Bienvenida', 'Retencion',
              new.lead_id, next_agent, origin_seller);

      if next_agent is not null then
        insert into public.notifications (user_id, title, content, metadata)
        values (next_agent, 'Cuenta asignada en Retención',
                format('%s fue aprobada por Cumplimiento y te fue asignada.', new.name),
                jsonb_build_object('lead_id', new.lead_id, 'pipeline', 'Retencion'));
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.handoff_deal_to_next_pipeline() from public, anon, authenticated;

drop trigger if exists handoff_deal_to_next_pipeline_trigger on public.deals;
create trigger handoff_deal_to_next_pipeline_trigger
after insert or update of stage on public.deals
for each row execute function public.handoff_deal_to_next_pipeline();

-- ---------------------------------------------------------------------------
-- Freeze the sales record once the account has moved downstream. Managers and
-- superadmins can still correct it; the selling agent can only read it.
-- ---------------------------------------------------------------------------
create or replace function public.guard_handed_off_sales_deal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only guard direct user edits. Depth > 1 means we are inside another
  -- trigger (the lead <-> deal sync), which must never be blocked or the
  -- whole prospect update would abort.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if old.pipeline <> 'Ventas' then
    return new;
  end if;
  if public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER') then
    return new;
  end if;
  if exists (
    select 1 from public.deals
    where lead_id = old.lead_id and pipeline <> 'Ventas'
  ) then
    raise exception 'Esta cuenta ya pasó a Cumplimiento y no puede editarse desde Ventas.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_handed_off_sales_deal() from public, anon, authenticated;

drop trigger if exists guard_handed_off_sales_deal_trigger on public.deals;
create trigger guard_handed_off_sales_deal_trigger
before update on public.deals
for each row execute function public.guard_handed_off_sales_deal();

commit;
