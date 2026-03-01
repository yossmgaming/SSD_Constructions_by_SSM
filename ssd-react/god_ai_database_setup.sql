-- ============================================
-- GOD AI DATABASE TABLES
-- Add missing tables for full AI system access
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PROJECT TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE project_tasks 
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS assigned_to BIGINT,
    ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(assigned_to);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read project_tasks' AND tablename = 'project_tasks') THEN
        ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read project_tasks" ON project_tasks FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert project_tasks" ON project_tasks FOR INSERT WITH CHECK (true);
        CREATE POLICY "Authenticated can update project_tasks" ON project_tasks FOR UPDATE USING (true);
    END IF;
END $$;

-- ============================================
-- MATERIAL REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS material_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE material_requests 
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS requested_by BIGINT,
    ADD COLUMN IF NOT EXISTS requested_by_name TEXT,
    ADD COLUMN IF NOT EXISTS material_name TEXT,
    ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS unit TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS approved_by BIGINT,
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS supplier_name TEXT,
    ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_material_requests_project ON material_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read material_requests') THEN
        ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read material_requests" ON material_requests FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert material_requests" ON material_requests FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- LEAVE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS worker_id BIGINT,
    ADD COLUMN IF NOT EXISTS worker_name TEXT,
    ADD COLUMN IF NOT EXISTS leave_type TEXT,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS total_days DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS approved_by BIGINT,
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_leave_requests_worker ON leave_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read leave_requests') THEN
        ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read leave_requests" ON leave_requests FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert leave_requests" ON leave_requests FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- WORKER REQUESTS (Advances, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS worker_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE worker_requests
    ADD COLUMN IF NOT EXISTS worker_id BIGINT,
    ADD COLUMN IF NOT EXISTS worker_name TEXT,
    ADD COLUMN IF NOT EXISTS request_type TEXT,
    ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS approved_by BIGINT,
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_date DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_worker_requests_worker ON worker_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_requests_status ON worker_requests(status);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read worker_requests') THEN
        ALTER TABLE worker_requests ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read worker_requests" ON worker_requests FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert worker_requests" ON worker_requests FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- ORDERS (Supplier Orders)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS order_number TEXT,
    ADD COLUMN IF NOT EXISTS supplier_name TEXT,
    ADD COLUMN IF NOT EXISTS supplier_contact TEXT,
    ADD COLUMN IF NOT EXISTS order_date DATE,
    ADD COLUMN IF NOT EXISTS expected_delivery DATE,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_orders_project ON orders(project_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_name);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read orders') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read orders" ON orders FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert orders" ON orders FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS incident_type TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS date DATE,
    ADD COLUMN IF NOT EXISTS reported_by BIGINT,
    ADD COLUMN IF NOT EXISTS reported_by_name TEXT,
    ADD COLUMN IF NOT EXISTS action_taken TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open',
    ADD COLUMN IF NOT EXISTS resolved_by BIGINT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_incidents_project ON incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read incidents') THEN
        ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read incidents" ON incidents FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert incidents" ON incidents FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- DAILY REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE daily_reports
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS report_date DATE,
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS work_completed TEXT,
    ADD COLUMN IF NOT EXISTS workers_present INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS materials_used TEXT,
    ADD COLUMN IF NOT EXISTS equipment_used TEXT,
    ADD COLUMN IF NOT EXISTS issues TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
    ADD COLUMN IF NOT EXISTS reported_by BIGINT,
    ADD COLUMN IF NOT EXISTS reported_by_name TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_daily_reports_project ON daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read daily_reports') THEN
        ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read daily_reports" ON daily_reports FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert daily_reports" ON daily_reports FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- SUBCONTRACTOR CLAIMS
-- ============================================
CREATE TABLE IF NOT EXISTS subcontractor_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE subcontractor_claims
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS subcontractor_name TEXT,
    ADD COLUMN IF NOT EXISTS work_description TEXT,
    ADD COLUMN IF NOT EXISTS claim_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS claim_date DATE,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS approved_by BIGINT,
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_date DATE,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_subcontractor_claims_project ON subcontractor_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_claims_status ON subcontractor_claims(status);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read subcontractor_claims') THEN
        ALTER TABLE subcontractor_claims ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read subcontractor_claims" ON subcontractor_claims FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert subcontractor_claims" ON subcontractor_claims FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- ADVANCE APPLICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS advanceApplications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE advanceApplications
    ADD COLUMN IF NOT EXISTS worker_id BIGINT,
    ADD COLUMN IF NOT EXISTS worker_name TEXT,
    ADD COLUMN IF NOT EXISTS advance_type TEXT DEFAULT 'Salary Advance',
    ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS approved_by BIGINT,
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_date DATE,
    ADD COLUMN IF NOT EXISTS monthly_deduction DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_advance_applications_worker ON advanceApplications(worker_id);
CREATE INDEX IF NOT EXISTS idx_advance_applications_status ON advanceApplications(status);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read advanceApplications') THEN
        ALTER TABLE advanceApplications ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read advanceApplications" ON advanceApplications FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert advanceApplications" ON advanceApplications FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- PROJECT WORKERS (Assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS projectWorkers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE projectWorkers
    ADD COLUMN IF NOT EXISTS project_id BIGINT,
    ADD COLUMN IF NOT EXISTS worker_id BIGINT,
    ADD COLUMN IF NOT EXISTS worker_name TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS assigned_date DATE,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_project_workers_project ON projectWorkers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_workers_worker ON projectWorkers(worker_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read projectWorkers') THEN
        ALTER TABLE projectWorkers ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read projectWorkers" ON projectWorkers FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert projectWorkers" ON projectWorkers FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS client_name TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS contact_person TEXT,
    ADD COLUMN IF NOT EXISTS nic TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_name);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read clients') THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read clients" ON clients FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert clients" ON clients FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS supplier_name TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS contact_person TEXT,
    ADD COLUMN IF NOT EXISTS materials_supplied TEXT,
    ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_materials ON suppliers(materials_supplied);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read suppliers') THEN
        ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read suppliers" ON suppliers FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert suppliers" ON suppliers FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- HOLIDAYS
-- ============================================
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE holidays
    ADD COLUMN IF NOT EXISTS holiday_name TEXT,
    ADD COLUMN IF NOT EXISTS holiday_name_si TEXT,
    ADD COLUMN IF NOT EXISTS holiday_date DATE,
    ADD COLUMN IF NOT EXISTS holiday_type TEXT DEFAULT 'Public',
    ADD COLUMN IF NOT EXISTS is_annual BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_name ON holidays(holiday_name);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read holidays') THEN
        ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read holidays" ON holidays FOR SELECT USING (true);
        CREATE POLICY "Authenticated can insert holidays" ON holidays FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- AI DAILY SNAPSHOTS (CEO-level cached analysis)
-- Stores pre-computed hourly analysis for instant AI responses
-- ============================================
CREATE TABLE IF NOT EXISTS ai_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE UNIQUE NOT NULL,
    snapshot_data JSONB NOT NULL,
    key_metrics JSONB,
    alerts JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_snapshots_date ON ai_daily_snapshots(analysis_date);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read ai_daily_snapshots') THEN
        ALTER TABLE ai_daily_snapshots ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can read ai_daily_snapshots" ON ai_daily_snapshots FOR SELECT USING (true);
        CREATE POLICY "Anyone can insert ai_daily_snapshots" ON ai_daily_snapshots FOR INSERT WITH CHECK (true);
        CREATE POLICY "Anyone can update ai_daily_snapshots" ON ai_daily_snapshots FOR UPDATE USING (true);
    END IF;
END $$;

-- Function to get or refresh analysis (returns cached or generates new)
CREATE OR REPLACE FUNCTION get_ai_snapshot(force_refresh BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    snapshot RECORD;
    result JSONB;
BEGIN
    -- Check if we have a recent snapshot (within 1 hour)
    IF force_refresh = false THEN
        SELECT * INTO snapshot FROM ai_daily_snapshots 
        WHERE analysis_date = today_date 
        AND generated_at > NOW() - INTERVAL '1 hour'
        ORDER BY generated_at DESC
        LIMIT 1;
    END IF;

    -- If no recent snapshot, return null (caller should generate new)
    IF snapshot IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN snapshot.snapshot_data;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_ai_snapshot(BOOLEAN) TO authenticated;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT 'GOD AI Tables Created Successfully!' as status;
