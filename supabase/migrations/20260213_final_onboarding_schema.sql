-- 1. Ensure 'institutions' table exists
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    status TEXT CHECK (status IN ('Autonomous', 'Non-Autonomous')),
    vision TEXT,
    mission TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for institutions
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own institution"
    ON public.institutions FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own institution"
    ON public.institutions FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own institution"
    ON public.institutions FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Ensure 'programs' table exists
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    degree TEXT,
    duration_years INTEGER,
    level TEXT,
    -- New columns for expanded onboarding
    program_chair TEXT,
    nba_coordinator TEXT,
    vision TEXT,
    mission TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure new columns exist if table already existed without them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'duration_years') AND 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'years') THEN
        ALTER TABLE public.programs RENAME COLUMN years TO duration_years;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'duration_years') THEN
        ALTER TABLE public.programs ADD COLUMN duration_years INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'program_chair') THEN
        ALTER TABLE public.programs ADD COLUMN program_chair TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'nba_coordinator') THEN
        ALTER TABLE public.programs ADD COLUMN nba_coordinator TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'vision') THEN
        ALTER TABLE public.programs ADD COLUMN vision TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'mission') THEN
        ALTER TABLE public.programs ADD COLUMN mission TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'stakeholder_feedback_enabled') THEN
        ALTER TABLE public.programs ADD COLUMN stakeholder_feedback_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Enable RLS for programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions can view their own programs"
    ON public.programs FOR SELECT
    USING (institution_id = auth.uid());

CREATE POLICY "Institutions can insert their own programs"
    ON public.programs FOR INSERT
    WITH CHECK (institution_id = auth.uid());

CREATE POLICY "Institutions can update their own programs"
    ON public.programs FOR UPDATE
    USING (institution_id = auth.uid());

CREATE POLICY "Institutions can delete their own programs"
    ON public.programs FOR DELETE
    USING (institution_id = auth.uid());

-- 3. Create 'stakeholders' table
CREATE TABLE IF NOT EXISTS public.stakeholders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    category TEXT NOT NULL CHECK (category IN ('Academia', 'Industry', 'Potential Employers', 'Research Organisations', 'Professional Body', 'Alumni', 'Students', 'Parents', 'Management')),
    contact_number TEXT,
    email TEXT,
    access_token UUID DEFAULT gen_random_uuid(),
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

-- 4. Create 'peos' table (Finalized PEOs)
CREATE TABLE IF NOT EXISTS public.peos (
    id TEXT PRIMARY KEY, -- e.g. PEO-01
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    statement TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.peos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions can manage their own PEOs"
  ON public.peos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE public.programs.id = peos.program_id
      AND public.programs.institution_id = auth.uid()
    )
  );

-- 5. Create 'peo_drafts' table (Generated Drafts)
CREATE TABLE IF NOT EXISTS public.peo_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    set_number INTEGER NOT NULL, -- 1, 2, 3, 4
    peo_code TEXT NOT NULL, -- e.g. PEO-01
    statement TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.peo_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions can view their own PEO drafts"
  ON public.peo_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE public.programs.id = peo_drafts.program_id
      AND public.programs.institution_id = auth.uid()
    )
  );
