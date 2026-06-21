-- 005_add_investment_amount_column.sql
-- Add investment_amount column to leads table

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS investment_amount decimal(12,2) DEFAULT 0.00;
