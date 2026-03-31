CREATE TABLE IF NOT EXISTS public.program_outcomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    po_code TEXT NOT NULL,
    po_title TEXT,
    po_description TEXT,
    tier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.program_psos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    pso_number INTEGER NOT NULL,
    pso_statement TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
