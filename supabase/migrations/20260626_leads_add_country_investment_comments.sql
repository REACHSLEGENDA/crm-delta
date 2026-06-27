-- Add country, investment_capacity, and comments fields to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS investment_capacity VARCHAR(50),
  ADD COLUMN IF NOT EXISTS comments TEXT;
