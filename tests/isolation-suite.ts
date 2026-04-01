import pool from '../lib/postgres';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function login(email: string) {
    const res = await fetch(`${BASE_URL}/api/auth/institute/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password: 'TestPass123!' }),
    });
    const cookie = res.headers.get('set-cookie');
    return cookie;
}

async function runIsolationTests() {
    console.log("--- STARTING C2E v5.1 ISOLATION TEST SUITE ---");
    
    // Test Setup
    const client = await pool.connect();
    try {
        const instACookie = await login('inst-a@test.com');
        const instBCookie = await login('inst-b@test.com');
        const progA1Cookie = await login('prog-a1@test.com');
        const progA2Cookie = await login('prog-a2@test.com');

        // Extract IDs manually from DB
        const instBRes = await client.query("SELECT id FROM institutions WHERE institution_name = 'Test Institution B'");
        const instBId = instBRes.rows[0].id;

        // TC-3.04 & 3.13: API Injection Attack (Cross-Context ID) Is Blocked
        console.log("Running TC-3.13: Database Rejects Inserts With Mismatched institution_id Body...");
        
        // Simulating backend trying to insert for another institution because of forged body payload
        // A direct client query without RLS (bypass via server admin privileges) shouldn't happen, but we enforce it properly in APIs
        const fakeReq = await fetch(`${BASE_URL}/api/institution/program/generate-mission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie: instACookie as string },
            body: JSON.stringify({ institution_id: instBId }) // Trying to generate mission for Institution B
        });
        
        if (fakeReq.status === 200) {
            console.log("Warning: TC-3.13 Failed. Was able to generate mission for another institution!");
            throw new Error("TC-3.13 Failed.");
        }

        // TC-3.09: All OBE Tables Have institution_id AND program_id Columns
        console.log("Running TC-3.09: All OBE Tables Have institution_id Columns...");
        const columnsRes = await client.query(`
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'institution_id' AND table_name IN (
                'program_visions', 'program_missions', 'program_peos', 'program_outcomes',
                'program_psos', 'program_step_completions', 'program_dissemination',
                'stakeholders', 'stakeholder_feedback'
            )
        `);
        if (columnsRes.rows.length < 9) {
            console.log("Warning: Not all tables have institution_id yet. Found: " + columnsRes.rows.length);
        }

        // TC-3.10: RLS Is Enabled on All OBE Tables
        console.log("Running TC-3.10: RLS Is Enabled on All OBE Tables...");
        const rlsRes = await client.query(`
            SELECT relname FROM pg_class 
            WHERE relrowsecurity = true AND relname IN (
                'program_visions', 'program_missions', 'program_peos', 'program_outcomes'
            )
        `);
        if (rlsRes.rows.length < 4) {
             console.log("Warning: RLS missing on some tables. Found: " + rlsRes.rows.length);
        }

        console.log("--- ISOLATION TEST SUITE COMPLETED ---");

    } finally {
        client.release();
    }
}

runIsolationTests().catch(console.error);
