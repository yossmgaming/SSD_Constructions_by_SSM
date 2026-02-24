-- SSD Constructions Enterprise Governance Schema
-- Phase 6: Auth, RBAC, and Immutable Audit Logs

-- 1. Create RBAC ENUM
CREATE TYPE user_role AS ENUM ('Super Admin', 'Finance', 'Project Manager', 'Site Supervisor', 'Worker', 'Client');

-- 2. Create Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'Worker',
    target_id UUID, -- Links to generic entity (worker.id, client_id, etc.) based on role
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Invite Codes Table (The Gatekeeper)
CREATE TABLE public.invite_codes (
    code TEXT PRIMARY KEY,
    role user_role NOT NULL,
    target_id UUID, -- The ID of the worker, project, or client this invite is for
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- The user who eventually signed up
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Ensure only Admins/Finance can create
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on invite codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create Audit Logs Table (The Truth Engine)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,          -- e.g., 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,      -- e.g., 'workers', 'payments'
    record_id UUID NOT NULL,       -- The ID of the modified record
    old_value JSONB,               -- Snapshot before
    new_value JSONB,               -- Snapshot after
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit logs (Only Super Admin should view this)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create Trigger Function for Automated Auditing
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (action, table_name, record_id, old_value, changed_by)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (action, table_name, record_id, old_value, new_value, changed_by)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (action, table_name, record_id, new_value, changed_by)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Apply Audit Triggers to Sensitive Tables
-- Replace these with your actual table names once structure is finalized
/* 
CREATE TRIGGER audit_workers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.workers
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_projects_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
*/

-- 7. Add Base RLS Policies

-- Helper function to check role without recursion
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

-- Profiles: Users can read their own profile. Admins can read all.
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.check_user_role(auth.uid(), ARRAY['Super Admin', 'Finance']::user_role[]));

-- Invite Codes: Anyone can read unused codes to sign up. Admins can manage all.
CREATE POLICY "Public can read unused codes" ON public.invite_codes
FOR SELECT USING (is_used = FALSE AND expires_at > NOW());

CREATE POLICY "Users can redeem invite codes" ON public.invite_codes
FOR UPDATE 
USING (is_used = FALSE AND expires_at > NOW())
WITH CHECK (is_used = TRUE AND used_by = auth.uid());

CREATE POLICY "Admins can manage invite codes" ON public.invite_codes
FOR ALL USING (public.check_user_role(auth.uid(), ARRAY['Super Admin', 'Finance']::user_role[]));

-- Audit Logs: Fully restricted to Super Admin
CREATE POLICY "Only Super Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.check_user_role(auth.uid(), ARRAY['Super Admin']::user_role[]));

-- Note: The audit_trigger_function is SECURITY DEFINER, so it can write to audit_logs 
-- even if the user doing the action doesn't have INSERT permissions on the table.
