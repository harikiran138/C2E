-- ============================================================
-- 20260307_obe_accreditation_expansion.sql
-- OBE accreditation expansion:
-- - curriculum master table
-- - normalized CO/PO/PSO mappings
-- - CO & PO attainment
-- - continuous improvement tracking
-- - syllabus generation persistence
-- - approval workflow fields
-- ============================================================

-- 1) Curriculum master entity
CREATE TABLE IF NOT EXISTS public.curriculums (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id       UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    regulation_year  INTEGER NOT NULL,
    version          TEXT NOT NULL,
    total_credits    INTEGER,
    approval_status  TEXT NOT NULL DEFAULT 'draft'
                         CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    approved_by      UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    approved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculums_unique UNIQUE (program_id, regulation_year, version)
);

-- 2) Add curriculum reference + approval fields to existing curriculum artifacts
ALTER TABLE public.curriculum_generated_courses
    ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.curriculum_course_outcomes
    ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 3) Normalized CO-PO mapping table
CREATE TABLE IF NOT EXISTS public.co_po_mapping (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id     UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id  UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    course_id      UUID REFERENCES public.curriculum_generated_courses(id) ON DELETE SET NULL,
    co_id          UUID REFERENCES public.curriculum_course_outcomes(id) ON DELETE CASCADE,
    course_code    TEXT NOT NULL,
    co_code        TEXT NOT NULL,
    po_id          INTEGER NOT NULL CHECK (po_id BETWEEN 1 AND 12),
    strength       INTEGER NOT NULL CHECK (strength IN (1, 2, 3)),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT co_po_mapping_unique UNIQUE (program_id, curriculum_id, course_code, co_code, po_id)
);

-- 4) Normalized CO-PSO mapping table
CREATE TABLE IF NOT EXISTS public.co_pso_mapping (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id     UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id  UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    course_id      UUID REFERENCES public.curriculum_generated_courses(id) ON DELETE SET NULL,
    co_id          UUID REFERENCES public.curriculum_course_outcomes(id) ON DELETE CASCADE,
    course_code    TEXT NOT NULL,
    co_code        TEXT NOT NULL,
    pso_id         INTEGER NOT NULL CHECK (pso_id BETWEEN 1 AND 3),
    strength       INTEGER NOT NULL CHECK (strength IN (1, 2, 3)),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT co_pso_mapping_unique UNIQUE (program_id, curriculum_id, course_code, co_code, pso_id)
);

-- 5) CO attainment table
CREATE TABLE IF NOT EXISTS public.co_attainment (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id           UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id        UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    course_id            UUID REFERENCES public.curriculum_generated_courses(id) ON DELETE SET NULL,
    co_id                UUID REFERENCES public.curriculum_course_outcomes(id) ON DELETE SET NULL,
    course_code          TEXT NOT NULL,
    co_code              TEXT NOT NULL,
    internal_score       NUMERIC(6,2) NOT NULL CHECK (internal_score >= 0),
    external_score       NUMERIC(6,2) NOT NULL CHECK (external_score >= 0),
    calculated_attainment NUMERIC(6,2) NOT NULL CHECK (calculated_attainment >= 0),
    academic_year        TEXT NOT NULL,
    approval_status      TEXT NOT NULL DEFAULT 'draft'
                           CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    approved_by          UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT co_attainment_unique UNIQUE (program_id, curriculum_id, course_code, co_code, academic_year)
);

-- 6) PO attainment table
CREATE TABLE IF NOT EXISTS public.po_attainment (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id        UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id     UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    po_id             INTEGER NOT NULL CHECK (po_id BETWEEN 1 AND 12),
    attainment_value  NUMERIC(8,2) NOT NULL CHECK (attainment_value >= 0),
    academic_year     TEXT NOT NULL,
    approval_status   TEXT NOT NULL DEFAULT 'draft'
                        CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    approved_by       UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    approved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT po_attainment_unique UNIQUE (program_id, curriculum_id, po_id, academic_year)
);

-- 7) Continuous improvement records
CREATE TABLE IF NOT EXISTS public.continuous_improvement (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id        UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id     UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    po_id             INTEGER NOT NULL CHECK (po_id BETWEEN 1 AND 12),
    issue_identified  TEXT NOT NULL,
    action_taken      TEXT NOT NULL,
    next_cycle_plan   TEXT,
    academic_year     TEXT NOT NULL,
    approval_status   TEXT NOT NULL DEFAULT 'draft'
                        CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    approved_by       UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    approved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 8) Course syllabus
CREATE TABLE IF NOT EXISTS public.course_syllabus (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id         UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id      UUID REFERENCES public.curriculums(id) ON DELETE SET NULL,
    course_id          UUID REFERENCES public.curriculum_generated_courses(id) ON DELETE SET NULL,
    course_code        TEXT NOT NULL,
    course_title       TEXT NOT NULL,
    credits            INTEGER,
    hours              INTEGER,
    prerequisites      TEXT[] DEFAULT '{}',
    course_description TEXT,
    course_outcomes    JSONB DEFAULT '[]'::jsonb,
    unit_wise_syllabus JSONB DEFAULT '[]'::jsonb,
    textbooks          TEXT[] DEFAULT '{}',
    reference_books    TEXT[] DEFAULT '{}',
    evaluation_scheme  JSONB DEFAULT '{}'::jsonb,
    generated_by       TEXT DEFAULT 'ai',
    approval_status    TEXT NOT NULL DEFAULT 'draft'
                         CHECK (approval_status IN ('draft', 'faculty_review', 'hod_approved', 'rejected')),
    approved_by        UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    approved_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT course_syllabus_unique UNIQUE (program_id, curriculum_id, course_code)
);

-- 9) Stakeholder feedback linkage for curriculum/PEO improvements
ALTER TABLE public.stakeholder_feedback
    ADD COLUMN IF NOT EXISTS peo_relevance_score NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS curriculum_relevance_score NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT;

-- 10) Indexes
CREATE INDEX IF NOT EXISTS idx_curriculums_program ON public.curriculums(program_id);
CREATE INDEX IF NOT EXISTS idx_curriculums_year ON public.curriculums(program_id, regulation_year);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_program ON public.co_po_mapping(program_id);
CREATE INDEX IF NOT EXISTS idx_co_pso_mapping_program ON public.co_pso_mapping(program_id);
CREATE INDEX IF NOT EXISTS idx_co_attainment_program_year ON public.co_attainment(program_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_po_attainment_program_year ON public.po_attainment(program_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_continuous_improvement_program ON public.continuous_improvement(program_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_course_syllabus_program ON public.course_syllabus(program_id);

-- 11) Row-level security policies
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage curriculums" ON public.curriculums;
CREATE POLICY "Institutions manage curriculums" ON public.curriculums FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculums.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.co_po_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage co_po_mapping" ON public.co_po_mapping;
CREATE POLICY "Institutions manage co_po_mapping" ON public.co_po_mapping FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = co_po_mapping.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.co_pso_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage co_pso_mapping" ON public.co_pso_mapping;
CREATE POLICY "Institutions manage co_pso_mapping" ON public.co_pso_mapping FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = co_pso_mapping.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.co_attainment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage co_attainment" ON public.co_attainment;
CREATE POLICY "Institutions manage co_attainment" ON public.co_attainment FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = co_attainment.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.po_attainment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage po_attainment" ON public.po_attainment;
CREATE POLICY "Institutions manage po_attainment" ON public.po_attainment FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = po_attainment.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.continuous_improvement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage continuous_improvement" ON public.continuous_improvement;
CREATE POLICY "Institutions manage continuous_improvement" ON public.continuous_improvement FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = continuous_improvement.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.course_syllabus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions manage course_syllabus" ON public.course_syllabus;
CREATE POLICY "Institutions manage course_syllabus" ON public.course_syllabus FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = course_syllabus.program_id AND public.programs.institution_id = auth.uid()));
