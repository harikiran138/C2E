const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkEnum() {
  try {
    const res = await pool.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'user_role' 
         OR (t.typname = 'role' AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    `);
    console.log('--- User Roles Enum ---');
    console.table(res.rows);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkEnum();
