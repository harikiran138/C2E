const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: "postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const NSRIET_NAME = "N S Raju Institute of Engineering and Technology";
const ADMIN_EMAIL = "director@nillp.ai";
const ADMIN_PASSWORD = "DKMNILLP@5604";
const PROGRAMS = [
  { name: "Computer Science and Engineering", code: "CSE" },
  { name: "Electronics and Communication Engineering", code: "ECE" },
  { name: "Mechanical Engineering", code: "MECH" },
  { name: "Civil Engineering", code: "CIVIL" },
  { name: "Electrical and Electronics Engineering", code: "EEE" }
];

async function setup() {
  const client = await pool.connect();
  try {
    console.log("Starting NSRIET Setup...");

    // 1. Check if already exists by email
    let { rows: existingByEmail } = await client.query(
      "SELECT id FROM public.institutions WHERE LOWER(email) = LOWER($1)",
      [ADMIN_EMAIL]
    );

    let institutionId;
    if (existingByEmail.length > 0) {
      console.log("Institution found by email. Updating...");
      institutionId = existingByEmail[0].id;
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await client.query(
        "UPDATE public.institutions SET password_hash = $1, institution_name = $2, updated_at = NOW() WHERE id = $3",
        [hashedPassword, NSRIET_NAME, institutionId]
      );
    } else {
      // Check if already exists by name
      const { rows: existingByName } = await client.query(
        "SELECT id FROM public.institutions WHERE LOWER(institution_name) = LOWER($1)",
        [NSRIET_NAME]
      );

      if (existingByName.length > 0) {
        console.log("Institution found by name. Updating email and password...");
        institutionId = existingByName[0].id;
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await client.query(
          "UPDATE public.institutions SET email = $1, password_hash = $2, updated_at = NOW() WHERE id = $3",
          [ADMIN_EMAIL.trim(), hashedPassword, institutionId]
        );
      } else {
        console.log("Creating new institution...");
        institutionId = uuidv4();
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await client.query(
          `INSERT INTO public.institutions (id, institution_name, email, password_hash, onboarding_status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [institutionId, NSRIET_NAME, ADMIN_EMAIL, hashedPassword, 'COMPLETED']
        );
      }
    }

    // 2. Create Programs
    console.log(`Creating ${PROGRAMS.length} programs...`);
    for (const prog of PROGRAMS) {
      // Check if program exists
      const { rows: existingProg } = await client.query(
        "SELECT id FROM public.programs WHERE institution_id = $1 AND program_name = $2",
        [institutionId, prog.name]
      );

      if (existingProg.length === 0) {
        await client.query(
          `INSERT INTO public.programs (
            id, institution_id, program_name, program_code, degree, duration, level, academic_year, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [uuidv4(), institutionId, prog.name, prog.code, 'B.Tech', 4, 'UG', '2025-26', 'active']
        );
        console.log(`Created program: ${prog.name}`);
      } else {
        console.log(`Program already exists: ${prog.name}`);
      }
    }

    console.log("Setup complete!");
  } catch (err) {
    console.error("Setup failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
