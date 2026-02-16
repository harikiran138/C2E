const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  const client = await pool.connect();
  try {
    console.log('Creating bos_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bos_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL,
        member_name TEXT NOT NULL,
        member_id TEXT,
        organization TEXT,
        email TEXT,
        mobile_number TEXT,
        specialisation TEXT,
        category TEXT,
        tenure_start_date DATE,
        tenure_end_date DATE,
        linkedin_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table bos_members created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    client.release();
    pool.end();
  }
}

createTable();
