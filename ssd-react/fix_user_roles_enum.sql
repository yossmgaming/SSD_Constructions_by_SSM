-- ─────────────────────────────────────────────────────────────────────────────
-- SSD: Fix Missing User Roles in Enum
-- Run this in Supabase SQL Editor to allow new roles (Supervisor, Supplier, Sub Contractor)
-- ─────────────────────────────────────────────────────────────────────────────

-- Postgres DOES NOT allow ALTER TYPE ... ADD VALUE to be executed in a transaction block.
-- Run these lines one by one if they fail together.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Supervisor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Supplier';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Sub Contractor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Finance Manager';

-- After running the above, run this to see the current list:
-- SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'user_role';
