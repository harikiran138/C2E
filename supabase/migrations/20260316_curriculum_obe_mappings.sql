-- ============================================================
-- 20260316_curriculum_obe_mappings.sql
-- Store course-level OBE identifying mappings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.curriculum_obe_mappings (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id      UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    curriculum_id   UUID REFERENCES public.curriculums(id) ON DELETE CASCADE,
    course_code     TEXT NOT NULL,
    is_obe_core     BOOLEAN DEFAULT FALSE,
    category_override TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT curriculum_obe_mappings_unique UNIQUE (program_id, curriculum_id, course_code)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_curriculum_obe_mappings_program ON public.curriculum_obe_mappings(program_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_obe_mappings_curriculum ON public.curriculum_obe_mappings(curriculum_id);

-- RLS
ALTER TABLE public.curriculum_obe_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutions manage curriculum_obe_mappings" ON public.curriculum_obe_mappings;
CREATE POLICY "Institutions manage curriculum_obe_mappings" ON public.curriculum_obe_mappings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.programs 
        WHERE public.programs.id = curriculum_obe_mappings.program_id 
        AND public.programs.institution_id = auth.uid()
    ));
