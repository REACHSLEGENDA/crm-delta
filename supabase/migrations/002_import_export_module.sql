-- ============================================================
-- Import / Export Module — Delta Capital CRM
-- Adds campaign fields, batch tracking, and error logging
-- ============================================================

-- Extend leads table with import-specific fields
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS campaign_name   TEXT,
  ADD COLUMN IF NOT EXISTS campaign_asset  TEXT,
  ADD COLUMN IF NOT EXISTS interest_intent TEXT,
  ADD COLUMN IF NOT EXISTS registered_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID,
  ADD COLUMN IF NOT EXISTS raw_data        JSONB DEFAULT '{}'::jsonb;

-- Import batches — one record per file uploaded
CREATE TABLE IF NOT EXISTS import_batches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  team_id        UUID        REFERENCES teams(id) ON DELETE SET NULL,
  file_name      TEXT        NOT NULL,
  file_type      TEXT        NOT NULL,
  total_rows     INT         NOT NULL DEFAULT 0,
  imported_rows  INT         NOT NULL DEFAULT 0,
  skipped_rows   INT         NOT NULL DEFAULT 0,
  error_rows     INT         NOT NULL DEFAULT 0,
  duplicate_rows INT         NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'completed'
                             CHECK (status IN ('pending','processing','completed','failed')),
  options        JSONB       NOT NULL DEFAULT '{}'::jsonb
);

-- Import errors — one record per rejected row
CREATE TABLE IF NOT EXISTS import_errors (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   UUID        NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INT,
  error_type TEXT,
  message    TEXT,
  raw_data   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK from leads to import_batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_import_batch_id_fkey'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS leads_email_idx           ON leads(email);
CREATE INDEX IF NOT EXISTS leads_phone_idx           ON leads(phone);
CREATE INDEX IF NOT EXISTS leads_import_batch_id_idx ON leads(import_batch_id);
CREATE INDEX IF NOT EXISTS leads_campaign_name_idx   ON leads(campaign_name);
CREATE INDEX IF NOT EXISTS leads_campaign_asset_idx  ON leads(campaign_asset);
CREATE INDEX IF NOT EXISTS batches_created_by_idx    ON import_batches(created_by);
CREATE INDEX IF NOT EXISTS batches_team_id_idx       ON import_batches(team_id);
CREATE INDEX IF NOT EXISTS errors_batch_id_idx       ON import_errors(batch_id);

-- RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors   ENABLE ROW LEVEL SECURITY;

-- SUPERADMIN: full access
CREATE POLICY "batches_superadmin" ON import_batches
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN'));

-- MANAGER: own team only
CREATE POLICY "batches_manager" ON import_batches
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'MANAGER' AND team_id = import_batches.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'MANAGER' AND team_id = import_batches.team_id
    )
  );

-- SUPERVISOR: read-only own team
CREATE POLICY "batches_supervisor_read" ON import_batches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPERVISOR' AND team_id = import_batches.team_id
    )
  );

-- import_errors inherit batch visibility
CREATE POLICY "errors_via_batch" ON import_errors
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM import_batches b
      JOIN profiles p ON p.id = auth.uid()
      WHERE b.id = import_errors.batch_id
        AND (
          p.role = 'SUPERADMIN'
          OR (p.role IN ('MANAGER', 'SUPERVISOR') AND p.team_id = b.team_id)
        )
    )
  );
