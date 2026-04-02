-- Migration: Add missing auth columns to programs table
-- Date: 2026-04-02
-- Description: The programs table is missing 'email' and 'is_password_set' columns
-- that are required by the programs creation API, set-password API, and program login API.
-- This migration adds those columns safely using IF NOT EXISTS guards.

BEGIN;

-- 1. Add email column (the program's login email)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add is_password_set flag (tracks whether admin has set a password)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS is_password_set BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add unique constraint on email within institution (prevent duplicate logins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'programs_email_institution_unique'
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_email_institution_unique
        UNIQUE (institution_id, email);
  END IF;
END $$;

-- 4. Backfill: For any existing programs that have a password_hash set,
-- mark is_password_set = true so the UI reflects the correct state.
UPDATE public.programs
SET is_password_set = TRUE
WHERE password_hash IS NOT NULL
  AND is_password_set = FALSE;

COMMIT;
