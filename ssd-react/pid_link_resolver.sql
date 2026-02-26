-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: PID Identity Resolver (v2 - Updated to match by PID for all roles)
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────
-- This function resolves a logged-in user's profile.target_id + role
-- into the actual record from the correct table (workers, clients, suppliers, etc.)
-- It is SECURITY DEFINER so it runs with elevated privileges even if RLS
-- blocks the user from reading other tables directly.
--
-- target_id values stored in invite_codes (and hence in profiles):
--   Workers, Supervisors, PM, Finance, Sub Contractors : pid field (e.g. SSD-W-...)
--   Clients                                            : pid field (e.g. SSD-C-...)
--   Suppliers                                          : pid field (e.g. SSD-S-...)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_identity()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id TEXT;
  v_role TEXT;
  result JSON;
BEGIN
  -- Step 1: Get this user's profile
  SELECT target_id, role
  INTO v_target_id, v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- If no profile or no target_id, return null
  IF v_target_id IS NULL OR v_target_id = '' THEN
    RETURN NULL;
  END IF;

  -- Step 2: Route to the correct table based on role
  -- All roles now use the pid field for matching (stored in profiles.target_id)

  IF v_role IN ('Worker', 'Site Supervisor', 'Project Manager', 'Finance') THEN
    -- Workers and management roles in the workers table, matched by pid
    SELECT row_to_json(w)
    INTO result
    FROM public.workers w
    WHERE w.pid = v_target_id
    LIMIT 1;

  ELSIF v_role = 'Client' THEN
    -- Clients matched by their pid (e.g. SSD-C-...)
    SELECT row_to_json(c)
    INTO result
    FROM public.clients c
    WHERE c.pid = v_target_id
    LIMIT 1;

  ELSIF v_role = 'Supplier' THEN
    -- Suppliers matched by their pid (e.g. SSD-S-...)
    SELECT row_to_json(s)
    INTO result
    FROM public.suppliers s
    WHERE s.pid = v_target_id
    LIMIT 1;

  ELSIF v_role = 'Sub Contractor' THEN
    -- Sub-contractors matched by their pid (e.g. SSD-SC-...)
    SELECT row_to_json(sc)
    INTO result
    FROM public.subcontractors sc
    WHERE sc.pid = v_target_id
    LIMIT 1;

  ELSE
    -- Super Admin or unknown role — return null (they don't need identity linking)
    RETURN NULL;
  END IF;

  RETURN result;
END;
$$;

-- Grant execution to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_my_identity() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Test the function as a specific user
-- SELECT public.get_my_identity();
-- Expected: JSON object with the worker/client/supplier record for the current user
-- ─────────────────────────────────────────────────────────────────────────────
