-- Create a table to store invalidated JWT tokens
CREATE TABLE IF NOT EXISTS public.jwt_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_jwt_blocklist_token ON public.jwt_blocklist(token);

-- Index for efficient cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_jwt_blocklist_expires_at ON public.jwt_blocklist(expires_at);

-- RLS policies (only backend should access)
ALTER TABLE public.jwt_blocklist ENABLE ROW LEVEL SECURITY;
