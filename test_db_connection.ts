
import pool from './lib/postgres.ts';

async function testConnection() {
  try {
    console.log('Testing Postgres connection...');
    const client = await pool.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
    console.log('Tables in public schema:', res.rows.map(r => r.tablename));
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
}

testConnection();
