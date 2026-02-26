-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: Fix Missing User Roles in Enum
-- Run this in Supabase SQL Editor to allow Supplier and Sub Contractor invites
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Add missing roles to the user_role enum
-- Note: 'ALTER TYPE ... ADD VALUE' cannot be run inside a transaction block in some Postgres versions.
-- If this fails, run the ALTER TYPE commands separately outside the BEGIN/COMMIT blocks.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Supplier';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Sub Contractor';

-- 2. Verify the enum values
-- SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'user_role';

COMMIT;
