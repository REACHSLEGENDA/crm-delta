-- Delta Capital CRM: Retention accounts arrive at the team leader.
--
-- Business decision: an approved account should not be dropped straight onto an
-- executive. It reaches the Retention leader, who assigns it to the right person
-- on the team. Compliance keeps its automatic balanced assignment.
--
-- If the department has no leader configured, the account still falls back to
-- the balanced assignment: an unassigned account is worse than an imperfect one.

begin;

create or replace function public.pick_department_leader(target_department public.user_department)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.leader_id
  from public.teams t
  join public.profiles p on p.id = t.leader_id
  where t.active is true
    and t.department = target_department
    and t.leader_id is not null
    and p.active is true
  order by t.created_at
  limit 1;
$$;

revoke all on function public.pick_department_leader(public.user_department) from public, anon;
grant execute on function public.pick_department_leader(public.user_department) to authenticated, service_role;

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

  -- Ventas -> Cumplimiento: balanced across the compliance staff.
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

  -- Cumplimiento -> Retencion: the leader receives it and delegates.
  if new.pipeline = 'Cumplimiento' and new.stage = 'Aprobado' then
    if not exists (
      select 1 from public.deals
      where lead_id = new.lead_id and pipeline = 'Retencion'
    ) then
      next_agent := coalesce(
        public.pick_department_leader('Retencion'),
        public.pick_pipeline_agent('Retencion')
      );

      insert into public.deals (name, value, currency, stage, pipeline, lead_id, agent_id, sales_agent_id)
      values (new.name, new.value, coalesce(new.currency, 'USD'), 'R1 Bienvenida', 'Retencion',
              new.lead_id, next_agent, origin_seller);

      if next_agent is not null then
        insert into public.notifications (user_id, title, content, metadata)
        values (next_agent, 'Cuenta lista para asignar',
                format('%s fue aprobada por Cumplimiento. Asígnala a un ejecutivo de tu equipo.', new.name),
                jsonb_build_object('lead_id', new.lead_id, 'pipeline', 'Retencion'));
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.handoff_deal_to_next_pipeline() from public, anon, authenticated;

commit;
