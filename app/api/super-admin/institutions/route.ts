import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        i.id,
        i.institution_name,
        i.email,
        i.onboarding_status as status,
        i.created_at,
        (SELECT COUNT(*) FROM public.programs p WHERE p.institution_id = i.id) as programs_count,
        (SELECT COUNT(*) FROM public.users u WHERE u.institution_id = i.id) as users_count
      FROM public.institutions i
      ORDER BY i.created_at DESC
    `);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("Super Admin Institutions Error:", error);
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const { institution_name, email, password } = await request.json();
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // 1. Create Institution
    const instRes = await client.query(
      "INSERT INTO public.institutions (institution_name, email, password_hash, onboarding_status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
      [institution_name, email, password] // TODO: Hash password before production insertion
    );
    const institutionId = instRes.rows[0].id;

    // 2. Create Institution Admin User
    await client.query(
      "INSERT INTO public.users (email, password_hash, role, institution_id) VALUES ($1, $2, 'INSTITUTE_ADMIN', $3)",
      [email, password, institutionId]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, id: institutionId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create institution:", error);
    return NextResponse.json({ error: "Failed to create institution" }, { status: 500 });
  } finally {
    client.release();
  }
}
