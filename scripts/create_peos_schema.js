const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting PEOs migration...');

    // 1. Create program_peos table
    console.log('Creating program_peos table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_peos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        peo_statement TEXT NOT NULL,
        peo_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add process date columns to programs table
    console.log('Adding process date columns to programs table...');
    await client.query(`
      ALTER TABLE programs
      ADD COLUMN IF NOT EXISTS peo_brainstorming_start_date DATE,
      ADD COLUMN IF NOT EXISTS peo_brainstorming_end_date DATE,
      ADD COLUMN IF NOT EXISTS peo_feedback_start_date DATE,
      ADD COLUMN IF NOT EXISTS peo_feedback_end_date DATE,
      ADD COLUMN IF NOT EXISTS peo_consolidation_start_date DATE,
      ADD COLUMN IF NOT EXISTS peo_consolidation_end_date DATE;
    `);

    console.log('PEOs migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
