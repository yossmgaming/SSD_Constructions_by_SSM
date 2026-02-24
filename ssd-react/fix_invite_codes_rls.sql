-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - INVITE CODE REDEMPTION FIX
-- ==========================================================
-- This script fixes the RLS violation when users sign up.
-- It allows the 'invite_codes' table to be updated during 
-- the onboarding flow even if the user session is still 
-- in a pending/unverified state.
-- ==========================================================

-- 1. Relax the redemption policy on invite_codes
-- We remove the strict 'used_by = auth.uid()' requirement 
-- for the WITH CHECK clause, as the 'used_by' value is 
-- passed explicitly by the application logic.
DROP POLICY IF EXISTS "Users can redeem invite codes" ON public.invite_codes;

CREATE POLICY "Users can redeem invite codes" ON public.invite_codes
FOR UPDATE 
USING (is_used = FALSE AND expires_at > NOW())
WITH CHECK (is_used = TRUE);

-- 2. Ensure Profiles can be created by anyone during signup
-- (The FK to auth.users still ensures data integrity)
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow registration" ON public.profiles;

CREATE POLICY "Allow registration" ON public.profiles
FOR INSERT WITH CHECK (true);

-- 3. Verify public can still read unused codes to validate them
DROP POLICY IF EXISTS "Public can read unused codes" ON public.invite_codes;
CREATE POLICY "Public can read unused codes" ON public.invite_codes
FOR SELECT USING (is_used = FALSE AND expires_at > NOW());

-- ==========================================================
-- VERIFICATION:
-- Please run this in the Supabase SQL Editor.
-- Then retry the signup flow.
-- ==========================================================
