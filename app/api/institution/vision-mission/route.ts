import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const { vision, mission } = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get("institution_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const institutionId = payload.id as string;

    const client = await pool.connect();
    try {
      await client.query(
        "UPDATE institutions SET vision = $1, mission = $2 WHERE id = $3",
        [vision, mission, institutionId],
      );

      return NextResponse.json({ success: true, vision, mission });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Vision/Mission Update API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
