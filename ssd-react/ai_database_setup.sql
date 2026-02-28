-- AI Events & Alerts Tables for SSD Construction Management
-- These tables track all database changes for AI anomaly detection

-- ============================================
-- AI EVENTS TABLE
-- Logs all changes to critical tables
-- ============================================

CREATE TABLE IF NOT EXISTS ai_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id TEXT, -- Changed from BIGINT to TEXT to support both BIGINT and UUID
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    project_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_events_created ON ai_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_table ON ai_events(table_name);
CREATE INDEX IF NOT EXISTS idx_ai_events_user ON ai_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_project ON ai_events(project_id);

-- ============================================
-- AI ALERTS TABLE
-- Stores AI-flagged anomalies and recommendations
-- ============================================

CREATE TABLE IF NOT EXISTS ai_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES ai_events(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    record_id TEXT, -- Changed from BIGINT to TEXT to support both BIGINT and UUID
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT, -- e.g., 'attendance', 'finance', 'materials', 'safety'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recommendation TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_alerts_created ON ai_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_severity ON ai_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_category ON ai_alerts(category);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_resolved ON ai_alerts(resolved);

-- ============================================
-- ROW LEVEL SECURITY
-- Only admins can view/manage alerts
-- ============================================

ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (triggers will do this)
CREATE POLICY "Anyone can insert ai_events" ON ai_events FOR INSERT WITH CHECK (true);

-- Only admins can view ai_events
CREATE POLICY "Admins can view ai_events" ON ai_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Super Admin', 'Finance', 'Project Manager')
        )
    );

-- Only admins can view ai_alerts
CREATE POLICY "Admins can view ai_alerts" ON ai_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Super Admin', 'Finance', 'Project Manager')
        )
    );

-- Only admins can update ai_alerts (for resolving)
CREATE POLICY "Admins can update ai_alerts" ON ai_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Super Admin', 'Finance', 'Project Manager')
        )
    );

-- ============================================
-- FUNCTION: Log AI Event
-- Helper function to insert events from triggers
-- ============================================

CREATE OR REPLACE FUNCTION log_ai_event()
RETURNS TRIGGER AS $$
DECLARE
    r JSONB;
    pid BIGINT;
BEGIN
    -- Determine which record to use for data extraction
    r := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    
    -- Extract project_id (handles both project_id and projectId)
    pid := COALESCE((r->>'project_id'), (r->>'projectId'))::BIGINT;
    
    -- Special case for projects table itself
    IF TG_TABLE_NAME = 'projects' THEN
        pid := (r->>'id')::BIGINT;
    END IF;

    INSERT INTO ai_events (
        table_name,
        action,
        record_id,
        old_data,
        new_data,
        user_id,
        project_id
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        r->>'id', -- record_id as TEXT
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        COALESCE(current_setting('app.current_user_id', true), auth.uid()),
        pid
    );
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    -- Basic error handling to prevent blocking main transactions if AI logging fails
    RAISE WARNING 'AI Event Logging Failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTO-CLEAR OLD EVENTS
-- Keep only last 30 days of events
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_ai_events()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_events WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM ai_alerts WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup weekly (can be called by cron/supabase cron)
-- SELECT cleanup_old_ai_events();

-- ============================================
-- NOTIFICATION: Process new events
-- This will be called by the Edge Function
-- ============================================

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_ai_event() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_ai_events() TO authenticated;

-- Create a function to manually trigger AI analysis
CREATE OR REPLACE FUNCTION trigger_ai_analysis()
RETURNS void AS $$
BEGIN
    -- This function is a placeholder
    -- The actual analysis is done by the Edge Function
    -- which listens to new ai_events via database webhooks or polling
    RAISE NOTICE 'AI analysis triggered. Edge Function will process pending events.';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION trigger_ai_analysis() TO authenticated;
