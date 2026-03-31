-- Add institution-level vision/mission storage expected by onboarding UI

ALTER TABLE public.institution_details
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS mission TEXT;
