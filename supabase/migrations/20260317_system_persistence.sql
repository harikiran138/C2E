-- ============================================================
-- 20260317_system_persistence.sql
-- Alignment for dashboard completion tracking
-- ============================================================

-- 1) Audit Logs for tracking report generation and other events
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id  UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL, -- e.g., 'report_generated', 'dissemination_marked'
    details     JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  UUID REFERENCES public.institutions(id) ON DELETE SET NULL
);

-- 2) Dissemination tracking table
CREATE TABLE IF NOT EXISTS public.program_dissemination (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id    UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    disseminated_at TIMESTAMPTZ DEFAULT NOW(),
    channels      TEXT[] DEFAULT '{}',
    is_completed  BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT program_dissemination_unique UNIQUE (program_id)
);

-- 3) Standalone consistency matrix table
CREATE TABLE IF NOT EXISTS public.consistency_matrix (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id         UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    matrix_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_finalized       BOOLEAN DEFAULT FALSE,
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT consistency_matrix_unique UNIQUE (program_id)
);

-- 4) RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage audit logs" ON public.audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = audit_logs.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.program_dissemination ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage dissemination" ON public.program_dissemination FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = program_dissemination.program_id AND public.programs.institution_id = auth.uid()));

ALTER TABLE public.consistency_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions manage consistency matrix" ON public.consistency_matrix FOR ALL
    USING (EXISTS (SELECT 1 FROM public.programs WHERE public.programs.id = consistency_matrix.program_id AND public.programs.institution_id = auth.uid()));

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_program ON public.audit_logs(program_id);
CREATE INDEX IF NOT EXISTS idx_program_dissemination_program ON public.program_dissemination(program_id);
CREATE INDEX IF NOT EXISTS idx_consistency_matrix_program ON public.consistency_matrix(program_id);
