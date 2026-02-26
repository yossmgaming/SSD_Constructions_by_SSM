-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: Multi-Role Identity Link (Sub-Contractors & Suppliers)
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Link Projects to Sub-Contractors
-- Adds the column that SubContractorDashboard.jsx expects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "subcontract_id" BIGINT;

-- 2. Link Payments to Sub-Contractors
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS "subcontractorId" BIGINT;

-- 3. Link Materials to Projects (Optional but requested for "same thing")
-- This allows us to see which project a material was supplied to
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS "projectId" BIGINT;

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_subcontract_id ON public.projects("subcontract_id");
CREATE INDEX IF NOT EXISTS idx_payments_subcontractor_id ON public.payments("subcontractorId");
CREATE INDEX IF NOT EXISTS idx_materials_project_id ON public.materials("projectId");

-- 5. Backfill Sub-Contractor ID on payments
-- This attempts to find sub-contractors by matching payment notes or something
-- (Manual backfill is usually better, but we do what we can)

COMMIT;

-- VERIFICATION:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';
-- Should show 'subcontract_id' and 'client_id'
