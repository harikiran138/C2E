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

    console.log(`Checking if user ${email} exists...`);
    const res = await client.query('SELECT id FROM institutions WHERE email = $1', [email]);
    
    let institutionId;

    if (res.rows.length > 0) {
      console.log('User already exists.');
      institutionId = res.rows[0].id;
      // Ensure onboarding is completed
      await client.query("UPDATE institutions SET onboarding_status = 'COMPLETED' WHERE id = $1", [institutionId]);
    } else {
      console.log('Creating new user...');
      const hashedPassword = await bcrypt.hash(password, 10);
      institutionId = uuidv4();

      await client.query(`
        INSERT INTO institutions (
          id, institution_name, email, password_hash, onboarding_status, 
          institution_type, institution_status, established_year, university_affiliation, city, state, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [
        institutionId, 
        institutionName, 
        email, 
        hashedPassword, 
        'COMPLETED',
        'Private',
        'Autonomous',
        2000,
        'Tech University',
        'Tech City',
        'Tech State'
      ]);
      console.log('User created.');
    }

    console.log('Checking programs...');
    const progRes = await client.query('SELECT id FROM programs WHERE institution_id = $1', [institutionId]);
    
    if (progRes.rows.length === 0) {
      console.log('Adding a program...');
      const programId = uuidv4();
      await client.query(`
        INSERT INTO programs (
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
