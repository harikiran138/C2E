-- Stakeholder Feedback Module: VMPEO feedback, stakeholder auth, and reporting controls
-- Date: 2026-02-26

-- 1) Extend representative stakeholders for controlled external login
ALTER TABLE public.representative_stakeholders
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS login_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rep_stakeholders_program_member_id_unique
  ON public.representative_stakeholders (program_id, LOWER(member_id))
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rep_stakeholders_program_approved
  ON public.representative_stakeholders (program_id, is_approved);

-- 2) Program-level timeline controls for stakeholder feedback windows
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS vmpeo_feedback_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vmpeo_feedback_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vmpeo_feedback_cycle TEXT NOT NULL DEFAULT 'brainstorming';

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_vmpeo_feedback_cycle_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_vmpeo_feedback_cycle_check
  CHECK (vmpeo_feedback_cycle IN ('brainstorming', 'finalization'));

-- 3) Feedback submission header table
CREATE TABLE IF NOT EXISTS public.program_vmpeo_feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  stakeholder_ref_id UUID NOT NULL REFERENCES public.representative_stakeholders(id) ON DELETE RESTRICT,
  stakeholder_member_id TEXT NOT NULL,
  stakeholder_name TEXT NOT NULL,
  stakeholder_category TEXT,
  institution_name TEXT NOT NULL,
  feedback_cycle TEXT NOT NULL CHECK (feedback_cycle IN ('brainstorming', 'finalization')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Feedback item table (vision/mission/each PEO)
CREATE TABLE IF NOT EXISTS public.program_vmpeo_feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.program_vmpeo_feedback_submissions(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('vision', 'mission', 'peo')),
  peo_id UUID REFERENCES public.program_peos(id) ON DELETE SET NULL,
  peo_number INTEGER,
  peo_statement TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vmpeo_feedback_submissions_program
  ON public.program_vmpeo_feedback_submissions (program_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_vmpeo_feedback_submissions_stakeholder
  ON public.program_vmpeo_feedback_submissions (stakeholder_ref_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_vmpeo_feedback_entries_program_category
  ON public.program_vmpeo_feedback_entries (program_id, category);

CREATE INDEX IF NOT EXISTS idx_vmpeo_feedback_entries_peo
  ON public.program_vmpeo_feedback_entries (program_id, peo_number);
