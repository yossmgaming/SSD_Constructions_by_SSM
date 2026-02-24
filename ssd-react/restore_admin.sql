-- ==========================================================
-- SSD CONSTRUCTION - SUPER ADMIN RECOVERY SCRIPT
-- ==========================================================
-- Run this script in your Supabase SQL Editor if your 
-- sidebar items (Workers, Payments, etc.) have disappeared.
-- ==========================================================

-- 1. Identify your Auth ID (This subquery finds the most recently active user)
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users ORDER BY last_sign_in_at DESC LIMIT 1;

    -- 2. Restore/Upsert the Profile with Super Admin privileges
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        target_user_id, 
        (SELECT email FROM auth.users WHERE id = target_user_id),
        'Administrator', 
        'Super Admin'
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'Super Admin';

    RAISE NOTICE 'Restored Super Admin access for user ID: %', target_user_id;
END $$;
