-- Add auth columns to programs table

ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Drop existing unique constraint if any exists (to avoid conflicts, though one probably doesn't)
-- Make program_id (the custom ID string) unique so it can be used for login
-- The custom ID string the user uses might be program_code. Let's look at the schema again. 

-- Wait, in `institutions` table, is there another unique key?
-- The schema uses `id UUID PRIMARY KEY`, and `program_code TEXT`. Let's ensure `program_code` is unique per institution or globally?
-- Usually, login needs a globally unique identifier. For now, we will just make `program_code` unique across the table if it's meant to be the login ID.
-- However, I should check the implementation plan. "Make sure program_id (the string identifier like 'CS101') is UNIQUE". 
-- In the schema it's named `program_code` TEXT, `program_name` TEXT.

ALTER TABLE public.programs
ADD CONSTRAINT programs_program_code_key UNIQUE (program_code);
