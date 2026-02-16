const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting Matrix migration...');

    // Add consistency_matrix column to programs table
    console.log('Adding consistency_matrix to programs table...');
    await client.query(`
      ALTER TABLE programs
      ADD COLUMN IF NOT EXISTS consistency_matrix JSONB DEFAULT NULL;
    `);

    console.log('Matrix migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
