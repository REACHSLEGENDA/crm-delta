-- 004_add_lead_comments.sql
-- Table to store real follow-up notes, comments, and client behavior feedback

CREATE TABLE IF NOT EXISTS public.lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist
DROP POLICY IF EXISTS "Select lead_comments" ON public.lead_comments;
DROP POLICY IF EXISTS "Insert lead_comments" ON public.lead_comments;

-- Policies
CREATE POLICY "Select lead_comments" ON public.lead_comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Insert lead_comments" ON public.lead_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
