-- ============================================================
-- Delta Capital CRM - Departments & Compliance Module
-- Adds user departments, retention statuses, and document management
-- ============================================================

-- 1. Create Department ENUM and add to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_department') THEN
    CREATE TYPE user_department AS ENUM ('Ventas', 'Retencion', 'Cumplimiento');
  END IF;
END$$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department user_department DEFAULT 'Ventas' NOT NULL;

-- 2. Update Lead Statuses for Retention
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Lead nuevo con comentarios';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 1';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 2';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 3';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 4';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 5';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 6';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'Venta 7';
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

DO $$
BEGIN
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Lead nuevo con comentarios';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 1';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 2';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 3';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 4';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 5';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 6';
  ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'Venta 7';
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

-- 3. Compliance Documents Table
CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS compliance_documents_lead_id_idx ON compliance_documents(lead_id);

-- Enable RLS
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance documents
CREATE POLICY "Superadmins can do all on compliance_documents" ON compliance_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'SUPERADMIN')
);

CREATE POLICY "Compliance department can do all" ON compliance_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.department = 'Cumplimiento')
);

CREATE POLICY "Anyone can read compliance docs" ON compliance_documents FOR SELECT USING (
  true
);

-- 4. Setup Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('compliance_docs', 'compliance_docs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to compliance docs
CREATE POLICY "Public Access to compliance docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'compliance_docs');

-- Allow authenticated users (Compliance) to insert objects
CREATE POLICY "Auth Users Insert to compliance docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'compliance_docs');

-- Allow authenticated users to delete objects
CREATE POLICY "Auth Users Delete from compliance docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'compliance_docs');
