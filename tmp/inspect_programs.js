const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectPrograms() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'programs' AND column_name LIKE 'curriculum_feedback_%';
    `);
    console.log('New columns in programs:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

inspectPrograms();
