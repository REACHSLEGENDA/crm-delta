-- Delta Capital CRM: Recovery track inside the Retention pipeline.
--
-- Recovery is the reactivation of prospects that were already worked (typically
-- the ones imported with comments) or clients that went cold. It lives as extra
-- stages of the Retencion pipeline rather than a fourth pipeline, so the same
-- team, permissions and reports apply -- the board just filters between the
-- normal lifecycle and the recovery track.
--
-- RUN PART A ALONE FIRST: PostgreSQL cannot use a new enum value in the same
-- transaction that created it.

-- ===========================================================================
-- PART A -- stages (run this block by itself)
-- ===========================================================================

alter type public.deal_stage add value if not exists 'REC1 Asignado';
alter type public.deal_stage add value if not exists 'REC2 Contactado';
alter type public.deal_stage add value if not exists 'REC3 En negociación';
alter type public.deal_stage add value if not exists 'REC4 Re-depósito';
alter type public.deal_stage add value if not exists 'REC5 Recuperado';
alter type public.deal_stage add value if not exists 'REC6 No recuperado';
