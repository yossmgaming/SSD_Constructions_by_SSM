-- ============================================
-- SSD AI ARCHITECTURE - DATABASE SETUP
-- Structured Snapshots + Agent Configuration
-- ============================================

-- ============================================
-- SYSTEM SNAPSHOT (Daily Company State)
-- ============================================

CREATE TABLE IF NOT EXISTS system_snapshot_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    
    -- Project Stats
    total_projects INT DEFAULT 0,
    active_projects INT DEFAULT 0,
    completed_projects INT DEFAULT 0,
    pending_projects INT DEFAULT 0,
    
    -- Worker Stats
    total_workers INT DEFAULT 0,
    active_workers INT DEFAULT 0,
    
    -- Financials
    total_money_in DECIMAL(15,2) DEFAULT 0,
    total_money_out DECIMAL(15,2) DEFAULT 0,
    cash_balance DECIMAL(15,2) DEFAULT 0,
    pending_payments DECIMAL(15,2) DEFAULT 0,
    
    -- Alert Summary
    active_alerts INT DEFAULT 0,
    critical_alerts INT DEFAULT 0,
    pending_worker_requests INT DEFAULT 0,
    pending_material_requests INT DEFAULT 0,
    
    -- Attendance
    total_attendance_records INT DEFAULT 0,
    present_today INT DEFAULT 0,
    absent_today INT DEFAULT 0,
    
    -- Daily Reports
    daily_reports_today INT DEFAULT 0,
    incidents_today INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_snapshot_date ON system_snapshot_daily(snapshot_date DESC);

-- ============================================
-- PROJECT SNAPSHOT (Daily Per Project State)
-- ============================================

CREATE TABLE IF NOT EXISTS project_snapshot_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    project_id BIGINT NOT NULL,
    
    -- Project Details
    project_name TEXT,
    project_status TEXT,
    
    -- Worker Stats
    assigned_workers INT DEFAULT 0,
    present_today INT DEFAULT 0,
    absent_today INT DEFAULT 0,
    attendance_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Materials
    materials_used_today DECIMAL(15,2) DEFAULT 0,
    material_requests_pending INT DEFAULT 0,
    
    -- Reports
    daily_reports_count INT DEFAULT 0,
    incidents_count INT DEFAULT 0,
    
    -- Worker Requests
    worker_requests_pending INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(snapshot_date, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_snapshot_date ON project_snapshot_daily(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_snapshot_project ON project_snapshot_daily(project_id);

-- ============================================
-- FINANCE SNAPSHOT (Daily Financial State)
-- ============================================

CREATE TABLE IF NOT EXISTS finance_snapshot_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    
    -- Totals
    total_income DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_flow DECIMAL(15,2) DEFAULT 0,
    
    -- Payment Stats
    payments_in_count INT DEFAULT 0,
    payments_out_count INT DEFAULT 0,
    
    -- Pending
    pending_payments_count INT DEFAULT 0,
    pending_payments_value DECIMAL(15,2) DEFAULT 0,
    
    -- By Project (JSON for quick lookup)
    by_project JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_snapshot_date ON finance_snapshot_daily(snapshot_date DESC);

-- ============================================
-- WORKER SNAPSHOT (Daily Per Worker State)
-- ============================================

CREATE TABLE IF NOT EXISTS worker_snapshot_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    worker_id BIGINT NOT NULL,
    
    -- Worker Details
    worker_name TEXT,
    worker_role TEXT,
    project_id BIGINT,
    project_name TEXT,
    
    -- Attendance Stats
    present_count INT DEFAULT 0,
    absent_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    halfday_count INT DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    
    -- This Day
    is_present_today BOOLEAN DEFAULT false,
    attendance_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Leave
    leave_days_this_month INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(snapshot_date, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_snapshot_date ON worker_snapshot_daily(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_worker_snapshot_worker ON worker_snapshot_daily(worker_id);

-- ============================================
-- AI AGENT CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL CHECK (agent_type IN (
        'admin', 'finance', 'pm', 'supervisor', 'client', 'worker'
    )),
    agent_name TEXT NOT NULL,
    description TEXT,
    
    -- Scope Configuration
    scope_type TEXT CHECK (scope_type IN (
        'system', 'project', 'client', 'worker', 'personal'
    )),
    scope_id BIGINT, -- Optional: specific project/client/worker
    
    -- Capabilities
    can_read_alerts BOOLEAN DEFAULT true,
    can_read_snapshots BOOLEAN DEFAULT true,
    can_read_events BOOLEAN DEFAULT true,
    can_write_alerts BOOLEAN DEFAULT false,
    
    -- System Prompt (custom instructions)
    system_prompt TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_scope ON ai_agents(scope_type, scope_id);

-- Insert default agents
INSERT INTO ai_agents (agent_type, agent_name, description, scope_type, system_prompt) VALUES
('admin', 'Admin AI - God Eye', 'Full system awareness for company leadership', 'system', 
 'You are the Admin AI for SSD Construction. You have full system awareness. Analyze company-wide data, detect patterns, and provide strategic insights. Never share raw data - always summarize.'),
 
('finance', 'Finance AI', 'Financial analysis and cash flow management', 'system',
 'You are the Finance AI for SSD Construction. Focus on cash flow, expenses, income, and financial anomalies. Provide financial insights only.'),
 
('pm', 'Project Manager AI', 'Project-scoped assistant for project managers', 'project',
 'You are a Project Manager AI for SSD Construction. You help manage specific projects. Focus on project progress, resources, and timeline.'),
 
('supervisor', 'Supervisor AI', 'Site-scoped assistant for supervisors', 'project',
 'You are a Supervisor AI for SSD Construction. You help monitor site attendance, daily reports, and worker allocation.'),
 
('client', 'Client AI', 'Client-scoped assistant for clients', 'client',
 'You are a Client AI for SSD Construction. You provide professional updates to clients about their projects. Be concise and professional.'),
 
('worker', 'Worker AI', 'Personal assistant for workers', 'personal',
 'You are a Worker AI for SSD Construction. You help workers check their attendance, shifts, and leave balance. Be friendly and helpful.')
ON CONFLICT DO NOTHING;

-- ============================================
-- AI CONTEXT LOG (What AI was told)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_context_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL,
    user_id UUID,
    scope_type TEXT,
    scope_id BIGINT,
    
    -- Context Summary (not full raw data)
    context_summary JSONB NOT NULL,
    tokens_used INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_context_logs_date ON ai_context_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE system_snapshot_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_snapshot_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_snapshot_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_snapshot_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read snapshots (filtered by role in queries)
CREATE POLICY "Authenticated can read snapshots" ON system_snapshot_daily FOR SELECT USING (true);
CREATE POLICY "Authenticated can read project snapshots" ON project_snapshot_daily FOR SELECT USING (true);
CREATE POLICY "Authenticated can read finance snapshots" ON finance_snapshot_daily FOR SELECT USING (true);
CREATE POLICY "Authenticated can read worker snapshots" ON worker_snapshot_daily FOR SELECT USING (true);

-- Only service role can manage agents
CREATE POLICY "Service can manage agents" ON ai_agents FOR ALL USING (true);
CREATE POLICY "Service can manage context logs" ON ai_context_logs FOR ALL USING (true);

-- ============================================
-- SNAPSHOT BUILDER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION build_daily_snapshots()
RETURNS void AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    yesterday_date DATE := CURRENT_DATE - 1;
BEGIN
    -- ============================================
    -- BUILD SYSTEM SNAPSHOT
    -- ============================================
    INSERT INTO system_snapshot_daily (
        snapshot_date,
        total_projects, active_projects, completed_projects, pending_projects,
        total_workers, active_workers,
        total_money_in, total_money_out, cash_balance, pending_payments,
        active_alerts, critical_alerts, pending_worker_requests, pending_material_requests,
        total_attendance_records, present_today, absent_today,
        daily_reports_today, incidents_today
    )
    SELECT 
        today_date,
        (SELECT COUNT(*) FROM projects),
        (SELECT COUNT(*) FROM projects WHERE "status" = 'Ongoing'),
        (SELECT COUNT(*) FROM projects WHERE "status" = 'Completed'),
        (SELECT COUNT(*) FROM projects WHERE "status" = 'Pending'),
        (SELECT COUNT(*) FROM workers),
        (SELECT COUNT(*) FROM workers WHERE "status" = 'Active'),
        COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'In'), 0),
        COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'Out'), 0),
        COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'In'), 0) - COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'Out'), 0),
        COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'Pending'), 0),
        (SELECT COUNT(*) FROM ai_alerts WHERE resolved = false),
        (SELECT COUNT(*) FROM ai_alerts WHERE resolved = false AND severity = 'critical'),
        (SELECT COUNT(*) FROM worker_requests WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM material_requests WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM attendances WHERE "date" = today_date::TEXT),
        (SELECT COUNT(*) FROM attendances WHERE "date" = today_date::TEXT AND "isPresent" = true),
        (SELECT COUNT(*) FROM attendances WHERE "date" = today_date::TEXT AND "isPresent" = false),
        (SELECT COUNT(*) FROM daily_reports WHERE report_date = today_date),
        (SELECT COUNT(*) FROM incidents WHERE "date" = today_date)
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_projects = EXCLUDED.total_projects,
        active_projects = EXCLUDED.active_projects,
        completed_projects = EXCLUDED.completed_projects,
        pending_projects = EXCLUDED.pending_projects,
        total_workers = EXCLUDED.total_workers,
        active_workers = EXCLUDED.active_workers,
        total_money_in = EXCLUDED.total_money_in,
        total_money_out = EXCLUDED.total_money_out,
        cash_balance = EXCLUDED.cash_balance,
        pending_payments = EXCLUDED.pending_payments,
        active_alerts = EXCLUDED.active_alerts,
        critical_alerts = EXCLUDED.critical_alerts,
        pending_worker_requests = EXCLUDED.pending_worker_requests,
        pending_material_requests = EXCLUDED.pending_material_requests,
        total_attendance_records = EXCLUDED.total_attendance_records,
        present_today = EXCLUDED.present_today,
        absent_today = EXCLUDED.absent_today,
        daily_reports_today = EXCLUDED.daily_reports_today,
        incidents_today = EXCLUDED.incidents_today;

    -- ============================================
    -- BUILD PROJECT SNAPSHOTS
    -- ============================================
    INSERT INTO project_snapshot_daily (
        snapshot_date, project_id, project_name, project_status,
        assigned_workers, present_today, absent_today, attendance_rate,
        materials_used_today, material_requests_pending,
        daily_reports_count, incidents_count, worker_requests_pending
    )
    SELECT 
        today_date,
        p.id,
        p."name",
        p."status",
        (SELECT COUNT(*) FROM "projectWorkers" WHERE "projectId" = p.id),
        (SELECT COUNT(*) FROM attendances a JOIN "projectWorkers" pw ON a."workerId" = pw."workerId" WHERE pw."projectId" = p.id AND a."date" = today_date::TEXT AND a."isPresent" = true),
        (SELECT COUNT(*) FROM attendances a JOIN "projectWorkers" pw ON a."workerId" = pw."workerId" WHERE pw."projectId" = p.id AND a."date" = today_date::TEXT AND a."isPresent" = false),
        CASE 
            WHEN (SELECT COUNT(*) FROM "projectWorkers" WHERE "projectId" = p.id) > 0 
            THEN ROUND(
                (SELECT COUNT(*) FROM attendances a JOIN "projectWorkers" pw ON a."workerId" = pw."workerId" WHERE pw."projectId" = p.id AND a."date" = today_date::TEXT AND a."isPresent" = true)::numeric /
                (SELECT COUNT(*) FROM "projectWorkers" WHERE "projectId" = p.id)::numeric * 100
            , 2)
            ELSE 0
        END,
        COALESCE((SELECT SUM(pm.quantity * m.cost) FROM "projectMaterials" pm JOIN materials m ON pm."materialId" = m.id WHERE pm."projectId" = p.id AND pm."date" = today_date::TEXT), 0),
        (SELECT COUNT(*) FROM material_requests WHERE project_id = p.id AND status = 'Pending'),
        (SELECT COUNT(*) FROM daily_reports WHERE project_id = p.id AND report_date = today_date),
        (SELECT COUNT(*) FROM incidents WHERE project_id = p.id AND "date" = today_date),
        (SELECT COUNT(*) FROM worker_requests WHERE project_id = p.id AND status = 'Pending')
    FROM projects p
    ON CONFLICT (snapshot_date, project_id) DO UPDATE SET
        assigned_workers = EXCLUDED.assigned_workers,
        present_today = EXCLUDED.present_today,
        absent_today = EXCLUDED.absent_today,
        attendance_rate = EXCLUDED.attendance_rate,
        materials_used_today = EXCLUDED.materials_used_today,
        material_requests_pending = EXCLUDED.material_requests_pending,
        daily_reports_count = EXCLUDED.daily_reports_count,
        incidents_count = EXCLUDED.incidents_count,
        worker_requests_pending = EXCLUDED.worker_requests_pending;

    -- ============================================
    -- BUILD FINANCE SNAPSHOT
    -- ============================================
    INSERT INTO finance_snapshot_daily (
        snapshot_date,
        total_income, total_expenses, net_flow,
        payments_in_count, payments_out_count,
        pending_payments_count, pending_payments_value
    )
    SELECT 
        today_date,
        COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'In'), 0),
        COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'Out'), 0),
        COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'In'), 0) - COALESCE((SELECT SUM(amount) FROM payments WHERE direction = 'Out'), 0),
        (SELECT COUNT(*) FROM payments WHERE direction = 'In'),
        (SELECT COUNT(*) FROM payments WHERE direction = 'Out'),
        (SELECT COUNT(*) FROM payments WHERE status = 'Pending'),
        COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'Pending'), 0)
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        net_flow = EXCLUDED.net_flow,
        payments_in_count = EXCLUDED.payments_in_count,
        payments_out_count = EXCLUDED.payments_out_count,
        pending_payments_count = EXCLUDED.pending_payments_count,
        pending_payments_value = EXCLUDED.pending_payments_value;

    -- ============================================
    -- BUILD WORKER SNAPSHOTS
    -- ============================================
    INSERT INTO worker_snapshot_daily (
        snapshot_date, worker_id, worker_name, worker_role,
        project_id, project_name,
        present_count, absent_count, late_count, halfday_count, overtime_hours,
        is_present_today, attendance_rate
    )
    SELECT DISTINCT ON (w.id)
        today_date,
        w.id,
        w."fullName",
        w."role",
        pw."projectId",
        p."name",
        (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id AND "isPresent" = true),
        (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id AND "isPresent" = false),
        (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id AND "isPresent" = true AND "hoursWorked" < 8),
        (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id AND "isHalfDay" = true),
        COALESCE((SELECT SUM("hoursWorked") FROM attendances WHERE "workerId" = w.id AND "hoursWorked" > 8), 0),
        EXISTS(SELECT 1 FROM attendances WHERE "workerId" = w.id AND "date" = today_date::TEXT AND "isPresent" = true),
        CASE 
            WHEN (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id) > 0
            THEN ROUND(
                (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id AND "isPresent" = true)::numeric /
                (SELECT COUNT(*) FROM attendances WHERE "workerId" = w.id)::numeric * 100
            , 2)
            ELSE 100
        END
    FROM workers w
    LEFT JOIN "projectWorkers" pw ON pw."workerId" = w.id
    LEFT JOIN projects p ON p.id = pw."projectId"
    ORDER BY w.id, pw."createdAt" DESC
    ON CONFLICT (snapshot_date, worker_id) DO UPDATE SET
        present_count = EXCLUDED.present_count,
        absent_count = EXCLUDED.absent_count,
        late_count = EXCLUDED.late_count,
        halfday_count = EXCLUDED.halfday_count,
        overtime_hours = EXCLUDED.overtime_hours,
        is_present_today = EXCLUDED.is_present_today,
        attendance_rate = EXCLUDED.attendance_rate;

    RAISE NOTICE 'Daily snapshots built successfully for %', today_date;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION build_daily_snapshots() TO authenticated;

-- ============================================
-- CONTEXT BUILDER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION build_ai_context(
    p_agent_type TEXT,
    p_user_id UUID,
    p_scope_type TEXT DEFAULT NULL,
    p_scope_id BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    context JSONB := '{}'::jsonb;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Common context for all agents
    context := context || jsonb_build_object(
        'generated_at', NOW()::text,
        'today', today_date
    );

    -- System-wide context (Admin & Finance)
    IF p_agent_type IN ('admin', 'finance') THEN
        context := context || jsonb_build_object(
            'system', (
                SELECT jsonb_build_object(
                    'total_projects', total_projects,
                    'active_projects', active_projects,
                    'total_workers', total_workers,
                    'cash_balance', cash_balance,
                    'active_alerts', active_alerts,
                    'critical_alerts', critical_alerts,
                    'present_today', present_today,
                    'absent_today', absent_today,
                    'pending_worker_requests', pending_worker_requests,
                    'pending_material_requests', pending_material_requests
                )
                FROM system_snapshot_daily
                ORDER BY snapshot_date DESC
                LIMIT 1
            )
        );
    END IF;

    -- Project-scoped context (PM & Supervisor)
    IF p_scope_type = 'project' AND p_scope_id IS NOT NULL THEN
        context := context || jsonb_build_object(
            'project', (
                SELECT jsonb_build_object(
                    'project_name', project_name,
                    'project_status', project_status,
                    'assigned_workers', assigned_workers,
                    'present_today', present_today,
                    'attendance_rate', attendance_rate,
                    'materials_used_today', materials_used_today,
                    'material_requests_pending', material_requests_pending,
                    'daily_reports_count', daily_reports_count,
                    'incidents_count', incidents_count,
                    'worker_requests_pending', worker_requests_pending
                )
                FROM project_snapshot_daily
                WHERE project_id = p_scope_id
                ORDER BY snapshot_date DESC
                LIMIT 1
            )
        );
    END IF;

    -- Finance context (Finance agent)
    IF p_agent_type = 'finance' THEN
        context := context || jsonb_build_object(
            'finance', (
                SELECT jsonb_build_object(
                    'total_income', total_income,
                    'total_expenses', total_expenses,
                    'net_flow', net_flow,
                    'pending_payments_count', pending_payments_count,
                    'pending_payments_value', pending_payments_value
                )
                FROM finance_snapshot_daily
                ORDER BY snapshot_date DESC
                LIMIT 1
            )
        );
    END IF;

    -- Recent alerts
    context := context || jsonb_build_object(
        'recent_alerts', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'severity', severity,
                    'category', category,
                    'title', title,
                    'message', message,
                    'created_at', created_at
                )
            ), '[]'::jsonb)
            FROM ai_alerts
            WHERE resolved = false
            ORDER BY 
                CASE severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                created_at DESC
            LIMIT 10
        )
    );

    RETURN context;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION build_ai_context(TEXT, UUID, TEXT, BIGINT) TO authenticated;

-- ============================================
-- CLEANUP FUNCTION (Keep 90 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
    DELETE FROM system_snapshot_daily WHERE snapshot_date < NOW() - INTERVAL '90 days';
    DELETE FROM project_snapshot_daily WHERE snapshot_date < NOW() - INTERVAL '90 days';
    DELETE FROM finance_snapshot_daily WHERE snapshot_date < NOW() - INTERVAL '90 days';
    DELETE FROM worker_snapshot_daily WHERE snapshot_date < NOW() - INTERVAL '90 days';
    DELETE FROM ai_context_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Old snapshots cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_old_snapshots() TO authenticated;
