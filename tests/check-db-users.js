require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT email, role, institution_id, program_id FROM users WHERE email IN ('super@c2e.com', 'inst-a@test.com', 'prog-a1@test.com')");
    console.log("Found Users:", JSON.stringify(res.rows, null, 2));

    const counts = await pool.query("SELECT role, COUNT(*) FROM users GROUP BY role");
    console.log("Role Counts:", JSON.stringify(counts.rows, null, 2));
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
