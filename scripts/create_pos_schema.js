const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting POs migration...');

    // Create program_outcomes table
    console.log('Creating program_outcomes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        po_code VARCHAR(20) NOT NULL,
        po_title TEXT NOT NULL,
        po_description TEXT NOT NULL,
        tier VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(program_id, po_code)
      );
    `);

    console.log('POs migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
