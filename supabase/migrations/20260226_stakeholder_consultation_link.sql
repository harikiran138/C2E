-- Link Representative Stakeholders to Consultation Feedback
-- Date: 2026-02-26

ALTER TABLE public.stakeholder_feedback
    ADD COLUMN IF NOT EXISTS rep_stakeholder_id UUID REFERENCES public.representative_stakeholders(id) ON DELETE CASCADE;

-- Make legacy stakeholder_id nullable to allow responses from Representative Stakeholders
ALTER TABLE public.stakeholder_feedback
    ALTER COLUMN stakeholder_id DROP NOT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_rep_stakeholder
    ON public.stakeholder_feedback (rep_stakeholder_id);
