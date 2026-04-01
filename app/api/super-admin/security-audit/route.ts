import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  const client = await pool.connect();
  try {
    // 1. Check RLS status on critical tables
    const rlsCheck = await client.query(`
      SELECT 
        schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('programs', 'institutions', 'users', 'audit_logs', 'psos', 'peos', 'pos', 'cos')
      ORDER BY tablename
    `);

    // 2. Tables missing program_id (isolation risk)
    const isolationCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
        AND c.column_name = 'program_id'
      )
      AND t.table_name NOT IN ('institutions', 'users', 'programs', 'audit_logs')
      ORDER BY table_name
    `);

    // 3. Failed auth attempts (institutions with lockouts)
    const failedAuth = await client.query(`
      SELECT 
        institution_name, email, failed_attempts, locked_until
      FROM public.institutions
      WHERE failed_attempts > 0
      ORDER BY failed_attempts DESC
      LIMIT 10
    `);

    // 4. Database size
    const dbSize = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
    `);

    // 5. Table row counts
    const tableCounts = await client.query(`
      SELECT 
        relname as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `);

    return NextResponse.json({
      rls_status: rlsCheck.rows,
      isolation_risks: isolationCheck.rows,
      failed_auth_attempts: failedAuth.rows,
      database_size: dbSize.rows[0]?.db_size || 'Unknown',
      table_counts: tableCounts.rows,
    });
  } catch (error) {
    console.error("Super Admin Security Audit Error:", error);
    return NextResponse.json({ error: "Failed to run security audit" }, { status: 500 });
  } finally {
    client.release();
  }
}
