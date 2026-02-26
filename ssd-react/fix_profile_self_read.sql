-- SSD FIX: Profile Self-Read RLS Policy + Role Isolation
-- Root cause: users can't read their own profile, so role defaults to 'Worker'
-- Run this in Supabase SQL Editor

-- 1. Allow users to read their own profile record
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- 2. Allow users to update their own profile (needed for onboarding)  
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 3. Allow users to insert their own profile (needed during signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Make sure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
