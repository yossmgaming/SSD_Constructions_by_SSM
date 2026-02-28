-- Add is_half_day column to leave_requests if it doesn't exist
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT FALSE;

-- Add leave_type column if it doesn't exist  
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(20) DEFAULT 'Annual';

-- Grant permissions
GRANT ALL ON public.leave_requests TO authenticated, anon, service_role;
