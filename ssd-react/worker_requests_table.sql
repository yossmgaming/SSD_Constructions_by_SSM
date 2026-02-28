-- Worker Requests Table
-- Supervisors request workers for their projects, PMs/Admins approve

CREATE TABLE IF NOT EXISTS worker_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    worker_type TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    duration_days INT NOT NULL CHECK (duration_days > 0),
    start_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE worker_requests ENABLE ROW LEVEL SECURITY;

-- Policies for worker_requests
DROP POLICY IF EXISTS "Anyone can view worker_requests" ON worker_requests;
DROP POLICY IF EXISTS "Supervisors can insert worker_requests" ON worker_requests;
DROP POLICY IF EXISTS "Anyone can view their own worker_requests" ON worker_requests;
DROP POLICY IF EXISTS "Admins can manage all worker_requests" ON worker_requests;

CREATE POLICY "Anyone can view worker_requests" ON worker_requests FOR SELECT
    USING (true);

CREATE POLICY "Supervisors can insert worker_requests" ON worker_requests FOR INSERT
    WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Anyone can update their own worker_requests" ON worker_requests FOR UPDATE
    USING (auth.uid() = supervisor_id)
    WITH CHECK (auth.uid() = supervisor_id AND status = 'Pending');

CREATE POLICY "Admins can manage all worker_requests" ON worker_requests FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Finance', 'Project Manager'))
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_worker_requests_supervisor ON worker_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_worker_requests_project ON worker_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_requests_status ON worker_requests(status);

-- Add to supabase/migrations if needed
