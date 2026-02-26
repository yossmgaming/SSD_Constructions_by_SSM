-- SSD FIX: Disable RLS on core data tables to restore data access
-- The recent RLS/profile role changes caused Supabase to block reads
-- for payments, advances, projects, etc.
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Disable RLS on core tables so the frontend can read them
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."projectWorkers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."workerRates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."workRates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."bankAccounts" DISABLE ROW LEVEL SECURITY;

-- 2. Ensure profile RLS is fixed (repeated here for safety)
-- Allow users to read their own profile record
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile (needed for onboarding)  
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (needed during signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Make sure RLS is enabled on profiles but allows self-read
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
