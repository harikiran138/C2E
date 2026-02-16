
import { Pool } from 'pg';

async function testPooler() {
  const connectionString = "postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  try {
    console.log('Testing Supabase POOLER connection...');
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();
    console.log('Connected successfully to POOLER!');
    const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
    console.log('Tables:', res.rows.map(r => r.tablename));
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Pooler connection failed:', err);
    process.exit(1);
  }
}

testPooler();
