-- ==============================================================================
-- 🚀 PHASE 1 Foundation Database Migrations
-- This script creates the core infrastructure tables for role-based features.
-- ==============================================================================

-- 1. MESSAGES (Direct & Project-based communication)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Null if project-wide
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE, -- Context
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DOCUMENTS (Secure file sharing & vault)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size_kb INTEGER,
    shared_roles TEXT[], -- e.g., ['Client', 'Project Manager']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. NOTIFICATIONS (System alerts & updates)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link TEXT, -- Internal app routing link (e.g., /dashboard/messages)
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DAILY REPORTS (Site operations logs)
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weather_condition VARCHAR(100),
    workers_count INTEGER DEFAULT 0,
    work_accomplished TEXT NOT NULL,
    issues_blockers TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. QUALITY CHECKLISTS (QA / QC)
CREATE TABLE IF NOT EXISTS public.quality_checklists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Passed', 'Failed', 'Needs Rework')),
    notes TEXT,
    inspection_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LEAVE REQUESTS (HR / Payroll integration)
-- Links to workers table since it's worker-specific
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id INTEGER REFERENCES public.workers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ORDERS (Supply Chain - material procurement)
-- Links to suppliers table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supplier_id INTEGER REFERENCES public.suppliers(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit VARCHAR(50),
    expected_delivery DATE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. INCIDENTS (Site Safety & Reporting)
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'Low' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Reported' CHECK (status IN ('Reported', 'Processing', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. PROJECT TASKS (For Gantt/Timeline view)
CREATE TABLE IF NOT EXISTS public.project_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Delayed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. CHANGE ORDERS
CREATE TABLE IF NOT EXISTS public.change_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cost_impact NUMERIC(10, 2) DEFAULT 0.00,
    time_impact_days INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. SUBCONTRACTOR CLAIMS
CREATE TABLE IF NOT EXISTS public.subcontractor_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_subcontractor_id BIGINT REFERENCES public.project_subcontractors(id) ON DELETE CASCADE,
    subcontractor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    percentage_claimed INTEGER NOT NULL CHECK (percentage_claimed > 0 AND percentage_claimed <= 100),
    amount_claimed NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Draft - to be refined in Security hardening phase)
-- We enable RLS on all these new tables for defense-in-depth

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Note: The actual policies will be written during Phase 6 when we rigorously audit RLS.
-- For now, Super Admins need full access to operate.

-- Example admin bypass for fast setup:
CREATE POLICY "Admin bypass messages" ON public.messages USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass documents" ON public.documents USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass notifications" ON public.notifications USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass daily_reports" ON public.daily_reports USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager', 'Supervisor')));
CREATE POLICY "Admin bypass quality_checklists" ON public.quality_checklists USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager', 'Supervisor')));
CREATE POLICY "Admin bypass leave_requests" ON public.leave_requests USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass orders" ON public.orders USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass incidents" ON public.incidents USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager', 'Supervisor')));
CREATE POLICY "Admin bypass project_tasks" ON public.project_tasks USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass change_orders" ON public.change_orders USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager')));
CREATE POLICY "Admin bypass subcontractor_claims" ON public.subcontractor_claims USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Project Manager', 'Finance Manager')));

-- User level logic for notifications/messages
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Inform output
SELECT 'Phase 1 Foundation Tables created successfully.' as status;
