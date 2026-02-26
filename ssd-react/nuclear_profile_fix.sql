-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: Nuclear RLS Fix for Profiles (Prevents Infinite Recursion)
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Hard reset: Remove RLS temporarily to clear state
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to ensure no "Zombie" recursive policies remain
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;

-- 3. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create BULLETPROOF policies that DO NOT query the profiles table itself
-- (This prevents the "infinite recursion detected in policy" error)

-- POLICY 1: Self-Access (Read)
-- Uses auth.uid() directly against the column. No subqueries = No recursion.
CREATE POLICY "profiles_self_read" 
ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- POLICY 2: Self-Access (Update)
CREATE POLICY "profiles_self_update" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id);

-- POLICY 3: Self-Access (Insert)
-- Needed during Signup.jsx before the record exists
CREATE POLICY "profiles_self_insert" 
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- POLICY 4: Admin Access (Global Read)
-- Uses the JWT metadata 'role' field. 
-- IMPORTANT: We DO NOT subquery 'profiles' table to check role, as that causes recursion.
CREATE POLICY "profiles_admin_read" 
ON public.profiles
FOR SELECT 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Super Admin', 'Finance')
);

-- 5. Fix Invite Codes (also problematic if it joins to profiles)
ALTER TABLE public.invite_codes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.invite_codes;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_codes_admin_all" 
ON public.invite_codes
FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Super Admin', 'Finance')
);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION:
-- SELECT * FROM public.profiles; -- Should work for current user without recursion
-- ─────────────────────────────────────────────────────────────────────────────
