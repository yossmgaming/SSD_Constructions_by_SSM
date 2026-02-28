-- ============================================
-- AI INTERACTION LOGS
-- Every AI response is logged for audit trail
-- ============================================

CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Info
    user_id UUID,
    user_role TEXT,
    
    -- Request
    user_question TEXT NOT NULL,
    input_normalized TEXT, -- Normalized/stemmed input for audit
    intent_type TEXT, -- info, diagnostic, simulation, audit
    is_simulation BOOLEAN DEFAULT false,
    simulation_params JSONB,
    
    -- Context
    snapshot_version TEXT,
    snapshot_id UUID,
    
    -- Response Summary
    response_summary TEXT,
    recommendations JSONB,
    risk_score INTEGER,
    priority_score INTEGER,
    
    -- Confidence
    confidence_level INTEGER,
    confidence_factors JSONB,
    confidence_delta INTEGER, -- Confidence drop for simulations
    
    -- Validation (for post-mortem)
    claims_extracted JSONB,
    validation_result JSONB,
    
    -- Metadata
    response_time_ms INTEGER,
    topics_covered JSONB,
    conflict_detected BOOLEAN DEFAULT false,
    conflict_details JSONB,
    derived_metrics JSONB, -- Extracted implicit assumptions
    
    -- Follow-up (for learning)
    user_feedback TEXT, -- positive, negative, ignored
    user_action_taken TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_interaction_user ON ai_interaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_date ON ai_interaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_intent ON ai_interaction_logs(intent_type);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_risk ON ai_interaction_logs(risk_score DESC);

-- RLS
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (AI logs)
CREATE POLICY "AI can insert logs" ON ai_interaction_logs FOR INSERT WITH CHECK (true);

-- Admins can read
CREATE POLICY "Admins can read logs" ON ai_interaction_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Super Admin', 'Finance', 'Project Manager')
        )
    );

-- ============================================
-- SIMULATION SCENARIOS CONFIGURATION
-- Predefined scenarios for calculations
-- ============================================

CREATE TABLE IF NOT EXISTS ai_simulation_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    scenario_type TEXT NOT NULL UNIQUE,
    scenario_name TEXT NOT NULL,
    description TEXT,
    
    -- Calculation Parameters
    base_cost_field TEXT, -- DB field to use
    cost_per_unit DECIMAL(10,2),
    monthly_cost_field TEXT,
    annual_cost_multiplier DECIMAL(5,2) DEFAULT 12,
    
    -- Impact Factors
    productivity_impact DECIMAL(5,2), -- per unit added
    capacity_impact DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scenarios
INSERT INTO ai_simulation_scenarios (scenario_type, scenario_name, description, base_cost_field, cost_per_unit, annual_cost_multiplier, productivity_impact, capacity_impact) VALUES
('hire_worker', 'Hire Workers', 'Add workers to workforce', 'dailyRate', 3500, 12, 1.0, 1.0),
('hire_supervisor', 'Hire Supervisors', 'Add supervisors to workforce', 'supervisor_salary', 150000, 12, 5.0, 10.0),
('new_project', 'New Project', 'Start new construction project', 'estimated_cost', 1000000, 1, 0, -20.0),
('cash_projection', 'Cash Flow Projection', 'Project future cash position', 'cash_balance', 1, 1, 0, 0),
('material_overuse', 'Material Overuse', 'Analyze material variance', 'variance_threshold', 10, 1, -2.0, 0)
ON CONFLICT (scenario_type) DO NOTHING;

-- ============================================
-- RISK THRESHOLDS CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS ai_risk_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    risk_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    
    -- Threshold values
    low_threshold DECIMAL(5,2),    -- 0-30: Green
    medium_threshold DECIMAL(5,2), -- 31-60: Orange
    high_threshold DECIMAL(5,2),  -- 61-100: Red
    
    weight DECIMAL(3,2) DEFAULT 0.20, -- Weight in formula
    
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(risk_type, metric_name)
);

-- Insert default thresholds
INSERT INTO ai_risk_thresholds (risk_type, metric_name, low_threshold, medium_threshold, high_threshold, weight) VALUES
('alert', 'alertSeverity', 1, 3, 5, 0.30),
('budget', 'budgetVariance', 5, 15, 25, 0.30),
('schedule', 'daysOverdue', 7, 14, 30, 0.20),
('attendance', 'attendanceGap', 5, 15, 25, 0.20)
ON CONFLICT DO NOTHING;

-- ============================================
-- INTENT CLASSIFICATION RULES
-- ============================================

CREATE TABLE IF NOT EXISTS ai_intent_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    intent_type TEXT NOT NULL, -- info, diagnostic, simulation, audit
    pattern_keyword TEXT NOT NULL,
    pattern_regex TEXT,
    priority INTEGER DEFAULT 1,
    
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(intent_type, pattern_keyword)
);

-- Insert intent patterns
INSERT INTO ai_intent_patterns (intent_type, pattern_keyword, priority) VALUES
('info', 'what is', 1),
('info', 'show me', 1),
('info', 'how much', 1),
('info', 'current', 1),
('info', 'total', 1),
('info', 'balance', 1),
('diagnostic', 'why', 1),
('diagnostic', 'reason', 1),
('diagnostic', 'caused by', 1),
('diagnostic', 'explain', 1),
('diagnostic', 'what happened', 1),
('simulation', 'if we', 1),
('simulation', 'assume', 1),
('simulation', 'what if', 1),
('simulation', 'suppose', 1),
('simulation', 'hypothetically', 1),
('simulation', 'could we', 1),
('simulation', 'should we', 1),
('audit', 'who', 1),
('audit', 'approved', 1),
('audit', 'authorized', 1),
('audit', 'permission', 1)
ON CONFLICT DO NOTHING;

-- Grant permissions for authenticated users
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
