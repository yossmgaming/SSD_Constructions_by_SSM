-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: Project-Subcontractor Junction Table
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Create Junction Table
CREATE TABLE IF NOT EXISTS public.project_subcontractors (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "projectId" BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    "subcontractorId" BIGINT REFERENCES public.subcontractors(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("projectId", "subcontractorId")
);

-- 2. Enable RLS
ALTER TABLE public.project_subcontractors ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow anyone authenticated to read assignments (for dashboards/lookups)
CREATE POLICY "Authenticated users can read assignments" ON public.project_subcontractors
FOR SELECT TO authenticated USING (true);

-- Allow Super Admin and Finance to manage assignments
CREATE POLICY "Admins can manage assignments" ON public.project_subcontractors
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('Super Admin', 'Finance')
    )
);

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_subcontractors_project_id ON public.project_subcontractors("projectId");
CREATE INDEX IF NOT EXISTS idx_project_subcontractors_subcontractor_id ON public.project_subcontractors("subcontractorId");

COMMIT;
