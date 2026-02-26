-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: RLS Diagnostic & Emergency Reset
-- Run this in Supabase SQL Editor to see what is REALLY going on
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. LIST ALL ACTIVE POLICIES (This will find "Ghost" policies)
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. EMERGENCY RESET: DISABLE RLS (Temporary test)
-- If you run this line alone, and the dashboard works, then we know for 100% 
-- that a hidden policy is the killer.
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. CHECK FOR RECURSIVE TRIGGERS
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement, 
    action_orientation 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- 4. CLEAN SLATE (Nuclear Option 2 - Drops by TABLE, not by name)
/*
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;
*/
