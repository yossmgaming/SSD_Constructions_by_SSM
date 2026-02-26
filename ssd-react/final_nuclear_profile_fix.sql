-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: FINAL NUCLEAR PROFILE FIX (Ghost Purge Edition)
-- This script targets the EXACT policy names found in the diagnostic query
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Disable RLS to stop the bleeding
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. DROP THE RECURSIVE GHOSTS (Top priority)
DROP POLICY IF EXISTS "Enable select for users and admins" ON public.profiles;
DROP POLICY IF EXISTS "admin_view" ON public.profiles;

-- 3. DROP ALL OTHER REDUNDANT POLICIES (Cleanup)
DROP POLICY IF EXISTS "Enable insert for signup" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "self_update" ON public.profiles;
DROP POLICY IF EXISTS "self_view" ON public.profiles;

-- 4. RE-ENABLE RLS WITH CLEAN POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- POLICY A: Self-Access (The only one needed for workers/clients)
-- Uses auth.uid() directly. NO SUBQUERIES = NO RECURSION.
CREATE POLICY "profiles_self_access_all" 
ON public.profiles
FOR ALL 
USING (auth.uid() = id);

-- POLICY B: Admin-Access (For Super Admin/Finance)
-- Uses JWT metadata. DOES NOT QUERY THE PROFILES TABLE.
CREATE POLICY "profiles_admin_access_read" 
ON public.profiles
FOR SELECT 
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['Super Admin'::text, 'Finance'::text])
);

-- POLICY C: Restricted Admin Update (Optional safety)
CREATE POLICY "profiles_admin_access_update" 
ON public.profiles
FOR UPDATE 
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['Super Admin'::text, 'Finance'::text])
);

-- 5. FINAL INVITE CODE FIX (Ensure it's also clean)
ALTER TABLE public.invite_codes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_admin_all" ON public.invite_codes;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_codes_final_permissive" 
ON public.invite_codes
FOR ALL 
USING (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['Super Admin'::text, 'Finance'::text])
)
WITH CHECK (
  ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['Super Admin'::text, 'Finance'::text])
);

COMMIT;

-- VERIFICATION:
-- SELECT policyname FROM pg_policies WHERE tablename = 'profiles'; 
-- Should only show: profiles_self_access_all, profiles_admin_access_read, profiles_admin_access_update
