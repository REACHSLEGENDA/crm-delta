-- Delta Capital CRM -- Phase 1: multi-pipeline core (Ventas / Cumplimiento / Retencion).
--
-- Bitrix-style architecture: one deals table with a `pipeline` dimension rather
-- than three separate tables, so the existing board, filters, detail sheet and
-- permissions are reused instead of triplicated.
--
-- Everything here is additive. Existing deals default to the Ventas pipeline and
-- keep behaving exactly as before.
--
-- RUN PART A FIRST, ON ITS OWN. PostgreSQL cannot use a newly added enum value
-- inside the same transaction that added it.

-- ===========================================================================
-- PART A -- new enum values (run this block alone, then run Part B)
-- ===========================================================================

create type public.deal_pipeline as enum ('Ventas', 'Cumplimiento', 'Retencion');

-- Compliance stages
alter type public.deal_stage add value if not exists 'KYC pendiente';
alter type public.deal_stage add value if not exists 'Documentos en revisión';
alter type public.deal_stage add value if not exists 'Contrato pendiente';
alter type public.deal_stage add value if not exists 'Aprobado';
alter type public.deal_stage add value if not exists 'Rechazado';

-- Retention stages (1..7)
alter type public.deal_stage add value if not exists 'R1 Bienvenida';
alter type public.deal_stage add value if not exists 'R2 Perfil de riesgo';
alter type public.deal_stage add value if not exists 'R3 Primera estrategia';
alter type public.deal_stage add value if not exists 'R4 Seguimiento inicial';
alter type public.deal_stage add value if not exists 'R5 Re-depósito';
alter type public.deal_stage add value if not exists 'R6 Consolidación';
alter type public.deal_stage add value if not exists 'R7 Fidelización';
