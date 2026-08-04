-- Migration: Add members array to channels table
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS members uuid[] DEFAULT '{}';

-- Migration: Update leads
-- Assuming Matias Villanueva's ID will be fetched dynamically, we can't reliably hardcode the UUID here if it differs.
-- But since they can reassign via UI once the frontend bug is fixed, we skip the lead reassignment in SQL to avoid hardcoded IDs.
