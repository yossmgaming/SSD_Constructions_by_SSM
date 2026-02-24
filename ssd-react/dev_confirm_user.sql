-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - DEV MODE: BYPASS EMAIL CONFIRMATION
-- ==========================================================
-- If you are hitting "Email Rate Limits" or your users are 
-- stuck in "Pending Confirmation", run these scripts.
-- ==========================================================

-- 1. MANUALLY CONFIRM A USER (Replace with your email)
-- This will mark the user as confirmed so they can log in immediately.
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    last_sign_in_at = NOW()
WHERE email = 'yossmgamingofficial@gmail.com'; -- <--- CHANGE THIS TO YOUR EMAIL

-- 2. ENSURE THE PROFILE EXISTS
-- If the signup crashed before creating the profile, run this manually 
-- to link the confirmed user to the Super Admin role.
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, 'Sithara Sangeeth', 'Super Admin'
FROM auth.users 
WHERE email = 'yossmgamingofficial@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 3. BURN THE INVITE CODE MANUALLY
UPDATE public.invite_codes 
SET is_used = TRUE, 
    used_by = (SELECT id FROM auth.users WHERE email = 'yossmgamingofficial@gmail.com')
WHERE code = 'SSD-ROOT-ADMIN';

-- ==========================================================
-- RECOMMENDATION FOR DEVELOPMENT:
-- To avoid this in the future, go to your Supabase Dashboard:
-- 1. Authentication -> Providers -> Email
-- 2. DISABLE "Confirm email" (Turn it OFF)
-- 3. ENABLE "Allow unconfirmed users to sign in" (Turn it ON)
-- ==========================================================
