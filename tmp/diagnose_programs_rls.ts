import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnose() {
  try {
    console.log("Checking RLS policies for programs...");
    const policiesRes = await pool.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'programs'
    `);
    console.log("Programs Policies:", policiesRes.rows);

    const rlsRes = await pool.query(`
      SELECT relname, relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = 'programs'
    `);
    console.log("Programs RLS Status:", rlsRes.rows);

  } catch (err) {
    console.error("Diagnosis error:", err);
  } finally {
    await pool.end();
  }
}

diagnose();
