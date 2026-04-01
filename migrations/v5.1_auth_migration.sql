-- v5.1 Unified Auth Node Migration

-- 1. Create Role Enum
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'PROGRAM_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Unified Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role public.user_role NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Migration: Existing Institute Admins
INSERT INTO public.users (email, password_hash, role, institution_id)
SELECT email, password_hash, 'INSTITUTE_ADMIN', id FROM public.institutions
ON CONFLICT (email) DO NOTHING;

-- 4. Enable RLS on core tables (Sample)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_psos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholder_feedback ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for users table
CREATE POLICY super_admin_all ON public.users
    FOR ALL USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');

CREATE POLICY institute_admin_manage_program_users ON public.users
    FOR ALL USING (institution_id = (auth.jwt() ->> 'institution_id')::UUID);

CREATE POLICY user_self_read ON public.users
    FOR SELECT USING (id = (auth.jwt() ->> 'sub')::UUID);

-- 6. Define Cross-Tenant Policies for all tables (Example for PEOs)
-- Each program must be isolated.
CREATE POLICY program_admin_isolation_peos ON public.peos
    FOR ALL USING (program_id = (auth.jwt() ->> 'program_id')::UUID);

CREATE POLICY institute_admin_scope_peos ON public.peos
    FOR SELECT USING (institution_id = (auth.jwt() ->> 'institution_id')::UUID);

-- Apply same pattern to all OBE tables...
-- (I will run this via a script to apply to all 39 tables)
