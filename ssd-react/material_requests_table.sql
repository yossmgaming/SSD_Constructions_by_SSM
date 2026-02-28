-- Material Requests Table
-- Supervisors request materials for their projects, PMs/Admins approve

CREATE TABLE IF NOT EXISTS material_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity_needed INT NOT NULL CHECK (quantity_needed > 0),
    unit TEXT DEFAULT 'pieces',
    purpose TEXT,
    date_needed DATE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;

-- Policies for material_requests
DROP POLICY IF EXISTS "Anyone can view material_requests" ON material_requests;
DROP POLICY IF EXISTS "Supervisors can insert material_requests" ON material_requests;
DROP POLICY IF EXISTS "Anyone can update their own material_requests" ON material_requests;
DROP POLICY IF EXISTS "Admins can manage all material_requests" ON material_requests;

CREATE POLICY "Anyone can view material_requests" ON material_requests FOR SELECT
    USING (true);

CREATE POLICY "Supervisors can insert material_requests" ON material_requests FOR INSERT
    WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Anyone can update their own material_requests" ON material_requests FOR UPDATE
    USING (auth.uid() = supervisor_id)
    WITH CHECK (auth.uid() = supervisor_id AND status = 'Pending');

CREATE POLICY "Admins can manage all material_requests" ON material_requests FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Finance', 'Project Manager'))
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_requests_supervisor ON material_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_project ON material_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);

-- Add to supabase/migrations if needed
