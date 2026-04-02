const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("pooler.supabase.com") || process.env.DATABASE_URL.includes("supabase.co"))
      ? { rejectUnauthorized: false }
      : false
  });

  const client = await pool.connect();
  try {
    const tables = ['program_peos', 'program_outcomes', 'program_psos', 'program_specific_outcomes', 'peos'];
    for (const table of tables) {
      console.log(`\n--- TABLE: ${table} ---`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.log(JSON.stringify(res.rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
