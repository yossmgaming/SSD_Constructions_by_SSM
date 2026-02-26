-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add target_name to invite_codes
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds a human-readable "target_name" column to invite_codes so the admin
-- dashboard can display the person's name (e.g. "Kamal Perera") instead of
-- a raw PID/ID after an invite is generated.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.invite_codes
ADD COLUMN IF NOT EXISTS target_name TEXT;

-- Verification:
-- SELECT code, role, target_id, target_name, is_used FROM public.invite_codes ORDER BY created_at DESC LIMIT 10;
