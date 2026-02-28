-- Add missing foreign key relationships for Supervisor Dashboard
-- This fixes PGRST200 errors when querying daily_reports and incidents

-- Fix 1: Check if FK exists for daily_reports.supervisor_id, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_reports_supervisor_id_fkey' 
        AND table_name = 'daily_reports'
    ) THEN
        ALTER TABLE public.daily_reports
        ADD CONSTRAINT daily_reports_supervisor_id_fkey
        FOREIGN KEY (supervisor_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Fix 2: Check if FK exists for incidents.reporter_id, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'incidents_reporter_id_fkey' 
        AND table_name = 'incidents'
    ) THEN
        ALTER TABLE public.incidents
        ADD CONSTRAINT incidents_reporter_id_fkey
        FOREIGN KEY (reporter_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
