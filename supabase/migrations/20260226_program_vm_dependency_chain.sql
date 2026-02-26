-- Program Vision -> Mission dependency chain
-- Ensures mission generation can be linked to one selected approved vision per program.

CREATE TABLE IF NOT EXISTS public.program_visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  vision_text TEXT NOT NULL,
  vision_score INTEGER,
  vision_analysis JSONB,
  source TEXT NOT NULL DEFAULT 'ai',
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_visions_score_check CHECK (vision_score IS NULL OR (vision_score >= 0 AND vision_score <= 100))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_visions_selected_unique
  ON public.program_visions (program_id)
  WHERE is_selected = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_visions_program_text_unique
  ON public.program_visions (program_id, vision_text);

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_visions_id_program_unique
  ON public.program_visions (id, program_id);

CREATE TABLE IF NOT EXISTS public.program_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  vision_id UUID NOT NULL,
  mission_text TEXT NOT NULL,
  mission_score INTEGER,
  mission_analysis JSONB,
  source TEXT NOT NULL DEFAULT 'ai',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_missions_score_check CHECK (mission_score IS NULL OR (mission_score >= 0 AND mission_score <= 100)),
  CONSTRAINT program_missions_vision_fk
    FOREIGN KEY (vision_id, program_id)
    REFERENCES public.program_visions (id, program_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_missions_active_unique
  ON public.program_missions (program_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_program_missions_program_created
  ON public.program_missions (program_id, created_at DESC);

-- Backfill selected program vision from existing programs data if absent.
INSERT INTO public.program_visions (
  program_id,
  vision_text,
  vision_score,
  vision_analysis,
  source,
  is_selected
)
SELECT
  p.id AS program_id,
  COALESCE(NULLIF(TRIM(p.program_vision), ''), NULLIF(TRIM(p.vision), '')) AS vision_text,
  CASE
    WHEN p.vision_score BETWEEN 0 AND 100 THEN p.vision_score
    ELSE NULL
  END AS vision_score,
  p.vision_analysis,
  'legacy' AS source,
  TRUE AS is_selected
FROM public.programs p
WHERE COALESCE(NULLIF(TRIM(p.program_vision), ''), NULLIF(TRIM(p.vision), '')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_visions pv
    WHERE pv.program_id = p.id
      AND pv.is_selected = TRUE
  )
ON CONFLICT (program_id, vision_text) DO NOTHING;

-- Backfill active program mission from existing programs data if absent.
INSERT INTO public.program_missions (
  program_id,
  vision_id,
  mission_text,
  mission_score,
  mission_analysis,
  source,
  is_active
)
SELECT
  p.id AS program_id,
  pv.id AS vision_id,
  COALESCE(NULLIF(TRIM(p.program_mission), ''), NULLIF(TRIM(p.mission), '')) AS mission_text,
  CASE
    WHEN p.mission_score BETWEEN 0 AND 100 THEN p.mission_score
    ELSE NULL
  END AS mission_score,
  p.mission_analysis,
  'legacy' AS source,
  TRUE AS is_active
FROM public.programs p
INNER JOIN public.program_visions pv
  ON pv.program_id = p.id
 AND pv.is_selected = TRUE
WHERE COALESCE(NULLIF(TRIM(p.program_mission), ''), NULLIF(TRIM(p.mission), '')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_missions pm
    WHERE pm.program_id = p.id
      AND pm.is_active = TRUE
  );
