-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - RLS RECURSION HOTFIX
-- ==========================================================
-- This script fixes the "infinite recursion detected" error
-- on the profiles table by introducing a security definer 
-- function for role checking.
-- ==========================================================

-- 1. Create a helper function that bypasses RLS for role checks
-- SECURITY DEFINER runs with the privileges of the creator (postgres)
CREATE OR REPLACE FUNCTION public.check_user_is_privileged(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role IN ('Super Admin', 'Finance')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Only Super Admins can view audit logs" ON public.audit_logs;

-- 3. Re-create policies using the non-recursive helper function

-- Profiles: Admins/Finance can see all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.check_user_is_privileged(auth.uid()));

-- Invite Codes: Admins/Finance can manage all codes
CREATE POLICY "Admins can manage invite codes" ON public.invite_codes
FOR ALL USING (public.check_user_is_privileged(auth.uid()));

-- Audit Logs: Restricted to Super Admin (using refined check)
CREATE OR REPLACE FUNCTION public.check_user_is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role = 'Super Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Only Super Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.check_user_is_super_admin(auth.uid()));

-- ==========================================================
-- VERIFICATION:
-- Once executed, the recursion error on profiles will stop
-- and RBAC will function correctly across the platform.
-- ==========================================================
