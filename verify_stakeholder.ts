const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

// Use same env variable for local testing
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runStakeholderTests() {
    console.log("==========================================");
    console.log("   STAKEHOLDER E2E LOGIN TEST");
    console.log("==========================================\n");

    const BASE_URL = 'http://localhost:3000/api';
    const client = await pool.connect();

    let instId = "";
    let progId = "";
    let shId = "";
    let shRefId = "";

    try {
        // 1. Seed dummy data
        console.log("1. Seeding Data via Postgres...");
        await client.query("BEGIN");

        // Insert Institution
        instId = uuidv4();
        const instRes = await client.query(`
      INSERT INTO institutions (id, institution_name, email, password_hash, onboarding_status)
      VALUES ($1, $2, $3, $4, 'COMPLETED')
      RETURNING id
    `, [instId, "TEST_INSTITUTE", `test_${Date.now()}@example.com`, await bcrypt.hash("password", 10)]);

        // Insert Program
        progId = uuidv4();
        const progRes = await client.query(`
      INSERT INTO programs (id, institution_id, program_name, program_code)
      VALUES ($1, $2, 'TEST_PROGRAM', 'TP')
      RETURNING id
    `, [progId, instId]);

        // Insert Stakeholder
        const memberId = 'TEST-TP-001';
        shId = memberId;
        shRefId = uuidv4();
        const shRes = await client.query(`
      INSERT INTO representative_stakeholders (
        id, program_id, member_name, member_id, email, is_approved, login_password_hash, requires_password_change
      )
      VALUES ($1, $2, 'Test Stakeholder', $3, 'stakeholder@example.com', true, $4, true)
      RETURNING id
    `, [shRefId, progId, memberId, await bcrypt.hash("apassword", 10)]);

        await client.query("COMMIT");
        console.log(`  ✅ Inserted Inst: ${instId} | Prog: ${progId} | Stakeholder: ${shId}`);

        // 2. Test initial login (Should prompt for password change)
        console.log("\n2. Testing Stakeholder Login API...");
        const loginRes = await fetch(`${BASE_URL}/stakeholder/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institute_id: instId,
                program_id: progId,
                stakeholder_id: shId,
                stakeholder_password: 'apassword'
            })
        });

        let loginData;
        try {
            loginData = await loginRes.json();
        } catch (e: any) {
            console.error("Failed to parse login JSON. HTTP", loginRes.status);
        }

        if (loginRes.status === 403 && loginData?.requires_password_change) {
            console.log("  ✅ Expected 403 Forbidden with `requires_password_change`: true");

            console.log("\n3. Testing First-Time Password Change API...");
            const resetRes = await fetch(`${BASE_URL}/stakeholder/first-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stakeholder_ref_id: loginData.stakeholder_ref_id,
                    old_password: 'apassword',
                    new_password: 'new_secure_password'
                })
            });
            const resetData = await resetRes.json();
            if (resetData.ok) {
                console.log("  ✅ Password reset successful!");
            } else {
                console.error("  ❌ Password reset failed:", resetData);
            }

            console.log("\n4. Testing Login with New Password...");
            const loginRes2 = await fetch(`${BASE_URL}/stakeholder/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    institute_id: instId,
                    program_id: progId,
                    stakeholder_id: shId,
                    stakeholder_password: 'new_secure_password'
                })
            });
            const loginData2 = await loginRes2.json();
            if (loginData2.ok) {
                console.log("  ✅ Login successful with new password! Received token and session data.");
            } else {
                console.error("  ❌ Login failed with new password:", loginData2);
            }

        } else {
            console.error("  ❌ Login failed or did not request password change. Status:", loginRes.status, "Data:", loginData);
        }

    } catch (e: any) {
        await client.query("ROLLBACK");
        console.error("Test execution failed:", e.message);
    } finally {
        // Clean up
        if (instId) {
            console.log("\n5. Cleaning up database...");
            await client.query("DELETE FROM institutions WHERE id = $1", [instId]);
            console.log("  ✅ Cleanup completed");
        }
        client.release();
        pool.end();
        console.log("\n==========================================");
        console.log("   E2E TEST FINISHED");
        console.log("==========================================\n");
    }
}

runStakeholderTests();
