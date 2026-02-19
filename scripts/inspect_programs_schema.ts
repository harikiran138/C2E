
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // Load .env as fallback

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

async function inspectSchema() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'programs';
    `);
    console.log('Programs Table Schema:', res.rows);
  } catch (err) {
    console.error('Error inspecting schema:', err);
  } finally {
    client.release();
    pool.end();
  }
}

inspectSchema();
