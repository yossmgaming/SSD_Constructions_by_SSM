-- Company Holidays Table
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view holidays" ON public.holidays;
CREATE POLICY "Anyone can view holidays" ON public.holidays FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
CREATE POLICY "Admins can manage holidays" ON public.holidays FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('Super Admin', 'Finance')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('Super Admin', 'Finance')
    )
);

-- Grant permissions
GRANT ALL ON public.holidays TO authenticated, anon, service_role;

-- Insert Sri Lanka 2026 holidays (sample data)
INSERT INTO public.holidays (name, date, is_recurring, description) VALUES
('New Year''s Day', '2026-01-01', true, 'January 1st'),
('National Day', '2026-02-04', true, 'Independence Day'),
('Mahashivratri', '2026-02-15', false, 'Hindu Festival'),
('Dayananda Sri Daham Handapana', '2026-03-07', false, 'Full Moon Poya Day'),
('Sinhala & Hindu New Year', '2026-04-13', true, 'Sinhala and Hindu New Year'),
('Sinhala & Hindu New Year', '2026-04-14', true, 'Sinhala and Hindu New Year'),
('Good Friday', '2026-04-03', false, 'Christian Holiday'),
('Madin Poya Day', '2026-04-06', false, 'Full Moon Poya Day'),
('Vesak Poya Day', '2026-05-06', false, 'Full Moon Poya Day - Buddha Purnima'),
('Labour Day', '2026-05-01', true, 'International Workers Day'),
('Poson Poya Day', '2026-06-05', false, 'Full Moon Poya Day'),
('Eid al-Fitr', '2026-03-21', false, 'Ramadan Festival'),
('Eid al-Adha', '2026-07-10', false, ' Hajj Festival'),
('Esala Poya Day', '2026-07-04', false, 'Full Moon Poya Day'),
('Nikini Poya Day', '2026-08-03', false, 'Full Moon Poya Day'),
('Sri Jayawardenepura Kandy Esala Perahera', '2026-08-12', false, 'Kandy Esala Perahera'),
('St. Mary''s Feast', '2026-08-15', false, 'Christian Festival'),
('Binara Poya Day', '2026-09-01', false, 'Full Moon Poya Day'),
('Vap Full Moon Poya Day', '2026-10-01', false, 'Full Moon Poya Day'),
('Deepavali', '2026-10-20', false, 'Hindu Festival of Lights'),
('Milag season', '2026-11-02', false, 'All Souls Day'),
('Uduvap Poya Day', '2026-10-31', false, 'Full Moon Poya Day'),
('Christmas Day', '2026-12-25', true, 'Christmas'),
('Bank Holiday', '2026-12-31', true, 'Year End');
