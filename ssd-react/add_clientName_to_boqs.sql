-- Migration: Add clientName to boqs table
ALTER TABLE public.boqs ADD COLUMN IF NOT EXISTS "clientName" TEXT;
