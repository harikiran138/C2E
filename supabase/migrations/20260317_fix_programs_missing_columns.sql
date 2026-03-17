-- ============================================================
-- 20260317_fix_programs_missing_columns.sql
-- Root-cause fix: programs table is missing all VM, scoring,
-- curriculum-feedback, and OBE columns that the application code
-- depends on. None of these were added in any earlier migration.
-- ============================================================

-- 1) Vision / Mission scoring & metadata on programs
--    (read by update-vm, generate-mission, program-vm-governance,
--     and the dependency-chain migration backfill)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS program_vision        TEXT,
  ADD COLUMN IF NOT EXISTS program_mission       TEXT,
  ADD COLUMN IF NOT EXISTS vision_score          INTEGER
    CONSTRAINT programs_vision_score_check CHECK (vision_score IS NULL OR (vision_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS vision_analysis       JSONB,
  ADD COLUMN IF NOT EXISTS mission_score         INTEGER
    CONSTRAINT programs_mission_score_check CHECK (mission_score IS NULL OR (mission_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS mission_analysis      JSONB;

-- 2) AI generation tracking on programs
--    (used by update-vm and generate-mission routes)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS generated_by_ai       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vision_inputs_used    JSONB,
  ADD COLUMN IF NOT EXISTS mission_inputs_used   JSONB,
  ADD COLUMN IF NOT EXISTS vision_options        JSONB,
  ADD COLUMN IF NOT EXISTS mission_options       JSONB,
  ADD COLUMN IF NOT EXISTS vision_priorities     TEXT[],
  ADD COLUMN IF NOT EXISTS mission_priorities    TEXT[];

-- 3) OBE traceability matrices stored on programs
--    (read by program-context.ts for resolveProgramAcademicContext)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS peo_po_matrix         JSONB,
  ADD COLUMN IF NOT EXISTS consistency_matrix    JSONB;

-- 4) Curriculum feedback timeline
--    (used by the new /api/institution/feedback/curriculum route)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS curriculum_feedback_start_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS curriculum_feedback_end_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS curriculum_feedback_status    TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT programs_curriculum_feedback_status_check
      CHECK (curriculum_feedback_status IN ('pending', 'open', 'closed', 'completed'));

-- ============================================================
-- 5) Program step completion tracking
--    (used by curriculum feedback compliance checklist)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.program_step_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  step_key     TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_step_completions_unique UNIQUE (program_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_program_step_completions_program
  ON public.program_step_completions (program_id);

-- ============================================================
-- 6) Curriculum feedback submissions from stakeholders
--    (used by curriculum feedback panel to show responses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.curriculum_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES public.representative_stakeholders(id) ON DELETE CASCADE,
  rating         INTEGER NOT NULL DEFAULT 3
    CONSTRAINT curriculum_feedback_rating_check CHECK (rating BETWEEN 1 AND 5),
  comments       TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_feedback_unique UNIQUE (program_id, stakeholder_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_feedback_program
  ON public.curriculum_feedback (program_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_feedback_stakeholder
  ON public.curriculum_feedback (stakeholder_id);

-- ============================================================
-- 7) Backfill vision_score / mission_score on program_visions
--    from programs.vision_score (now that the column exists)
--    Only runs if program_visions exists and backfill is needed.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'program_visions'
  ) THEN
    UPDATE public.program_visions pv
    SET    vision_score = p.vision_score,
           updated_at   = NOW()
    FROM   public.programs p
    WHERE  pv.program_id    = p.id
      AND  p.vision_score   IS NOT NULL
      AND  pv.vision_score  IS NULL;
  END IF;
END;
$$;
