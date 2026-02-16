
import pool from './lib/postgres';
import { Pool } from 'pg';

async function testConnection() {
  try {
    console.log('Testing Postgres connection WITHOUT SSL...');
    const poolNoSsl = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    const client = await poolNoSsl.connect();
    console.log('Connected successfully without SSL!');
    const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
    console.log('Tables in public schema:', res.rows.map(r => r.tablename));
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed (even without SSL):', err);
    process.exit(1);
  }
}

testConnection();
