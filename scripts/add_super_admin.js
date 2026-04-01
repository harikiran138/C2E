const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addSuperAdmin() {
  const email = 'admin@c2x.ai';
  const password = 'DKMNILLP@5604';
  const role = 'SUPER_ADMIN';

  try {
    console.log(`Hashing password for ${email}...`);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log(`Checking if user ${email} exists...`);
    const checkRes = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);

    if (checkRes.rows.length > 0) {
      console.log(`User ${email} exists. Updating password and role...`);
      await pool.query(
        'UPDATE public.users SET password_hash = $1, role = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3',
        [passwordHash, role, email]
      );
      console.log(`User ${email} updated successfully.`);
    } else {
      console.log(`User ${email} does not exist. Inserting...`);
      await pool.query(
        'INSERT INTO public.users (email, password_hash, role) VALUES ($1, $2, $3)',
        [email, passwordHash, role]
      );
      console.log(`User ${email} created successfully.`);
    }

  } catch (err) {
    console.error('Error adding super admin:', err);
  } finally {
    await pool.end();
  }
}

addSuperAdmin();
