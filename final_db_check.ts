import pool from "./lib/postgres";

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Current Tables:", res.rows.map((r: any) => r.table_name));
    
    // Check for specific critical tables
    const criticalTables = ['institutions', 'institution_details', 'programs', 'stakeholder_feedback', 'audit_logs'];
    for (const table of criticalTables) {
      const exists = res.rows.some((r: any) => r.table_name === table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);
    }

  } catch (err) {
    console.error("Database connection failed:", err.message);
  } finally {
    process.exit();
  }
}

check();
