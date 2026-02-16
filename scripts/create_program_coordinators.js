
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database...');

    // 1. Create program_coordinators table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.program_coordinators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
        program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        designation TEXT NOT NULL CHECK (designation IN ('Professor', 'Associate Professor', 'Assistant Professor')),
        email_official TEXT NOT NULL,
        email_personal TEXT,
        mobile_official TEXT NOT NULL,
        mobile_personal TEXT,
        linkedin_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(program_id) -- One coordinator per program
      );
    `);

    console.log('Created program_coordinators table.');

    // 2. Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_program_coordinators_program_id ON public.program_coordinators(program_id);
    `);
    
    console.log('Created indexes.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
