-- ============================================================
-- 20260307_curriculum_tables.sql
-- Curriculum core tables, CO mapping, and versioning
-- ============================================================

-- 1. curriculum_versions (must come first — other tables FK to it)
CREATE TABLE IF NOT EXISTS public.curriculum_versions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id      UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    version         TEXT NOT NULL,
    year            INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'archived')),
    regulation_name TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_versions_unique UNIQUE (program_id, version)
);

-- 2. curriculum_category_credits
CREATE TABLE IF NOT EXISTS public.curriculum_category_credits (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id      UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    category_code   TEXT NOT NULL,
    design_percent  NUMERIC(5,2) DEFAULT 0,
    credit          NUMERIC(6,2) DEFAULT 0,
    courses_t       INTEGER DEFAULT 0,
    courses_p       INTEGER DEFAULT 0,
    courses_tu      INTEGER DEFAULT 0,
    courses_ll      INTEGER DEFAULT 0,
    hours_ci        INTEGER DEFAULT 0,
    hours_t         INTEGER DEFAULT 0,
    hours_li        INTEGER DEFAULT 0,
    hours_twd       INTEGER DEFAULT 0,
    hours_total     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_category_credits_unique UNIQUE (program_id, category_code)
);

-- 3. curriculum_electives_settings
CREATE TABLE IF NOT EXISTS public.curriculum_electives_settings (
    id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id                  UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    conventional_elective       TEXT DEFAULT 'None',
    trans_disciplinary_elective TEXT DEFAULT 'None',
    total_credits               INTEGER DEFAULT 0,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_electives_settings_unique UNIQUE (program_id)
);

-- 4. curriculum_semester_categories
CREATE TABLE IF NOT EXISTS public.curriculum_semester_categories (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id      UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    semester        TEXT NOT NULL,
    no_of_credits   INTEGER DEFAULT 0,
    courses_bs      INTEGER DEFAULT 0,
    courses_es      INTEGER DEFAULT 0,
    courses_hss     INTEGER DEFAULT 0,
    courses_pc      INTEGER DEFAULT 0,
    courses_oe      INTEGER DEFAULT 0,
    courses_mc      INTEGER DEFAULT 0,
    courses_ae      INTEGER DEFAULT 0,
    courses_se      INTEGER DEFAULT 0,
    courses_int     INTEGER DEFAULT 0,
    courses_pro     INTEGER DEFAULT 0,
    courses_others  INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_semester_categories_unique UNIQUE (program_id, semester)
);

-- 5. curriculum_generated_courses
CREATE TABLE IF NOT EXISTS public.curriculum_generated_courses (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id      UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    version_id      UUID REFERENCES public.curriculum_versions(id) ON DELETE SET NULL,
    semester        INTEGER NOT NULL,
    category_code   TEXT NOT NULL,
    course_code     TEXT NOT NULL,
    course_title    TEXT NOT NULL,
    credits         INTEGER NOT NULL,
    t_hours         INTEGER DEFAULT 0,
    tu_hours        INTEGER DEFAULT 0,
    ll_hours        INTEGER DEFAULT 0,
    tw_hours        INTEGER DEFAULT 0,
    total_hours     INTEGER DEFAULT 0,
    curriculum_mode TEXT DEFAULT 'AICTE_MODEL',
    generated_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. curriculum_course_outcomes
CREATE TABLE IF NOT EXISTS public.curriculum_course_outcomes (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id  UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT,
    co_number   INTEGER NOT NULL,
    co_code     TEXT NOT NULL,
    statement   TEXT NOT NULL,
    rbt_level   TEXT,
    po_mapping  INTEGER[] DEFAULT '{}',
    pso_mapping INTEGER[] DEFAULT '{}',
    strength    TEXT CHECK (strength IN ('1','2','3')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_course_outcomes_unique UNIQUE (program_id, course_code, co_number)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_curriculum_versions_program ON public.curriculum_versions (program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_category_credits_program ON public.curriculum_category_credits (program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_electives_settings_program ON public.curriculum_electives_settings (program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_semester_categories_program ON public.curriculum_semester_categories (program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_generated_courses_program ON public.curriculum_generated_courses (program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_generated_courses_semester ON public.curriculum_generated_courses (program_id, semester);
CREATE INDEX IF NOT EXISTS idx_curriculum_course_outcomes_program ON public.curriculum_course_outcomes (program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_course_outcomes_course ON public.curriculum_course_outcomes (program_id, course_code);

-- RLS POLICIES
ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage curriculum_versions" ON public.curriculum_versions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_versions.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.curriculum_category_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage curriculum_category_credits" ON public.curriculum_category_credits FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_category_credits.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.curriculum_electives_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage curriculum_electives_settings" ON public.curriculum_electives_settings FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_electives_settings.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.curriculum_semester_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage curriculum_semester_categories" ON public.curriculum_semester_categories FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_semester_categories.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.curriculum_generated_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage curriculum_generated_courses" ON public.curriculum_generated_courses FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_generated_courses.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.curriculum_course_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage curriculum_course_outcomes" ON public.curriculum_course_outcomes FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = curriculum_course_outcomes.program_id AND public.programs.institution_id = auth.uid()));
