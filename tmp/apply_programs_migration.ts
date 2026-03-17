
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log("Applying migration to add peo_po_matrix and consistency_matrix to programs...");
    
    await pool.query(`
      ALTER TABLE public.programs 
      ADD COLUMN IF NOT EXISTS peo_po_matrix JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS consistency_matrix JSONB DEFAULT NULL;
    `);
    
    console.log("Migration successful.");
    
    // Verify
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'programs'");
    const cols = res.rows.map(r => r.column_name);
    console.log("Current columns in programs:", cols);
    
    if (cols.includes('peo_po_matrix') && cols.includes('consistency_matrix')) {
       console.log("Verification PASSED: Columns exist.");
    } else {
       console.error("Verification FAILED: Columns missing.");
    }

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

migrate();
