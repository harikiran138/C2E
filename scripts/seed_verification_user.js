const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const client = await pool.connect();
  try {
    const email = 'verified_admin@example.com';
    const password = 'Password123!';
    const institutionName = 'Verified Institute of Technology';

    console.log(`Checking if user ${email} exists in institutions...`);
    const res = await client.query('SELECT id FROM public.institutions WHERE email = $1', [email]);
    
    let institutionId;

    if (res.rows.length > 0) {
      console.log('Institution already exists.');
      institutionId = res.rows[0].id;
      // Ensure onboarding is completed
      await client.query("UPDATE public.institutions SET onboarding_status = 'COMPLETED' WHERE id = $1", [institutionId]);
    } else {
      console.log('Creating new user in auth.users and institutions...');
      const hashedPassword = await bcrypt.hash(password, 10);
      institutionId = uuidv4();

      // Start transaction
      await client.query('BEGIN');

      try {
        // 1. We might not be able to insert into auth.users directly if restricted, 
        // but let's try to mock it if we have superuser or just use it.
        // If it fails, we will know.
        try {
          await client.query(`
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, instance_id)
            VALUES ($1, $2, $3, NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
            ON CONFLICT (id) DO NOTHING
          `, [institutionId, email, hashedPassword]);
          console.log('Auth user created/verified.');
        } catch (authErr) {
          console.log('Note: Could not insert into auth.users directly (expected if not superuser).');
          console.log('Checking if it works without auth.users entry (might fail FK)...');
        }

        // 2. Insert into institutions
        await client.query(`
          INSERT INTO public.institutions (
            id, institution_name, email, password_hash, onboarding_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET institution_name = $2
        `, [
          institutionId, 
          institutionName, 
          email, 
          hashedPassword, 
          'COMPLETED'
        ]);
        console.log('Institution created.');

        // 3. Insert into institution_details
        await client.query(`
          INSERT INTO public.institution_details (
            institution_id, type, status, established_year, affiliation, address, city, state, country, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (institution_id) DO UPDATE SET type = $2
        `, [
          institutionId,
          'Private',
          'Autonomous',
          2000,
          'Tech University',
          '123 Tech Park, Silicon Valley',
          'Tech City',
          'Tech State',
          'India'
        ]);
        console.log('Institution details added.');

        await client.query('COMMIT');
      } catch (innerErr) {
        await client.query('ROLLBACK');
        throw innerErr;
      }
    }

    console.log('Checking programs...');
    const progRes = await client.query('SELECT id FROM public.programs WHERE institution_id = $1', [institutionId]);
    
    if (progRes.rows.length === 0) {
      console.log('Adding a program...');
      const programId = uuidv4();
      await client.query(`
        INSERT INTO public.programs (
          id, institution_id, program_name, degree, level, duration, intake, academic_year, program_code, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        programId,
        institutionId,
        'Computer Science and Engineering',
        'B.Tech',
        'UG',
        4,
        120,
        '2024',
        'CSE-VERIFY'
      ]);
      console.log('Program added.');
    } else {
      console.log('Program already exists.');
    }

    console.log('---------------------------------------------------');
    console.log('SEEDING COMPLETE');
    console.log('Login with:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('---------------------------------------------------');

  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
