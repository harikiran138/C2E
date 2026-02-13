-- ==============================================================================
-- MASTER OBNOARDING SYSTEM SCHEMA
-- ==============================================================================

-- 1. INSTITUTIONS TABLE
-- Extends the existing table to include all onboarding details
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT, -- e.g., NSRIT (Required for PEO ID generation)
  mobile TEXT,
  email TEXT,
  status TEXT CHECK (status IN ('Autonomous', 'Non-Autonomous')),
  vision TEXT,
  mission TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Institutions can view own profile" ON public.institutions FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Institutions can update own profile" ON public.institutions FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Institutions can insert own profile" ON public.institutions FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. PROGRAMS TABLE
-- Linking programs to institutions with enhanced metadata
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., Computer Science Engineering
  code TEXT NOT NULL, -- e.g., CSE (Required for PEO ID generation)
  degree TEXT NOT NULL CHECK (degree IN ('B.Tech', 'B.E.', 'M.Tech', 'M.E.', 'MBA', 'MCA')), 
  years INTEGER NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('UG', 'PG', 'Integrated')),
  program_chair TEXT,
  nba_coordinator TEXT,
  vision TEXT,
  mission TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Institutions can manage own programs" ON public.programs 
  USING (institution_id = auth.uid()) 
  WITH CHECK (institution_id = auth.uid());

-- 3. STAKEHOLDERS TABLE
-- Managing stakeholders for each program
CREATE TABLE IF NOT EXISTS public.stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'Academia', 'Industry', 'Potential Employers', 'Research Organisations', 
    'Professional Body', 'Alumni', 'Students', 'Parents', 'Management'
  )),
  contact_no TEXT,
  email TEXT NOT NULL,
  access_token UUID DEFAULT gen_random_uuid(), -- Secure token for feedback access
  feedback_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Institutions can manage stakeholders" ON public.stakeholders 
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = stakeholders.program_id AND institution_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs WHERE id = stakeholders.program_id AND institution_id = auth.uid()));

-- 4. STAKEHOLDER FEEDBACK TABLE
-- Capturing structured feedback
CREATE TABLE IF NOT EXISTS public.stakeholder_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  expectations TEXT,
  vision_alignment_rating INTEGER,
  feedback_json JSONB, -- For structured feedback forms
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stakeholder_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Institutions can view feedback" ON public.stakeholder_feedback 
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = stakeholder_feedback.program_id AND institution_id = auth.uid()));

-- Policy for Stakeholders (via anonymous/token access - typically handled via Edge Functions or specific signed RPCs, but here's a basic policy placeholder)
-- In practice, you might use a Postgres Function with SECURITY DEFINER to submit feedback without direct RLS exposure to anonymous users.

-- 5. FINALIZED PEOs TABLE
-- Storing the final, approved PEOs with unique formatting
CREATE TABLE IF NOT EXISTS public.peos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  peo_code TEXT NOT NULL, -- e.g., PEO-NSRIT-CSE-001
  statement TEXT NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_peo_code UNIQUE (peo_code)
);

-- Enable RLS
ALTER TABLE public.peos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Institutions can manage PEOs" ON public.peos 
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = peos.program_id AND institution_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs WHERE id = peos.program_id AND institution_id = auth.uid()));

-- 6. PEO DRAFTS / GENERATION HISTORY (Optional but recommended)
-- Stores the AI generated sets before finalization
CREATE TABLE IF NOT EXISTS public.peo_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  generated_peos JSONB, -- Array of strings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.peo_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions can manage PEO drafts" ON public.peo_drafts 
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = peo_drafts.program_id AND institution_id = auth.uid()));


-- ==============================================================================
-- FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Function to Generate Unique PEO Code
-- Format: PEO-[InstCode]-[ProgramCode]-001
CREATE OR REPLACE FUNCTION generate_peo_code()
RETURNS TRIGGER AS $$
DECLARE
  inst_code TEXT;
  prog_code TEXT;
  next_num INTEGER;
BEGIN
  -- Fetch Institution Code
  SELECT i.code INTO inst_code
  FROM public.institutions i
  JOIN public.programs p ON p.institution_id = i.id
  WHERE p.id = NEW.program_id;

  -- Fetch Program Code
  SELECT p.code INTO prog_code
  FROM public.programs p
  WHERE p.id = NEW.program_id;

  -- Fallback if codes are missing
  IF inst_code IS NULL THEN inst_code := 'INST'; END IF;
  IF prog_code IS NULL THEN prog_code := 'PROG'; END IF;

  -- Calculate next number for this Program
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.peos
  WHERE program_id = NEW.program_id;

  -- Set the PEO Code
  NEW.peo_code := 'PEO-' || inst_code || '-' || prog_code || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign PEO Code on INSERT
DROP TRIGGER IF EXISTS trg_assign_peo_code ON public.peos;
CREATE TRIGGER trg_assign_peo_code
BEFORE INSERT ON public.peos
FOR EACH ROW
EXECUTE FUNCTION generate_peo_code();
