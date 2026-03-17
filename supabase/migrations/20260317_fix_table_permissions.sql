-- ============================================================
-- 20260317_fix_table_permissions.sql
-- Restore permissions for Supabase roles after schema changes
-- ============================================================

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on all existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on all existing sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure future tables/sequences also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Specifically ensure these important tables are accessible
GRANT ALL ON public.programs TO anon, authenticated, service_role;
GRANT ALL ON public.curriculums TO anon, authenticated, service_role;
GRANT ALL ON public.curriculum_generated_courses TO anon, authenticated, service_role;
GRANT ALL ON public.curriculum_category_credits TO anon, authenticated, service_role;
GRANT ALL ON public.curriculum_electives_settings TO anon, authenticated, service_role;
GRANT ALL ON public.curriculum_semester_categories TO anon, authenticated, service_role;
