-- Final Fix: Handle policy dependency, alter column, and restore policy
-- This resolves the "ERROR: cannot alter type of a column used in a policy definition"

BEGIN;

-- 1. Drop the blocking policy
-- Based on your error message, the specific policy name is:
-- "Clients can view their own registry entry" on table "clients"
DROP POLICY IF EXISTS "Clients can view their own registry entry" ON public.clients;

-- 2. Alter the profiles.target_id column type
-- We use '::text' to ensure safe conversion
ALTER TABLE public.profiles 
ALTER COLUMN target_id TYPE TEXT USING target_id::text;

-- 3. Recreate the policy with safe type casting (UUID to TEXT comparison)
-- This allows clients to still view their own registry by matching their UUID (as text) 
-- against the new TEXT target_id field.
CREATE POLICY "Clients can view their own registry entry" 
ON public.clients
FOR SELECT 
USING (
    id::text = (SELECT target_id FROM public.profiles WHERE id = auth.uid())
);

COMMIT;
