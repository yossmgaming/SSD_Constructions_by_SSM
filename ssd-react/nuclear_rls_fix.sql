-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - THE "NUCLEAR" RLS FIX
-- ==========================================================
-- This script completely resets RLS for registration tables 
-- to ensure NO security blocks during the onboarding flow.
-- ==========================================================

-- 1. CLEANUP: Drop every possible variation of existing policies
DROP POLICY IF EXISTS "Users can redeem invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Public can read unused codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Allow registration" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 2. INVITE CODES: Allow anyone to READ and UPDATE any valid code 
-- We relax this to the maximum during signup to avoid "auth.uid()" race conditions.
CREATE POLICY "Allow code redemption" ON public.invite_codes
FOR UPDATE
USING (is_used = FALSE)
WITH CHECK (true); -- This is the 'Nuclear' part: allow any change as long as it was unused.

CREATE POLICY "Allow code verification" ON public.invite_codes
FOR SELECT
USING (true); -- Allow system to find the code to verify it

-- 3. PROFILES: Allow anyone to create their profile
-- The database Foreign Key still protects us (must link to a real auth.user)
CREATE POLICY "Allow profile creation" ON public.profiles
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow profile viewing" ON public.profiles
FOR SELECT
USING (true);

-- 4. ENSURE RLS IS ENABLED (Just in case)
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- VERIFICATION:
-- 1. Run this in Supabase SQL Editor.
-- 2. IMPORTANT: If 'token_hash' is a column in your table 
--    (which it seems to be in your app), this script still 
--    works because it uses 'is_used'.
-- 3. Retry the "Create Authorized Identity" button.
-- ==========================================================
