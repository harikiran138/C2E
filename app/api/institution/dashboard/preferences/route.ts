import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("institution_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = payload.id;

    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT enabled_modules, layout_order FROM dashboard_preferences WHERE user_id = $1 AND program_id = $2",
        [userId, programId],
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ enabled_modules: [], layout_order: [] });
      }

      return NextResponse.json(res.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Preferences GET API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { programId, enabled_modules, layout_order } = body;

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("institution_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = payload.id;

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO dashboard_preferences (user_id, program_id, enabled_modules, layout_order, updated_at)
             VALUES ($1, $2, $3, $4, now())
             ON CONFLICT (user_id, program_id)
             DO UPDATE SET enabled_modules = $3, layout_order = $4, updated_at = now()`,
        [userId, programId, enabled_modules || [], layout_order || []],
      );

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Preferences POST API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
