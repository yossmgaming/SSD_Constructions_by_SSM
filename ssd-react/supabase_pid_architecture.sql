-- SSD Constructions Phase 7: PID Architecture & Secure Invitations
-- This script enhances the existing schema with PIDs and Secure Tokens.

-- 1. Enhance Workers table with PID
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS pid TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_workers_pid ON public.workers(pid);

-- 2. Enhance Invite Codes with Hashed Tokens
-- Loosen target_id to TEXT for numeric ID compatibility
ALTER TABLE public.invite_codes ALTER COLUMN target_id TYPE TEXT;
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_invite_codes_hash ON public.invite_codes(token_hash);

-- 3. Add Login Logs table for Forensic Auditing (Section 3 of Phase 7)
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on login_logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DROP POLICY IF EXISTS "Users can view own login logs" ON public.login_logs;
CREATE POLICY "Users can view own login logs" ON public.login_logs
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all login logs" ON public.login_logs;
CREATE POLICY "Admins can view all login logs" ON public.login_logs
FOR SELECT USING (public.check_user_role(auth.uid(), ARRAY['Super Admin', 'Finance']::user_role[]));

-- 4. Function to generate PIDs automatically for new workers
CREATE OR REPLACE FUNCTION generate_ssd_pid_val()
RETURNS TEXT AS $$
DECLARE
    new_pid TEXT;
    current_year TEXT;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    LOOP
        -- Format: SSD-W-YYYY-XXXX (where XXXX is 4 random alphanumeric chars)
        new_pid := 'SSD-W-' || current_year || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.workers WHERE pid = new_pid);
    END LOOP;
    RETURN new_pid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_ssd_pid()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pid := generate_ssd_pid_val();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign PID on worker creation if not provided
DROP TRIGGER IF EXISTS trigger_assign_worker_pid ON public.workers;
CREATE TRIGGER trigger_assign_worker_pid
BEFORE INSERT ON public.workers
FOR EACH ROW
WHEN (NEW.pid IS NULL)
EXECUTE FUNCTION generate_ssd_pid();

-- 5. Migration: Assign PIDs to existing workers without one
DO $$
DECLARE
    worker_rec RECORD;
BEGIN
    FOR worker_rec IN SELECT id FROM public.workers WHERE pid IS NULL LOOP
        UPDATE public.workers SET pid = generate_ssd_pid_val() WHERE id = worker_rec.id;
    END LOOP;
END;
$$;
