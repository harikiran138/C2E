const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAccounts() {
  try {
    const result = await pool.query('SELECT email, institution_name, onboarding_status FROM public.institutions');
    console.log('--- Current Institutions ---');
    console.table(result.rows);
    if (result.rows.length === 0) {
        console.log('No accounts found. You should register at /institution/signup');
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkAccounts();
