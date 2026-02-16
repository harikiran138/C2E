import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log('Testing connection to pooler:', process.env.DATABASE_URL?.split('@')[1]);
  try {
    const client = await pool.connect();
    console.log('Successfully connected to pooler!');
    const result = await client.query('SELECT 1 as connected');
    console.log('Query result:', result.rows);
    client.release();
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

test();
