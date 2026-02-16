const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addColumns() {
  const client = await pool.connect();
  try {
    console.log('Adding vision and mission columns to institution_details table...');
    await client.query(`
      ALTER TABLE institution_details
      ADD COLUMN IF NOT EXISTS vision TEXT,
      ADD COLUMN IF NOT EXISTS mission TEXT;
    `);
    console.log('Columns added successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    client.release();
    pool.end();
  }
}

addColumns();
