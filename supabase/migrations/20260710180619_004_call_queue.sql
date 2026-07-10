-- Add in_call_queue to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS in_call_queue BOOLEAN DEFAULT false;
