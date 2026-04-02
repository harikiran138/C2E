import pool from "./lib/postgres";
import fs from "fs";
import path from "path";

async function runMigration() {
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20260331_fix_auth_constraints.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  console.log("Running migration...");
  try {
    await pool.query(sql);
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigration();
