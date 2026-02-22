-- Run this in the Supabase SQL Editor to create the agreements table

CREATE TABLE IF NOT EXISTS public.agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL,                     -- e.g., 'Client', 'Worker', 'Supplier'
    entity_id TEXT NOT NULL,                -- References the specific project, worker, or supplier ID
    title TEXT NOT NULL,                    -- The title of the generated agreement
    content TEXT NOT NULL,                  -- The full HTML content of the draft/agreement
    status TEXT DEFAULT 'Draft'::text,      -- 'Draft', 'Signed', etc.
    signed_at TIMESTAMP WITH TIME ZONE,     -- When it was signed
    signed_by TEXT,                         -- Who signed it
    block_reason TEXT                       -- Any reason for blocking/canceling
);

-- Note: RLS (Row Level Security) might need to be set depending on your existing policies.
-- Let's just enable anonymous access similar to a development environment for now:
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for anon" ON public.agreements
    FOR ALL
    USING (true)
    WITH CHECK (true);
