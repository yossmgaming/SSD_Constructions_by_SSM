-- SSD Phase 10: Final RLS Cleanup & Performance Optimization
-- This script nukes any remaining recursive policies on the profiles table.

BEGIN;

-- Drop ALL potentially recursive policies on profiles just to be safe
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do everything on profiles" ON public.profiles;

-- Create high-performance, JWT-based policy for Admins/Finance
-- This prevents the 'infinite recursion' error permanently
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Super Admin', 'Finance')
);

-- Ensure users can always see their own profile without recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Ensure the get_user_role function is ultra-resilient
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  role_val TEXT;
BEGIN
  -- 1. Try metadata first (fastest, no recursion risk)
  role_val := auth.jwt() -> 'user_metadata' ->> 'role';
  
  -- 2. If metadata is missing, try profiles table
  IF role_val IS NULL THEN
    SELECT role::text INTO role_val FROM public.profiles WHERE id = auth.uid();
  END IF;
  
  -- 3. Fallback to Worker
  RETURN COALESCE(role_val, 'Worker');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
