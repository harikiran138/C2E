// Native fetch used (Node 22+)
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const CONCURRENCY = process.env.CONCURRENCY || 3;

async function stressTest() {
    console.log('🚀 Starting Hardcore Stress Test...');
    console.log(`📡 Base URL: ${BASE_URL}`);
    console.log(`🔥 Concurrency Level: ${CONCURRENCY}`);

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        // 1. Prepare Test Data
        const testProgramName = `Stress Test Program ${Date.now()}`;
        const testStakeholderEmail = `stress_${Date.now()}@test.com`;

        console.log('--- Phase 1: Authentication & Setup ---');

        // Login as Institution
        const loginRes = await fetch(`${BASE_URL}/api/institution/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'director@nillp.ai', password: 'DKMNILLP@5604' })
        });

        if (!loginRes.ok) {
            const errBody = await loginRes.json().catch(() => ({}));
            console.error('❌ Institution login failed:', loginRes.status, errBody);
            throw new Error('Institution login failed');
        }
        const setCookies = loginRes.headers.get('set-cookie');
        if (!setCookies) throw new Error('No cookie returned from institute login');

        // Extract cookies correctly for reuse
        const institutionCookie = setCookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
        console.log('🔹 Authentication Cookies extracted');
        const loginData = await loginRes.json();
        const instituteId = loginData.id;

        // Create Program
        const progRes = await fetch(`${BASE_URL}/api/institution/programs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': institutionCookie },
            body: JSON.stringify({
                program_name: testProgramName,
                degree: 'B.Tech',
                level: 'UG',
                duration: 4,
                intake: 120,
                academic_year: '2024-2028',
                program_code: `STRESS-${Date.now()}`
            })
        });
        const progData = await progRes.json();
        if (!progRes.ok) {
            console.error('❌ Program Creation Failed:', progData);
            throw new Error(`Program creation failed: ${JSON.stringify(progData)}`);
        }
        const programId = progData.program.id;

        console.log(`✅ Test Program Created: ${programId}`);

        // 2. Parallel AI Generation Stress
        console.log('--- Phase 2: Parallel AI Generation Stress ---');
        const aiTasks = Array.from({ length: CONCURRENCY }).map((_, i) => (async () => {
            const start = Date.now();
            const res = await fetch(`${BASE_URL}/api/generate/peos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programName: testProgramName,
                    count: 5,
                    vision: "To be a global leader in engineering education.",
                    missions: ["To provide quality education.", "To foster innovation."],
                    priorities: ["Innovation", "Ethics"],
                    institutionContext: "Leading technical institute."
                })
            });
            const duration = Date.now() - start;
            if (res.ok) {
                console.log(`   [AI Task ${i + 1}] Success in ${duration}ms`);
                return await res.json();
            } else {
                console.error(`   [AI Task ${i + 1}] Failed with status ${res.status}`);
                return null;
            }
        })());

        const results = await Promise.all(aiTasks);
        const successCount = results.filter(r => r !== null).length;
        console.log(`📊 AI Stress Results: ${successCount}/${CONCURRENCY} successful`);

        // 3. Security Boundary Test
        console.log('--- Phase 3: Security Boundary Testing ---');

        // Create an UNAPPROVED stakeholder
        const stalkRes = await fetch(`${BASE_URL}/api/institution/stakeholders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': institutionCookie },
            body: JSON.stringify({
                program_id: programId,
                member_name: 'Stress Test User',
                email: testStakeholderEmail,
                organization: 'Stress Lab',
                category: 'Employer'
            })
        });
        const stalkData = await stalkRes.json();
        if (!stalkRes.ok) {
            console.error('❌ Stakeholder Creation Failed:', stalkData);
            throw new Error(`Stakeholder creation failed: ${JSON.stringify(stalkData)}`);
        }

        // Use canonical API payload shape
        const stakeholderMemberId = stalkData?.data?.member_id;
        if (!stakeholderMemberId) {
            throw new Error(`Stakeholder member_id missing in response: ${JSON.stringify(stalkData)}`);
        }
        console.log(`✅ Stakeholder Created: ${stakeholderMemberId} (Needs Approval)`);

        // Attempt Login as Unapproved
        const unapprovedLogin = await fetch(`${BASE_URL}/api/stakeholder/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institute_id: instituteId,
                program_id: programId,
                stakeholder_id: stakeholderMemberId,
                stakeholder_password: 'apassword'
            })
        });

        if (unapprovedLogin.status === 403) {
            console.log('✅ PASS: Unauthorized login correctly blocked (403)');
        } else {
            console.error(`❌ FAIL: Unauthorized login returned ${unapprovedLogin.status}`);
        }

    } catch (error) {
        console.error('💥 Stress Test Crashed:', error);
    } finally {
        client.release();
        await pool.end();
        console.log('--- Stress Test Complete ---');
    }
}

stressTest();
