import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnose() {
  try {
    console.log("Checking tables...");
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name = 'curriculum_generated_courses' 
           OR table_name = 'curriculum_feedback'
           OR table_name = 'stakeholder_feedback')
    `);
    console.log("Existing tables:", tablesRes.rows.map(r => r.table_name));

    if (tablesRes.rows.some(r => r.table_name === 'curriculum_generated_courses')) {
      console.log("\nChecking columns for curriculum_generated_courses...");
      const colsRes = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'curriculum_generated_courses'
      `);
      console.log("Columns:", colsRes.rows.map(r => `${r.column_name} (${r.data_type})`));
    }

    if (tablesRes.rows.some(r => r.table_name === 'curriculum_feedback')) {
      console.log("\nChecking columns for curriculum_feedback...");
      const colsRes = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'curriculum_feedback'
      `);
      console.log("Columns:", colsRes.rows.map(r => `${r.column_name} (${r.data_type})`));
    }

    console.log("\nChecking RLS policies...");
    const policiesRes = await pool.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND (tablename = 'curriculum_generated_courses' 
           OR tablename = 'curriculum_feedback')
    `);
    console.log("Policies:", policiesRes.rows);

    const rlsRes = await pool.query(`
      SELECT relname, relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname IN ('curriculum_generated_courses', 'curriculum_feedback')
    `);
    console.log("RLS Status:", rlsRes.rows);

  } catch (err) {
    console.error("Diagnosis error:", err);
  } finally {
    await pool.end();
  }
}

diagnose();
