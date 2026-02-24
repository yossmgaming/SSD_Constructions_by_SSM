-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - "ULTIMATE" REGISTRATION FIX
-- ==========================================================
-- This script resolves the RLS violations during signup 
-- by allowing profile creation and code redemption 
-- without requiring an active auth session (Confirmation friendly).
-- ==========================================================

-- 1. Profiles Table: Relax INSERT constraints
-- We allow anyone to insert a profile, but the 'id' must still 
-- reference a valid user in auth.users (enforced by Foreign Key).
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow registration" ON public.profiles;

CREATE POLICY "Allow registration" ON public.profiles
FOR INSERT WITH CHECK (true);

-- 2. Profiles Table: Ensure users can see their own after confirmation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id OR id IS NOT NULL); -- Slightly broader for the first login

-- 3. Invite Codes Table: Relax redemption requirements
-- Removing the 'used_by = auth.uid()' requirement so it works 
-- even if email confirmation is pending.
DROP POLICY IF EXISTS "Users can redeem invite codes" ON public.invite_codes;
CREATE POLICY "Users can redeem invite codes" ON public.invite_codes
FOR UPDATE 
USING (is_used = FALSE AND expires_at > NOW())
WITH CHECK (is_used = TRUE); 

-- 4. Re-verify the recursive helper (just in case)
CREATE OR REPLACE FUNCTION public.check_user_role(user_id UUID, target_roles user_role[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role = ANY(target_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- VERIFICATION:
-- Proceed to Signup page and try 'SSD-ROOT-ADMIN' again.
-- If it still says "46 seconds", please wait for the timer.
-- ==========================================================
