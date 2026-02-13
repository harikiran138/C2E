-- Institutions Table
-- Stores profile information for each institution.
-- Linked to auth.users via id.
create table if not exists public.institutions (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  mobile text,
  email text,
  status text default 'Autonomous',
  vision text,
  mission text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.institutions enable row level security;

-- Policies for institutions
create policy "Institutions can view their own profile"
  on public.institutions for select
  using (auth.uid() = id);

create policy "Institutions can update their own profile"
  on public.institutions for update
  using (auth.uid() = id);

create policy "Institutions can insert their profile"
  on public.institutions for insert
  with check (auth.uid() = id);


-- Programs Table
-- Stores academic programs offered by the institution.
create table if not exists public.programs (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references public.institutions(id) on delete cascade not null,
  name text not null,
  degree text not null, -- B.Tech, M.Tech, etc.
  years integer not null,
  level text not null, -- UG, PG
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.programs enable row level security;

-- Policies for programs
create policy "Institutions can view their own programs"
  on public.programs for select
  using (auth.uid() = institution_id);

create policy "Institutions can insert their own programs"
  on public.programs for insert
  with check (auth.uid() = institution_id);

create policy "Institutions can update their own programs"
  on public.programs for update
  using (auth.uid() = institution_id);

create policy "Institutions can delete their own programs"
  on public.programs for delete
  using (auth.uid() = institution_id);


-- PEO Sets Table
-- Stores generated and finalized PEOs for a program.
create table if not exists public.peo_sets (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references public.programs(id) on delete cascade not null,
  set_name text not null, -- e.g. "Set 1"
  peos jsonb not null, -- Array of PEO objects {id, text, visionAlign, stakeholderAlign}
  is_final boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.peo_sets enable row level security;

-- Policies for peo_sets
-- We need to check if the program belongs to the institution
create policy "Institutions can view their own PEO sets"
  on public.peo_sets for select
  using (
    exists (
      select 1 from public.programs
      where public.programs.id = peo_sets.program_id
      and public.programs.institution_id = auth.uid()
    )
  );

create policy "Institutions can insert PEO sets for their programs"
  on public.peo_sets for insert
  with check (
    exists (
      select 1 from public.programs
      where public.programs.id = peo_sets.program_id
      and public.programs.institution_id = auth.uid()
    )
  );

create policy "Institutions can update their own PEO sets"
  on public.peo_sets for update
  using (
    exists (
      select 1 from public.programs
      where public.programs.id = peo_sets.program_id
      and public.programs.institution_id = auth.uid()
    )
  );
