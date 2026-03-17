
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  try {
    const programId = '7a60bdb6-6af1-4e7a-93e2-e26d8c0eb42e'; // Use one of the existing IDs found earlier
    console.log(`Verifying program context for ID: ${programId}`);
    
    // Test the specific query that was failing
    const res = await pool.query(
      `SELECT
        id,
        program_name,
        peo_po_matrix,
        consistency_matrix
       FROM programs
       WHERE id = $1`,
      [programId]
    );
    
    console.log("Query Result Row:", res.rows[0]);
    
    if (res.rows.length > 0) {
      console.log("Verification SUCCESS: peo_po_matrix column is queryable.");
    } else {
      console.log("Verification NOTE: Program not found, but query succeeded (no column error).");
    }

  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
