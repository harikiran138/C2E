import { Client } from "pg";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const context = JSON.parse(fs.readFileSync("audit_context.json", "utf8"));

async function testRLS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const user = context.users.PA1; // Programmer Admin 1
    const userInstId = context.institutions.A.id;
    const userProgId = context.programs.P1.id;
    const targetProgId = context.programs.P2.id;

    console.log(`👤 Attacker: PA1 (Program ${userProgId.slice(0,8)})`);
    console.log(`🎯 Target: Program ${targetProgId.slice(0,8)}`);

    await client.query("BEGIN");
    
    // Inject Mock Auth
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS 'SELECT current_setting(''request.jwt.claims'', true)::jsonb' LANGUAGE sql STABLE;
    `);

    await client.query(`SET LOCAL request.jwt.claims = $1`, [JSON.stringify({ 
        sub: user.id, 
        role: "authenticated",
        user_role: "PROGRAM_ADMIN",
        institution_id: userInstId,
        program_id: userProgId
    })]);
    
    await client.query(`SET LOCAL role = 'authenticated'`);

    console.log("\n🔍 Running query as PA1 targeting P2 PSOs...");
    const res = await client.query(`SELECT id, program_id FROM public.program_psos WHERE program_id = $1`, [targetProgId]);
    console.table(res.rows);
    
    if (res.rows.length === 0) {
        console.log("✅ SUCCESS: Isolation works. No rows found.");
    } else {
        console.error("🚨 FAILURE: Leak detected! PA1 can see PA2's data!");
    }

    await client.query("ROLLBACK");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

testRLS();
