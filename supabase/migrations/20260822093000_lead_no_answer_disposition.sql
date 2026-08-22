-- Add "No contestó" (no answer) call typification end-to-end.
-- 1. Extend the call_disposition enum with the new label used by Contact Center.
-- 2. Widen the leads.contact_outcome CHECK constraint to accept 'no_answer'.
-- Idempotent: safe to run more than once. Review and run manually in Supabase.

alter type public.call_disposition add value if not exists 'No contestó';

alter table public.leads drop constraint if exists leads_contact_outcome_check;
alter table public.leads add constraint leads_contact_outcome_check
  check (contact_outcome in ('pending', 'valid', 'invalid_number', 'direct_voicemail', 'no_answer'));
