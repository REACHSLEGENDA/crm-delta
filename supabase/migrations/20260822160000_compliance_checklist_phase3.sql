-- Delta Capital CRM -- Phase 3: compliance checklist with a hard gate.
--
-- An account cannot reach "Aprobado" in the Cumplimiento pipeline until every
-- required document has been reviewed and approved. The rule lives in the
-- database so it holds no matter where the stage change comes from -- board
-- drag, list select, detail sheet or a direct API call.
--
-- The required list is a table, not a constant, so compliance can adjust it
-- without a deploy.

begin;

-- ---------------------------------------------------------------------------
-- Review state on each uploaded document
-- ---------------------------------------------------------------------------
alter table public.compliance_documents
  add column if not exists status text not null default 'pendiente',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

alter table public.compliance_documents
  drop constraint if exists compliance_documents_status_check;
alter table public.compliance_documents
  add constraint compliance_documents_status_check
  check (status in ('pendiente', 'aprobado', 'rechazado'));

create index if not exists idx_compliance_documents_lead_status
  on public.compliance_documents (lead_id, status);

-- ---------------------------------------------------------------------------
-- Configurable checklist
-- ---------------------------------------------------------------------------
create table if not exists public.compliance_required_documents (
  document_type text primary key,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.compliance_required_documents enable row level security;

drop policy if exists "Authenticated read required documents" on public.compliance_required_documents;
create policy "Authenticated read required documents"
on public.compliance_required_documents for select to authenticated
using (public.is_active_user(auth.uid()));

drop policy if exists "Admins manage required documents" on public.compliance_required_documents;
create policy "Admins manage required documents"
on public.compliance_required_documents for all to authenticated
using (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'))
with check (public.get_user_role(auth.uid()) in ('SUPERADMIN', 'MANAGER'));

insert into public.compliance_required_documents (document_type, label, sort_order) values
  ('identificacion',           'Identificación (INE / Pasaporte)', 1),
  ('comprobante_domicilio',    'Comprobante de domicilio',         2),
  ('comprobante_pago',         'Comprobante de pago',              3),
  ('tarjeta',                  'TDD o TDC',                        4),
  ('carta_aceptacion',         'Carta de aceptación de cargo',     5),
  ('contrato_intermediacion',  'Contrato de intermediación',       6)
on conflict (document_type) do nothing;

-- ---------------------------------------------------------------------------
-- The gate
-- ---------------------------------------------------------------------------
create or replace function public.compliance_missing_documents(target_lead_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(r.label order by r.sort_order), '{}'::text[])
  from public.compliance_required_documents r
  where r.active is true
    and not exists (
      select 1
      from public.compliance_documents d
      where d.lead_id = target_lead_id
        and d.document_type = r.document_type
        and d.status = 'aprobado'
    );
$$;

revoke all on function public.compliance_missing_documents(uuid) from public, anon;
grant execute on function public.compliance_missing_documents(uuid) to authenticated, service_role;

create or replace function public.guard_compliance_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  missing text[];
begin
  if new.pipeline <> 'Cumplimiento' or new.stage <> 'Aprobado' then
    return new;
  end if;
  if old.stage = 'Aprobado' then
    return new;
  end if;
  if new.lead_id is null then
    raise exception 'El expediente no tiene prospecto asociado y no puede aprobarse.';
  end if;

  missing := public.compliance_missing_documents(new.lead_id);

  if array_length(missing, 1) > 0 then
    raise exception 'Faltan documentos por aprobar: %', array_to_string(missing, ', ');
  end if;

  return new;
end;
$$;

revoke all on function public.guard_compliance_approval() from public, anon, authenticated;

drop trigger if exists guard_compliance_approval_trigger on public.deals;
create trigger guard_compliance_approval_trigger
before update of stage on public.deals
for each row execute function public.guard_compliance_approval();

commit;
