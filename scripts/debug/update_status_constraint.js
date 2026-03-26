const { Pool } = require('pg');
const connectionString = "postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Dropping existing constraint...');
    await client.query(`ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_institution_status_check;`);
    console.log('Adding updated constraint...');
    await client.query(`
      ALTER TABLE institutions
      ADD CONSTRAINT institutions_institution_status_check
      CHECK (institution_status IN (
        'Autonomous', 
        'Non-Autonomous', 
        'Non Autonomous', 
        'Affiliated', 
        'Deemed-to-be', 
        'State University', 
        'Central University', 
        'Private University'
      ));
    `);
    console.log('Constraint updated successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}
migrate();
