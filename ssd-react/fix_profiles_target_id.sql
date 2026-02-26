-- Fix: Change profiles.target_id from UUID to TEXT to support Worker PIDs

ALTER TABLE public.profiles 
ALTER COLUMN target_id TYPE TEXT USING target_id::text;
