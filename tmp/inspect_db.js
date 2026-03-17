const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectTable() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'curriculum_feedback';
    `);
    console.log('Columns in curriculum_feedback:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

inspectTable();
