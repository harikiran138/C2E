import pool from '../lib/postgres';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log("--- STARTING C2E v5.1 TEST SEEDING ---");
  const client = await pool.connect();
  try {
    // 1. Cleanup existing test data
    console.log("Cleaning up previous test data...");
    await client.query("DELETE FROM users WHERE email LIKE '%@test.com' OR email = 'super@c2e.com'");
    await client.query("DELETE FROM institutions WHERE institution_name LIKE 'Test Institution%'");

    const superAdminId = uuidv4();
    const instAId = uuidv4();
    const instBId = uuidv4();
    const progA1Id = uuidv4();
    const progA2Id = uuidv4();
    const instAdminAId = uuidv4();
    const progAdminA1Id = uuidv4();
    const progAdminA2Id = uuidv4();
    const instAdminBId = uuidv4();

    const hashedPassword = await bcrypt.hash("TestPass123!", 10);

    // 2. Insert Institutions
    console.log("Inserting test institutions...");
    await client.query(
      `INSERT INTO institutions (id, institution_name, email, onboarding_status) 
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [instAId, "Test Institution A", "inst-a@test.com", "COMPLETED", instBId, "Test Institution B", "inst-b@test.com", "COMPLETED"]
    );

    // 3. Insert Programs
    console.log("Inserting test programs...");
    await client.query(
      `INSERT INTO programs (id, institution_id, program_name, program_code, degree, duration, level, academic_year, intake) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9), ($10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [progA1Id, instAId, "Computer Science (T1)", "CS01", "B.Tech", 4, "UG", "2023-24", 60,
       progA2Id, instAId, "Electrical Engineering (T1)", "EE01", "B.Tech", 4, "UG", "2023-24", 60]
    );

    // 4. Insert Users
    console.log("Inserting test users...");
    await client.query(
        `INSERT INTO users (id, email, password_hash, role, institution_id, program_id) VALUES 
        ($1, 'super@c2e.com', $2, 'SUPER_ADMIN', NULL, NULL),
        ($3, 'inst-a@test.com', $2, 'INSTITUTE_ADMIN', $4, NULL),
        ($5, 'prog-a1@test.com', $2, 'PROGRAM_ADMIN', $4, $6),
        ($7, 'prog-a2@test.com', $2, 'PROGRAM_ADMIN', $4, $8),
        ($9, 'inst-b@test.com', $2, 'INSTITUTE_ADMIN', $10, NULL)`,
        [superAdminId, hashedPassword, instAdminAId, instAId, progAdminA1Id, progA1Id, progAdminA2Id, progA2Id, instAdminBId, instBId]
    );

    console.log("--- SEEDING COMPLETE ---");
    console.log("Test Context (use these for verification):");
    console.log(`- Super Admin: super@c2e.com / TestPass123!`);
    console.log(`- Institute Admin A: inst-a@test.com / TestPass123! (ID: ${instAdminAId}, Inst: ${instAId})`);
    console.log(`- Program Admin A1: prog-a1@test.com / TestPass123! (ID: ${progAdminA1Id}, Inst: ${instAId}, Prog: ${progA1Id})`);
    console.log(`- Program Admin A2: prog-a2@test.com / TestPass123! (ID: ${progAdminA2Id}, Inst: ${instAId}, Prog: ${progA2Id})`);
    console.log(`- Institute Admin B: inst-b@test.com / TestPass123! (ID: ${instAdminBId}, Inst: ${instBId})`);

  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
