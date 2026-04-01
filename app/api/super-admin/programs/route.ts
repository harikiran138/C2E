import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        p.id,
        p.program_name,
        p.program_code,
        p.degree,
        p.level,
        p.status,
        p.created_at,
        i.institution_name,
        i.id as institution_id
      FROM public.programs p
      LEFT JOIN public.institutions i ON p.institution_id = i.id
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("Super Admin Programs Error:", error);
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  } finally {
    client.release();
  }
}
