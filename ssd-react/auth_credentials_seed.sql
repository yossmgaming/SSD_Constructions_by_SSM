-- ==========================================================
-- SSD CONSTRUCTION MANAGEMENT - AUTHENTICATION CHEAT SHEET
-- ==========================================================
-- This script creates a reference table for authorized users,
-- their default passwords, and pre-assigned invite codes.
--
-- IMPORTANT: This table is for INTERNAL GOVERNANCE and seeder 
-- reference only. Supabase AUTH handles actual hashed passwords 
-- in the auth.users system table.
-- ==========================================================

-- 1. Create the reference table in the public schema
CREATE TABLE IF NOT EXISTS public.auth_credentials_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    plain_password TEXT NOT NULL, -- For internal admin reference only
    assigned_role TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    access_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed the vault with default administrative and operational profiles
INSERT INTO public.auth_credentials_vault (email, plain_password, assigned_role, invite_code, access_level)
VALUES 
('admin@ssdconstructions.lk',    'SSD-Root-2026#',   'Super Admin',      'SSD-ROOT-ADMIN',   'FULL_SYSTEM_AUTHORITY'),
('finance@ssdconstructions.lk',  'SSD-Finance-77',   'Finance',          'SSD-FINA-AUTH',   'FINANCIAL_RESTRICTED'),
('pm@ssdconstructions.lk',       'SSD-Project-PM',   'Project Manager',  'SSD-PMGR-1029',   'OPERATIONAL_MANAGEMENT'),
('supervisor@ssdconstructions.lk', 'SSD-Site-Lead',   'Site Supervisor',  'SSD-SSUP-4481',   'FIELD_COORDINATION'),
('client@ssdconstructions.lk',   'SSD-Client-Portal', 'Client',          'SSD-CLNT-GOLD',   'STAKEHOLDER_VIEW_ONLY'),
('worker-test@ssd.lk',           'SSD-Worker-2026',  'Worker',           'SSD-WRKR-TEMP',   'MOBILE_ATTENDANCE_ONLY')
ON CONFLICT (email) DO NOTHING;

-- 3. Ensure the invite_codes table (from governance schema) is synced
-- This seeder populates the gatekeeper system with these pre-approved tokens
INSERT INTO public.invite_codes (code, role, expires_at)
VALUES 
('SSD-ROOT-ADMIN', 'Super Admin',      NOW() + interval '1 year'),
('SSD-FINA-AUTH',  'Finance',          NOW() + interval '6 months'),
('SSD-PMGR-1029',  'Project Manager',  NOW() + interval '6 months'),
('SSD-SSUP-4481',  'Site Supervisor',  NOW() + interval '6 months'),
('SSD-CLNT-GOLD',  'Client',           NOW() + interval '1 year'),
('SSD-WRKR-TEMP',  'Worker',           NOW() + interval '3 months')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.auth_credentials_vault IS 'Internal SSD Governance record for tracking master credentials and corresponding invite codes.';

-- ==========================================================
-- USAGE INSTRUCTIONS:
-- 1. Execute this script in the Supabase SQL Editor.
-- 2. Use the 'invite_code' in the SSD Signup page to create the users.
-- 3. The system will automatically map the role and target settings.
-- ==========================================================
