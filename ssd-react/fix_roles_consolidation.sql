-- SSD Phase 8: Consolidation of Roles & Source of Truth Fix
-- This script merges the "user_roles" functionality into the existing "profiles" table
-- and updates the secure RPC function to use the correct source of truth.

BEGIN;

-- 1. Update the get_user_role function to use profiles table
-- This ensures that roles assigned during signup (which go to profiles) are correctly fetched.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Migrate any accidentally created roles from user_roles to profiles if missing
-- (Safety step to ensure no data loss from Phase 1 experimentation)
UPDATE public.profiles p
SET role = ur.role::user_role
FROM public.user_roles ur
WHERE p.id = ur.user_id
AND p.role = 'Worker'; -- Only update if still at default

-- 3. We can keep user_roles for now as a legacy/secondary table, 
-- but profiles is the primary source of truth for the app.

COMMIT;
