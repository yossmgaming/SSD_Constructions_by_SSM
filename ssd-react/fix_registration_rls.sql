-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - REGISTRATION PERMISSIONS HOTFIX
-- ==========================================================
-- This script adds the missing INSERT and UPDATE policies 
-- required for the Signup/Onboarding flow to succeed.
-- ==========================================================

-- 1. Profiles Table: Allow users to create their own profile during signup
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Invite Codes Table: Allow authenticated users to redeem a code
-- This policy allows updating a code only if it's currently unused and valid
DROP POLICY IF EXISTS "Users can redeem invite codes" ON public.invite_codes;
CREATE POLICY "Users can redeem invite codes" ON public.invite_codes
FOR UPDATE 
USING (is_used = FALSE AND expires_at > NOW())
WITH CHECK (is_used = TRUE AND used_by = auth.uid());

-- 3. Ensure profiles are also updatable by owners
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- ==========================================================
-- VERIFICATION:
-- Once executed, the "new row violates RLS" error will be resolved.
-- The registration flow will successfully link the Auth User,
-- create the Public Profile, and consume the Invite Code.
-- ==========================================================
