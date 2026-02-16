const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  const client = await pool.connect();
  try {
    console.log('Creating representative_stakeholders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS representative_stakeholders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL,
        member_name TEXT NOT NULL,
        member_id TEXT,
        organization TEXT,
        email TEXT,
        mobile_number TEXT,
        specialisation TEXT,
        category TEXT,
        linkedin_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table representative_stakeholders created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    client.release();
    pool.end();
  }
}

createTable();
