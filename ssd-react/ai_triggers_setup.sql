-- ============================================
-- DATABASE TRIGGERS
-- These triggers automatically log changes to ai_events table
-- ============================================

-- ============================================
-- ATTENDANCE TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_attendance ON attendances;
CREATE TRIGGER ai_log_attendance
AFTER INSERT OR UPDATE OR DELETE ON attendances
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- WORKERS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_workers ON workers;
CREATE TRIGGER ai_log_workers
AFTER INSERT OR UPDATE OR DELETE ON workers
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- MATERIALS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_materials ON materials;
CREATE TRIGGER ai_log_materials
AFTER INSERT OR UPDATE OR DELETE ON materials
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- PROJECT MATERIALS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_project_materials ON "projectMaterials";
CREATE TRIGGER ai_log_project_materials
AFTER INSERT OR UPDATE OR DELETE ON "projectMaterials"
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- WORKER REQUESTS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_worker_requests ON worker_requests;
CREATE TRIGGER ai_log_worker_requests
AFTER INSERT OR UPDATE OR DELETE ON worker_requests
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- MATERIAL REQUESTS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_material_requests ON material_requests;
CREATE TRIGGER ai_log_material_requests
AFTER INSERT OR UPDATE OR DELETE ON material_requests
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- DAILY REPORTS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_daily_reports ON daily_reports;
CREATE TRIGGER ai_log_daily_reports
AFTER INSERT OR UPDATE OR DELETE ON daily_reports
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- INCIDENTS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_incidents ON incidents;
CREATE TRIGGER ai_log_incidents
AFTER INSERT OR UPDATE OR DELETE ON incidents
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- FINANCE/PAYMENTS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_payments ON payments;
CREATE TRIGGER ai_log_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- ADVANCE APPLICATIONS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_advance_applications ON "advanceApplications";
CREATE TRIGGER ai_log_advance_applications
AFTER INSERT OR UPDATE OR DELETE ON "advanceApplications"
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- PROJECT WORKERS TABLE TRIGGERS
-- (For ghost employee detection)
-- ============================================

DROP TRIGGER IF EXISTS ai_log_project_workers ON "projectWorkers";
CREATE TRIGGER ai_log_project_workers
AFTER INSERT OR UPDATE OR DELETE ON "projectWorkers"
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- PROJECTS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_projects ON projects;
CREATE TRIGGER ai_log_projects
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_ai_event();

-- ============================================
-- NOTIFICATIONS TABLE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS ai_log_notifications ON notifications;
CREATE TRIGGER ai_log_notifications
AFTER INSERT OR UPDATE OR DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION log_ai_event();
