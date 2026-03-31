const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: "postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const ADMIN_EMAIL = "director@nillp.ai";
const ADMIN_PASSWORD = "DKMNILLP@5604";

async function verify() {
  const client = await pool.connect();
  try {
    console.log("Starting Verification for NSRIET...");

    // 1. Verify Institution and Login
    const { rows: inst } = await client.query(
      "SELECT id, institution_name, password_hash FROM public.institutions WHERE email = $1",
      [ADMIN_EMAIL]
    );

    if (inst.length === 0) {
      console.error("FAILED: Institution not found with email:", ADMIN_EMAIL);
      return;
    }

    const institution = inst[0];
    console.log(`Found Institution: ${institution.institution_name} (ID: ${institution.id})`);

    const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, institution.password_hash);
    if (isPasswordValid) {
      console.log("SUCCESS: Password verification successful.");
    } else {
      console.error("FAILED: Password verification failed.");
    }

    // 2. Verify Programs
    const { rows: progs } = await client.query(
      "SELECT program_name, program_code FROM public.programs WHERE institution_id = $1",
      [institution.id]
    );

    console.log(`Found ${progs.length} programs for this institution:`);
    console.table(progs);

    if (progs.length >= 5) {
      console.log("SUCCESS: At least 5 programs found.");
    } else {
      console.error(`FAILED: Only ${progs.length} programs found, expected at least 5.`);
    }

    // 3. Logic Check (Accessibility)
    // In a real app, this would involve checking if a session token can be generated.
    // Here we've already verified the DB relationship and the password hash.

    console.log("Verification complete!");
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
