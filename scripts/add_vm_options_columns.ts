
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumns() {
  const client = await pool.connect();
  try {
    console.log('Adding vision_options column...');
    await client.query(`
      ALTER TABLE programs 
      ADD COLUMN IF NOT EXISTS vision_options JSONB DEFAULT '[]'::jsonb;
    `);
    
    console.log('Adding mission_options column...');
    await client.query(`
      ALTER TABLE programs 
      ADD COLUMN IF NOT EXISTS mission_options JSONB DEFAULT '[]'::jsonb;
    `);
    
    console.log('Columns added successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    client.release();
    pool.end();
  }
}

addColumns();
