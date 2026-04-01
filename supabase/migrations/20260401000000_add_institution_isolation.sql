-- Migration: Add institution_id to all curriculum sub-tables for strict isolation
-- Author: Antigravity
-- Date: 2026-04-01

BEGIN;

-- 1. Helper function to add institution_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_visions' AND column_name = 'institution_id') THEN
        ALTER TABLE program_visions ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_missions' AND column_name = 'institution_id') THEN
        ALTER TABLE program_missions ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_peos' AND column_name = 'institution_id') THEN
        ALTER TABLE program_peos ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_outcomes' AND column_name = 'institution_id') THEN
        ALTER TABLE program_outcomes ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_psos' AND column_name = 'institution_id') THEN
        ALTER TABLE program_psos ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_step_completions' AND column_name = 'institution_id') THEN
        ALTER TABLE program_step_completions ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_dissemination' AND column_name = 'institution_id') THEN
        ALTER TABLE program_dissemination ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_vmpeo_feedback_entries' AND column_name = 'institution_id') THEN
        ALTER TABLE program_vmpeo_feedback_entries ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_vmpeo_feedback_submissions' AND column_name = 'institution_id') THEN
        ALTER TABLE program_vmpeo_feedback_submissions ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stakeholders' AND column_name = 'institution_id') THEN
        ALTER TABLE stakeholders ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stakeholder_feedback' AND column_name = 'institution_id') THEN
        ALTER TABLE stakeholder_feedback ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Backfill institution_id from programs table
UPDATE program_visions pv SET institution_id = p.institution_id FROM programs p WHERE pv.program_id = p.id AND pv.institution_id IS NULL;
UPDATE program_missions pm SET institution_id = p.institution_id FROM programs p WHERE pm.program_id = p.id AND pm.institution_id IS NULL;
UPDATE program_peos pp SET institution_id = p.institution_id FROM programs p WHERE pp.program_id = p.id AND pp.institution_id IS NULL;
UPDATE program_outcomes po SET institution_id = p.institution_id FROM programs p WHERE po.program_id = p.id AND po.institution_id IS NULL;
UPDATE program_psos pps SET institution_id = p.institution_id FROM programs p WHERE pps.program_id = p.id AND pps.institution_id IS NULL;
UPDATE program_step_completions psc SET institution_id = p.institution_id FROM programs p WHERE psc.program_id = p.id AND psc.institution_id IS NULL;
UPDATE program_dissemination pd SET institution_id = p.institution_id FROM programs p WHERE pd.program_id = p.id AND pd.institution_id IS NULL;
UPDATE program_vmpeo_feedback_entries pfe SET institution_id = p.institution_id FROM programs p WHERE pfe.program_id = p.id AND pfe.institution_id IS NULL;
UPDATE program_vmpeo_feedback_submissions pfs SET institution_id = p.institution_id FROM programs p WHERE pfs.program_id = p.id AND pfs.institution_id IS NULL;
UPDATE stakeholders s SET institution_id = p.institution_id FROM programs p WHERE s.program_id = p.id AND s.institution_id IS NULL;
UPDATE stakeholder_feedback sf SET institution_id = p.institution_id FROM programs p WHERE sf.program_id = p.id AND sf.institution_id IS NULL;

-- 3. Add NOT NULL constraints and Indexes
-- This assumes all program_id backfills matched. If NOT, we need to handle it.
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'program_visions', 'program_missions', 'program_peos', 'program_outcomes',
        'program_psos', 'program_step_completions', 'program_dissemination',
        'program_vmpeo_feedback_entries', 'program_vmpeo_feedback_submissions',
        'stakeholders', 'stakeholder_feedback'
    ]) LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN institution_id SET NOT NULL', t);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (institution_id, program_id)', t || '_isolation_idx', t);
    END LOOP;
END $$;

COMMIT;
