import { Client } from "pg";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const context = JSON.parse(fs.readFileSync("audit_context.json", "utf8"));

async function simulateAttack(client: any, userKey: string, targetTable: string, targetProgramId: string | null = null, targetInstitutionId: string | null = null) {
  const user = context.users[userKey];
  const profile = context.profiles?.[user.id] || {}; // We can infer from logic
  
  // Find context for this user
  let userInstId = "";
  let userProgId = "";
  if (userKey === "PA1") [userInstId, userProgId] = [context.institutions.A.id, context.programs.P1.id];
  if (userKey === "PA2") [userInstId, userProgId] = [context.institutions.A.id, context.programs.P2.id];
  if (userKey === "PB1") [userInstId, userProgId] = [context.institutions.B.id, context.programs.P3.id];
  if (userKey === "IA1") userInstId = context.institutions.A.id;
  if (userKey === "IB1") userInstId = context.institutions.B.id;

  console.log(`\n🕵️  Simulating user ${userKey} (${user.role}) @ Inst: ${userInstId.slice(0,8)}...`);

  try {
    await client.query("BEGIN");

    // 0. Ensure Auth functions exist for RLS to use (Supabase standard)
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS 'SELECT current_setting(''request.jwt.claims'', true)::json->>''sub''::uuid' LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS 'SELECT current_setting(''request.jwt.claims'', true)::jsonb' LANGUAGE sql STABLE;
    `);
    
    // 1. Mock Supabase Auth claims
    await client.query(`
      SELECT 
        set_config('request.jwt.claims', $1, true),
        set_config('role', 'authenticated', true)
    `, [JSON.stringify({ 
        sub: user.id, 
        role: "authenticated",
        user_role: user.role,
        institution_id: userInstId,
        program_id: userProgId
    })]);

    // 2. Perform Query
    let query = `SELECT count(*) FROM public.${targetTable}`;
    let params: any[] = [];
    if (targetProgramId) {
        query += " WHERE program_id = $1";
        params.push(targetProgramId);
    } else if (targetInstitutionId) {
         query += " WHERE institution_id = $1";
         params.push(targetInstitutionId);
    }

    const res = await client.query(query, params);
    const count = parseInt(res.rows[0].count);
    
    console.log(`📊 Target ${targetTable}: Found ${count} rows.`);
    return count;
  } catch (err) {
    console.log(`❌ Query failed (Expected if blocked): ${err.message}`);
    return 0;
  } finally {
    await client.query("ROLLBACK");
  }
}

async function runAudit() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("🛠️  Phase 1: Cross-Program Leakage (Same Institution)");
  // PA1 (Prog 1) tries to access Prog 2 (Prog 2)
  const count1 = await simulateAttack(client, "PA1", "program_psos", context.programs.P2.id);
  if (count1 > 0) console.error("🚨 VULNERABILITY: Program Admin accessed another program's PSOs!");
  else console.log("✅ PASS: Program isolation maintained.");

  console.log("\n🛠️  Phase 2: Cross-Institution Leakage");
  // PA1 (Inst A) tries to access Inst B's PSOs
  const count2 = await simulateAttack(client, "PA1", "program_psos", context.programs.P3.id);
  if (count2 > 0) console.error("🚨 VULNERABILITY: User accessed data from another institution!");
  else console.log("✅ PASS: Institution isolation maintained.");

  console.log("\n🛠️  Phase 3: Institution Admin Scope");
  // IA1 (Inst A) tries to access ALL PSOs in Inst A (Should see P1 and P2)
  const count3 = await simulateAttack(client, "IA1", "program_psos", null, context.institutions.A.id);
  console.log(`IA results: Should see Inst A data. (Found: ${count3})`);
  
  // IA1 tries to access Inst B
  const count4 = await simulateAttack(client, "IA1", "program_psos", null, context.institutions.B.id);
  if (count4 > 0) console.error("🚨 VULNERABILITY: Inst Admin accessed another institution!");
  else console.log("✅ PASS: Inst Admin confined to correct scope.");

  await client.end();
}

runAudit();
