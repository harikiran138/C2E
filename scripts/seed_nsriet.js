const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const institutionName = 'N S Raju Institute of Engineering and Technology';
  const email = 'director@nsriet.edu.in';
  const password = 'DKMNILLP@5604';
  
  try {
    console.log('--- STARTING SEEDING ---');
    const client = await pool.connect();
    
    try {
      // 1. Check if user exists in auth.users
      const { rows: existingUser } = await client.query(
        "SELECT id FROM auth.users WHERE email = $1",
        [email]
      );

      let userId;
      if (existingUser.length > 0) {
        console.log('✅ User already exists in auth.users. ID:', existingUser[0].id);
        userId = existingUser[0].id;
      } else {
        console.log('Inserting user into auth.users...');
        userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await client.query(
          `INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
            is_super_admin, phone
          ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), NOW(), $9, $10)`,
          [
            userId, 
            '00000000-0000-0000-0000-000000000000', 
            email, 
            hashedPassword, 
            JSON.stringify({ provider: 'email', providers: ['email'] }),
            JSON.stringify({ institution_name: institutionName }),
            'authenticated',
            'authenticated',
            false,
            null
          ]
        );
        console.log('✅ User inserted into auth.users. ID:', userId);

        // Also need an identity for Supabase Auth to work correctly
        await client.query(
          `INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
          ) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), $5)`,
          [userId, userId, JSON.stringify({ sub: userId, email: email }), 'email', userId]
        );
        console.log('✅ Identity created for user.');
      }

      // 2. Check if institution profile exists
      const { rows: existingInst } = await client.query(
        "SELECT id FROM public.institutions WHERE id = $1",
        [userId]
      );

      if (existingInst.length === 0) {
        console.log('Creating institution profile...');
        await client.query(
          `INSERT INTO public.institutions (
            id, institution_name, email, onboarding_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [userId, institutionName, email, 'COMPLETED']
        );
        console.log('✅ Institution profile created.');
      } else {
        console.log('✅ Institution profile already exists.');
      }

      // 3. Create 5 Programs
      const programs = [
        { name: 'Computer Science and Engineering', code: 'CSE', degree: 'B.Tech', intake: 120 },
        { name: 'Electronics and Communication Engineering', code: 'ECE', degree: 'B.Tech', intake: 60 },
        { name: 'Electrical and Electronics Engineering', code: 'EEE', degree: 'B.Tech', intake: 60 },
        { name: 'Mechanical Engineering', code: 'MECH', degree: 'B.Tech', intake: 60 },
        { name: 'Civil Engineering', code: 'CIVIL', degree: 'B.Tech', intake: 60 }
      ];

      for (const p of programs) {
        const { rows: existingProg } = await client.query(
          "SELECT id FROM public.programs WHERE institution_id = $1 AND UPPER(program_code) = UPPER($2) LIMIT 1",
          [userId, p.code]
        );

        if (existingProg.length > 0) {
          console.log(`- Program ${p.code} already exists.`);
        } else {
          const progId = uuidv4();
          await client.query(
            `INSERT INTO public.programs (
              id, institution_id, program_name, degree, level, duration, intake, academic_year, program_code, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [progId, userId, p.name, p.degree, 'UG', 4, p.intake, '2023-2024', p.code.toUpperCase()]
          );
          console.log(`✅ Created program: ${p.name} (${p.code})`);
        }
      }

      console.log('--- SEEDING COMPLETE ---');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ SEEDING FAILED:', err);
  } finally {
    await pool.end();
  }
}

seed();
