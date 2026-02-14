-- Fix degree check constraint in programs
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_degree_check;
ALTER TABLE public.programs ADD CONSTRAINT programs_degree_check 
CHECK (degree IN (
    'B. Tech./ B. E.', 
    'M. Tech./ M. E.', 
    'B.Sc.', 
    'M.Sc.', 
    'B.Com.', 
    'M.Com.', 
    'Diploma', 
    'PhD', 
    'Integrated', 
    'M. Tech.', 
    'M. E.', 
    'B. Tech.', 
    'B. E.'
));

-- Rename organization to organisation if mismatch exists, 
-- but schema.json shows 'organization'. 
-- InstitutionOnboarding.tsx handles it as 'organisation'.
-- I will keep the DB as 'organization' and update the UI to match it, 
-- as 'organization' is more common in standard schemas.
-- However, let's double check the 'stakeholders' definition in schema.json.
-- "organization":{"format":"text","type":"string"}
-- So UI needs to change.

-- Ensure program columns exist (they were missing from some migrations but present in live schema)
-- vision, mission, program_chair, nba_coordinator, stakeholder_feedback_enabled are already in live schema.
