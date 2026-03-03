import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ valid: false }, { status: 400 });

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT 1 FROM jwt_blocklist WHERE token = $1 LIMIT 1",
        [token],
      );
      if (result.rows.length > 0) {
        return NextResponse.json({ valid: false, reason: "blocklisted" });
      }
      return NextResponse.json({ valid: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
