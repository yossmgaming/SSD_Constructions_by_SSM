-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: Enhance Subcontractor Assignments
-- Adds amount, date ranges, and notes to the junction table.
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Add detailed columns to the junction table
ALTER TABLE public.project_subcontractors 
ADD COLUMN IF NOT EXISTS "amount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "startDate" DATE,
ADD COLUMN IF NOT EXISTS "endDate" DATE,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 2. Create index for searching by dates if needed
CREATE INDEX IF NOT EXISTS idx_project_subcontractors_dates ON public.project_subcontractors("startDate", "endDate");

COMMIT;
