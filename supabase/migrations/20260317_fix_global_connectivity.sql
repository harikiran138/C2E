-- ============================================================
-- 20260317_fix_global_connectivity.sql
-- (Final Verified Version)
-- ============================================================

-- 1. Academic Council Table
CREATE TABLE IF NOT EXISTS public.academic_council (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id    UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    member_name       TEXT NOT NULL,
    member_id         TEXT,
    organization      TEXT,
    email             TEXT,
    mobile_number     TEXT,
    specialisation    TEXT,
    category          TEXT,
    communicate       BOOLEAN DEFAULT FALSE,
    tenure_start_date DATE,
    tenure_end_date   DATE,
    linkedin_id       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on core tables
ALTER TABLE public.academic_council ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_peos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_psos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bos_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Set standard policies

DO $$ BEGIN
    -- academic_council
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage academic council' AND tablename = 'academic_council') THEN
        CREATE POLICY "Institutions manage academic council" ON public.academic_council FOR ALL USING (auth.uid() = institution_id);
    END IF;
    
    -- institution_details
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage details' AND tablename = 'institution_details') THEN
        CREATE POLICY "Institutions manage details" ON public.institution_details FOR ALL USING (auth.uid() = institution_id);
    END IF;
    
    -- dashboard_preferences
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage preferences' AND tablename = 'dashboard_preferences') THEN
        CREATE POLICY "Institutions manage preferences" ON public.dashboard_preferences FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- program-linked tables
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage program visions' AND tablename = 'program_visions') THEN
        CREATE POLICY "Institutions manage program visions" ON public.program_visions FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = program_visions.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage program missions' AND tablename = 'program_missions') THEN
        CREATE POLICY "Institutions manage program missions" ON public.program_missions FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = program_missions.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage program peos' AND tablename = 'program_peos') THEN
        CREATE POLICY "Institutions manage program peos" ON public.program_peos FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = program_peos.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage program outcomes' AND tablename = 'program_outcomes') THEN
        CREATE POLICY "Institutions manage program outcomes" ON public.program_outcomes FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = program_outcomes.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage program psos' AND tablename = 'program_psos') THEN
        CREATE POLICY "Institutions manage program psos" ON public.program_psos FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = program_psos.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage pac members' AND tablename = 'pac_members') THEN
        CREATE POLICY "Institutions manage pac members" ON public.pac_members FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = pac_members.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage bos members' AND tablename = 'bos_members') THEN
        CREATE POLICY "Institutions manage bos members" ON public.bos_members FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = bos_members.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage representative stakeholders' AND tablename = 'representative_stakeholders') THEN
        CREATE POLICY "Institutions manage representative stakeholders" ON public.representative_stakeholders FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = representative_stakeholders.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage curriculum feedback' AND tablename = 'curriculum_feedback') THEN
        CREATE POLICY "Institutions manage curriculum feedback" ON public.curriculum_feedback FOR ALL USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_feedback.program_id AND public.programs.institution_id = auth.uid()));
    END IF;
END $$;

-- 4. Final Grants verification
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
