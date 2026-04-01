import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        al.id,
        al.event_type,
        al.details,
        al.created_at,
        al.program_id,
        p.program_name,
        i.institution_name
      FROM public.audit_logs al
      LEFT JOIN public.programs p ON al.program_id = p.id
      LEFT JOIN public.institutions i ON p.institution_id = i.id
      ORDER BY al.created_at DESC
      LIMIT 50
    `);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("Super Admin Logs Error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  } finally {
    client.release();
  }
}
