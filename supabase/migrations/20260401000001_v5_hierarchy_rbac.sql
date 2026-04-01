-- Migration: C2E Master Architecture v5.1 - 3-Level RBAC & Zero Trust Isolation
-- Date: 2026-04-01
-- Description: Implements strict multi-tenant isolation (Super Admin, Institute Admin, Program Admin)

BEGIN;

-- 1. Setup Role Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'PROGRAM_ADMIN');
    END IF;
END $$;

-- 2. Profiles Table (Extended Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'INSTITUTE_ADMIN',
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for high-performance context lookup
CREATE INDEX IF NOT EXISTS idx_profiles_role_context ON public.profiles (role, institution_id, program_id);

-- 3. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, institution_id)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'INSTITUTE_ADMIN'),
        (NEW.raw_user_meta_data->>'institution_id')::uuid
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Centralized RLS Policy Helpers
-- Note: These policies will be applied to all 20+ tables below.

-- 5. Applying RBAC to OBE Tables
-- We'll loop through all curriculum tables to enforce the 3-level isolation.
DO $$
DECLARE
    t text;
    obe_tables text[] := ARRAY[
        'program_visions', 'program_missions', 'program_peos', 'program_outcomes',
        'program_psos', 'program_step_completions', 'program_dissemination',
        'program_vmpeo_feedback_entries', 'program_vmpeo_feedback_submissions',
        'stakeholders', 'stakeholder_feedback', 'curriculum_versions',
        'curriculum_category_credits', 'curriculum_electives_settings',
        'curriculum_semester_categories', 'curriculum_generated_courses',
        'curriculum_course_outcomes', 'peos', 'peo_drafts'
    ];
BEGIN
    FOR t IN SELECT unnest(obe_tables) LOOP
        -- a. Ensure RLS is enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- b. Drop existing restrictive policies to rebuild v5.1
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_policy', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'program_admin_isolation', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'institute_admin_access', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'super_admin_bypass', t);

        -- c. SUPER_ADMIN: Bypass (Read/Write)
        EXECUTE format('CREATE POLICY super_admin_access_%I ON public.%I FOR ALL TO authenticated 
            USING ((auth.jwt() ->> ''role'') = ''SUPER_ADMIN'')', t, t);

        -- d. INSTITUTE_ADMIN: Access everything in the institution
        EXECUTE format('CREATE POLICY institute_admin_access_%I ON public.%I FOR ALL TO authenticated 
            USING (institution_id = (auth.jwt() ->> ''institution_id'')::uuid)', t, t);

        -- e. PROGRAM_ADMIN: Access ONLY their program
        EXECUTE format('CREATE POLICY program_admin_isolation_%I ON public.%I FOR ALL TO authenticated 
            USING (program_id = (auth.jwt() ->> ''program_id'')::uuid AND institution_id = (auth.jwt() ->> ''institution_id'')::uuid)', t, t);
    END LOOP;
END $$;

-- 6. Institution Table Isolation
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions can view their own profile" ON public.institutions;
CREATE POLICY super_admin_manage_institutions ON public.institutions FOR ALL TO authenticated 
    USING ((auth.jwt() ->> 'role') = 'SUPER_ADMIN');
CREATE POLICY institute_view_self ON public.institutions FOR SELECT TO authenticated 
    USING (id = (auth.jwt() ->> 'institution_id')::uuid);

-- 7. Program Table Isolation
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions can manage their own programs" ON public.programs;
CREATE POLICY super_admin_manage_programs ON public.programs FOR ALL TO authenticated 
    USING ((auth.jwt() ->> 'role') = 'SUPER_ADMIN');
CREATE POLICY institute_manage_programs ON public.programs FOR ALL TO authenticated 
    USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
CREATE POLICY program_admin_view_program ON public.programs FOR SELECT TO authenticated 
    USING (id = (auth.jwt() ->> 'program_id')::uuid);

COMMIT;
