const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAll() {
  try {
    const users = await pool.query('SELECT email, role, institution_id, program_id FROM public.users');
    console.log('--- Public Users ---');
    console.table(users.rows);

    const progs = await pool.query('SELECT id, program_name, program_code FROM public.programs');
    console.log('--- Programs ---');
    console.table(progs.rows);

    const insts = await pool.query('SELECT id, institution_name FROM public.institutions');
    console.log('--- Institutions ---');
    console.table(insts.rows);

    const stakeholders = await pool.query('SELECT member_id, member_name, program_id FROM public.representative_stakeholders');
    console.log('--- Stakeholders ---');
    console.table(stakeholders.rows);

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkAll();
