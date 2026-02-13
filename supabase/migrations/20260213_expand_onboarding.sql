
-- Add new columns to 'programs' table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS program_chair TEXT,
ADD COLUMN IF NOT EXISTS nba_coordinator TEXT,
ADD COLUMN IF NOT EXISTS vision TEXT,
ADD COLUMN IF NOT EXISTS mission TEXT;

-- Create 'stakeholders' table
CREATE TABLE IF NOT EXISTS public.stakeholders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organisation TEXT,
    category TEXT NOT NULL CHECK (category IN ('Academia', 'Industry', 'Potential Employers', 'Research Organisations', 'Professional Body', 'Alumni', 'Students', 'Parents', 'Management')),
    contact_no TEXT,
    email TEXT,
    access_token UUID DEFAULT gen_random_uuid(), -- For future stakeholder dashboard access
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for stakeholders
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- Policies for stakeholders
CREATE POLICY "Institutions can view their own stakeholders"
  ON public.stakeholders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE public.programs.id = stakeholders.program_id
      AND public.programs.institution_id = auth.uid()
    )
  );

CREATE POLICY "Institutions can insert stakeholders for their programs"
  ON public.stakeholders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE public.programs.id = stakeholders.program_id
      AND public.programs.institution_id = auth.uid()
    )
  );

CREATE POLICY "Institutions can update their own stakeholders"
  ON public.stakeholders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE public.programs.id = stakeholders.program_id
      AND public.programs.institution_id = auth.uid()
    )
  );

CREATE POLICY "Institutions can delete their own stakeholders"
  ON public.stakeholders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE public.programs.id = stakeholders.program_id
      AND public.programs.institution_id = auth.uid()
    )
  );
