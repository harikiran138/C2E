const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("CRITICAL ERROR: DATABASE_URL is not defined in the environment.");
  console.error("Please set DATABASE_URL in your .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
});

async function checkConstraints() {
  const client = await pool.connect();
  try {
    console.log('Fetching constraint definition...');
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'institutions'::regclass
      AND conname = 'institutions_institution_status_check';
    `);
    
    if (res.rows.length > 0) {
      console.log('Constraint found:');
      console.log(res.rows[0]);
    } else {
      console.log('Constraint not found.');
    }
  } catch (err) {
    console.error('Error fetching constraint:', err);
  } finally {
    client.release();
    pool.end();
  }
}

checkConstraints();
