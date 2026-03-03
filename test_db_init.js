const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.jwt_blocklist (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_jwt_blocklist_token ON public.jwt_blocklist(token);
      CREATE INDEX IF NOT EXISTS idx_jwt_blocklist_expires_at ON public.jwt_blocklist(expires_at);
      ALTER TABLE public.jwt_blocklist ENABLE ROW LEVEL SECURITY;
    `);
    console.log('JWT blocklist table created successfully!');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
