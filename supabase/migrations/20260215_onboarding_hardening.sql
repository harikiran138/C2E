-- Onboarding hardening migration
-- Enforces case-insensitive uniqueness and strict onboarding constraints

CREATE EXTENSION IF NOT EXISTS citext;

-- Institutions
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.institutions
  ALTER COLUMN institution_name SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN onboarding_status SET DEFAULT 'PENDING';

ALTER TABLE public.institutions
  DROP CONSTRAINT IF EXISTS institutions_onboarding_status_check;

ALTER TABLE public.institutions
  ADD CONSTRAINT institutions_onboarding_status_check
  CHECK (onboarding_status IN ('PENDING', 'COMPLETED'));

CREATE UNIQUE INDEX IF NOT EXISTS institutions_institution_name_lower_uniq
  ON public.institutions (LOWER(institution_name));

CREATE UNIQUE INDEX IF NOT EXISTS institutions_email_lower_uniq
  ON public.institutions (LOWER(email));

-- Institution details
ALTER TABLE public.institution_details
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN established_year SET NOT NULL,
  ALTER COLUMN address SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN state SET NOT NULL;

ALTER TABLE public.institution_details
  DROP CONSTRAINT IF EXISTS institution_details_type_check;

ALTER TABLE public.institution_details
  ADD CONSTRAINT institution_details_type_check
  CHECK (type IN ('Private', 'Government', 'Deemed', 'Trust'));

ALTER TABLE public.institution_details
  DROP CONSTRAINT IF EXISTS institution_details_status_check;

ALTER TABLE public.institution_details
  ADD CONSTRAINT institution_details_status_check
  CHECK (status IN ('Autonomous', 'Non-Autonomous'));

ALTER TABLE public.institution_details
  DROP CONSTRAINT IF EXISTS institution_details_established_year_check;

ALTER TABLE public.institution_details
  ADD CONSTRAINT institution_details_established_year_check
  CHECK (established_year BETWEEN 1900 AND EXTRACT(YEAR FROM NOW())::INT);

ALTER TABLE public.institution_details
  DROP CONSTRAINT IF EXISTS institution_details_address_min_len_check;

ALTER TABLE public.institution_details
  ADD CONSTRAINT institution_details_address_min_len_check
  CHECK (LENGTH(TRIM(address)) >= 10);

ALTER TABLE public.institution_details
  DROP CONSTRAINT IF EXISTS institution_details_affiliation_required_check;

ALTER TABLE public.institution_details
  ADD CONSTRAINT institution_details_affiliation_required_check
  CHECK (status <> 'Non-Autonomous' OR (affiliation IS NOT NULL AND LENGTH(TRIM(affiliation)) > 0));

-- Programs
ALTER TABLE public.programs
  ALTER COLUMN program_code SET NOT NULL,
  ALTER COLUMN degree SET NOT NULL,
  ALTER COLUMN level SET NOT NULL,
  ALTER COLUMN duration SET NOT NULL,
  ALTER COLUMN intake SET NOT NULL,
  ALTER COLUMN academic_year SET NOT NULL;

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_degree_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_degree_check
  CHECK (degree IN ('B.Tech', 'B.Sc', 'B.Com', 'MBA', 'M.Tech', 'PhD'));

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_level_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_level_check
  CHECK (level IN ('UG', 'PG', 'Diploma', 'Doctorate'));

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_duration_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_duration_check
  CHECK (duration BETWEEN 1 AND 6);

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_intake_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_intake_check
  CHECK (intake > 0);

CREATE UNIQUE INDEX IF NOT EXISTS programs_institution_program_code_lower_uniq
  ON public.programs (institution_id, LOWER(program_code));
