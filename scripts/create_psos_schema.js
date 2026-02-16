const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting PSOs migration...');

    // 1. Create program_psos table
    console.log('Creating program_psos table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_psos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        pso_statement TEXT NOT NULL,
        pso_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add lead_society column to programs table
    console.log('Adding lead_society to programs table...');
    await client.query(`
      ALTER TABLE programs
      ADD COLUMN IF NOT EXISTS lead_society TEXT DEFAULT NULL;
    `);

    console.log('PSOs migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
