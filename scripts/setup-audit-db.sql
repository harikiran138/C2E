-- Master Setup Script for Security Audit
BEGIN;

-- 1. Ensure institution_id on all curriculum tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'program_visions', 'program_missions', 'program_peos', 'program_outcomes',
        'program_psos', 'program_step_completions', 'program_dissemination',
        'program_vmpeo_feedback_entries', 'program_vmpeo_feedback_submissions',
        'stakeholders', 'stakeholder_feedback', 'curriculum_versions',
        'curriculum_category_credits', 'curriculum_electives_settings',
        'curriculum_semester_categories', 'curriculum_generated_courses',
        'curriculum_course_outcomes', 'peos', 'peo_drafts'
    ]) LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'institution_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE', t);
        END IF;
    END LOOP;
END $$;

-- 2. Setup Profiles table properly
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'PROGRAM_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'PROGRAM_ADMIN')),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 0. Mock Functions for RLS (Bypasses Supabase auth schema restrictions)
CREATE OR REPLACE FUNCTION public.mock_jwt() RETURNS jsonb AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb;
$$ LANGUAGE sql STABLE;

-- 3. Enable RLS on all relevant tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_psos ENABLE ROW LEVEL SECURITY;

-- 4. Apply Policies (Simplified for seeding, will be fully tested in Audit)
-- Super Admin Policy
DROP POLICY IF EXISTS "super_admin_all" ON public.institutions;
CREATE POLICY "super_admin_all" ON public.institutions FOR ALL TO authenticated 
    USING ((public.mock_jwt() ->> 'role') = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "super_admin_all" ON public.programs;
CREATE POLICY "super_admin_all" ON public.programs FOR ALL TO authenticated 
    USING ((public.mock_jwt() ->> 'role') = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "super_admin_all" ON public.program_psos;
CREATE POLICY "super_admin_all" ON public.program_psos FOR ALL TO authenticated 
    USING ((public.mock_jwt() ->> 'role') = 'SUPER_ADMIN');

-- Institution Admin Policy
DROP POLICY IF EXISTS "institute_admin_access" ON public.programs;
CREATE POLICY "institute_admin_access" ON public.programs FOR ALL TO authenticated 
    USING (institution_id = (public.mock_jwt() ->> 'institution_id')::uuid);

DROP POLICY IF EXISTS "institute_admin_access" ON public.program_psos;
CREATE POLICY "institute_admin_access" ON public.program_psos FOR ALL TO authenticated 
    USING (institution_id = (public.mock_jwt() ->> 'institution_id')::uuid);

-- Program Admin Policy
DROP POLICY IF EXISTS "program_admin_access" ON public.program_psos;
CREATE POLICY "program_admin_access" ON public.program_psos FOR ALL TO authenticated 
    USING (
        institution_id = (public.mock_jwt() ->> 'institution_id')::uuid AND 
        program_id = (public.mock_jwt() ->> 'program_id')::uuid
    );

COMMIT;
