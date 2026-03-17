-- ============================================================
-- 20260317_curriculum_feedback.sql
-- Curriculum feedback tracking and member communication updates
-- (Revised for existing tables)
-- ============================================================

-- 1) Member tables updates
-- Ensure tables exist in case they weren't created by scripts
CREATE TABLE IF NOT EXISTS public.pac_members (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id        UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    member_name       TEXT NOT NULL,
    member_id         TEXT,
    organization      TEXT,
    email             TEXT,
    mobile_number     TEXT,
    specialisation    TEXT,
    category          TEXT,
    tenure_start_date DATE,
    tenure_end_date   DATE,
    linkedin_id       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bos_members (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id        UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    member_name       TEXT NOT NULL,
    member_id         TEXT,
    organization      TEXT,
    email             TEXT,
    mobile_number     TEXT,
    specialisation    TEXT,
    category          TEXT,
    tenure_start_date DATE,
    tenure_end_date   DATE,
    linkedin_id       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pac_members ADD COLUMN IF NOT EXISTS communicate TEXT;
ALTER TABLE public.bos_members ADD COLUMN IF NOT EXISTS communicate TEXT;

-- 2) Programs table updates
ALTER TABLE public.programs 
    ADD COLUMN IF NOT EXISTS curriculum_feedback_start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS curriculum_feedback_end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS curriculum_feedback_status TEXT DEFAULT 'pending'
        CHECK (curriculum_feedback_status IN ('pending', 'in_progress', 'completed', 'verified'));

-- 3) Curriculum Feedback table updates
CREATE TABLE IF NOT EXISTS public.curriculum_feedback (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id     UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    submitted_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all requested columns exist
ALTER TABLE public.curriculum_feedback ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE CASCADE;
ALTER TABLE public.curriculum_feedback ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.curriculum_feedback ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.curriculum_feedback ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Migration of old data if exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curriculum_feedback' AND column_name='feedback_text') THEN
        UPDATE public.curriculum_feedback SET comments = feedback_text WHERE comments IS NULL;
    END IF;
END $$;

-- 4) Enable RLS
ALTER TABLE public.pac_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bos_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_feedback ENABLE ROW LEVEL SECURITY;

-- 5) Set Standard Policies
DO $$ BEGIN
    -- pac_members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage pac members' AND tablename = 'pac_members') THEN
        CREATE POLICY "Institutions manage pac members" ON public.pac_members FOR ALL
            USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = pac_members.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    -- bos_members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage bos members' AND tablename = 'bos_members') THEN
        CREATE POLICY "Institutions manage bos members" ON public.bos_members FOR ALL
            USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = bos_members.program_id AND public.programs.institution_id = auth.uid()));
    END IF;

    -- curriculum_feedback
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Institutions manage curriculum feedback' AND tablename = 'curriculum_feedback') THEN
        CREATE POLICY "Institutions manage curriculum feedback" ON public.curriculum_feedback FOR ALL
            USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_feedback.program_id AND public.programs.institution_id = auth.uid()));
    END IF;
END $$;

-- 6) Grant access to roles
GRANT ALL ON public.pac_members TO anon, authenticated, service_role;
GRANT ALL ON public.bos_members TO anon, authenticated, service_role;
GRANT ALL ON public.curriculum_feedback TO anon, authenticated, service_role;

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_pac_members_program ON public.pac_members(program_id);
CREATE INDEX IF NOT EXISTS idx_bos_members_program ON public.bos_members(program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_feedback_program ON public.curriculum_feedback(program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_feedback_stakeholder ON public.curriculum_feedback(stakeholder_id);
