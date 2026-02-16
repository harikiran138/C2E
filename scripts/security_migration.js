const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting Security Hardening Migration...');

    // 1. Add columns to institutions table
    console.log('Adding specific columns to public.institutions...');
    await client.query(`
      ALTER TABLE public.institutions 
      ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
      ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
    `);
    console.log('Columns added successfully.');

    // 2. Create audit_logs table
    console.log('Creating public.audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institution_id UUID REFERENCES public.institutions(id),
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('audit_logs table created successfully.');

    // 3. Create index for audit logs
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_id ON public.audit_logs(institution_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
    `);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
