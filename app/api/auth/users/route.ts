import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("c2e_auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'INSTITUTE_ADMIN') {
        return NextResponse.json({ error: "Forbidden: Institute Admin only" }, { status: 403 });
    }

    const instId = payload.institution_id || payload.id;
    const client = await pool.connect();
    try {
      // List all program admins for this institution
      const res = await client.query(
        `SELECT u.id, u.email, u.role, u.program_id, p.program_name 
         FROM users u
         LEFT JOIN programs p ON u.program_id = p.id
         WHERE u.institution_id = $1 AND u.role = 'PROGRAM_ADMIN'
         ORDER BY u.created_at DESC`,
        [instId]
      );
      return NextResponse.json({ users: res.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("c2e_auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'INSTITUTE_ADMIN') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, password, program_id } = await request.json();
    if (!email || !password || !program_id) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const instId = payload.institution_id || payload.id;
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const client = await pool.connect();
    try {
      // 1. Check if user exists
      const check = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (check.rows.length > 0) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
      }

      // 2. Create Program Admin
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, institution_id, program_id, created_at)
         VALUES ($1, $2, $3, 'PROGRAM_ADMIN', $4, $5, NOW())`,
        [userId, email, hashedPassword, instId, program_id]
      );

      return NextResponse.json({ ok: true, userId });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("User Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
