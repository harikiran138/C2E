const { Pool } = require('pg');

const connectionString = "postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

if (!connectionString) {
  console.error("DATABASE_URL is not defined in the environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
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
