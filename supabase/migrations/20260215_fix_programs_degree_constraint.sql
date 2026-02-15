-- Fix programs degree constraint to support onboarding degree values
-- and preserve legacy values already used in existing records.

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_degree_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_degree_check
  CHECK (
    degree = ANY (
      ARRAY[
        'B.Tech',
        'B.Sc',
        'B.Com',
        'MBA',
        'M.Tech',
        'PhD',
        'B. Tech./ B. E.',
        'M. Tech./ M. E.',
        'B.Sc.',
        'M.Sc.',
        'B.Com.',
        'M.Com.',
        'Diploma',
        'Integrated',
        'M. Tech.',
        'M. E.',
        'B. Tech.',
        'B. E.'
      ]
    )
  );
