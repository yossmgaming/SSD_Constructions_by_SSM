-- SSD Phase 9: Fix RLS Infinite Recursion (REVISED)
-- This version uses the 'public' schema to avoid permissions errors.

BEGIN;

-- 1. Create a helper function to get role from JWT metadata
-- We use the 'public' schema because 'auth' is restricted
CREATE OR REPLACE FUNCTION public.get_jwt_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'Worker'
  );
$$ LANGUAGE sql STABLE;

-- 2. Update profiles table RLS to use JWT metadata for admin checks
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  public.get_jwt_role() IN ('Super Admin', 'Finance')
);

-- 3. Update invite_codes table RLS
DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.invite_codes;

CREATE POLICY "Admins can manage invite codes" ON public.invite_codes
FOR ALL USING (
  public.get_jwt_role() IN ('Super Admin', 'Finance')
);

-- 4. Update audit_logs table RLS
DROP POLICY IF EXISTS "Only Super Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Only Super Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  public.get_jwt_role() = 'Super Admin'
);

-- 5. Fix the profile fetch in AuthContext (Dashboard logic)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  -- First try profiles, if it fails due to RLS, fallback to JWT metadata
  RETURN COALESCE(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    public.get_jwt_role()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
