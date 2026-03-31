import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const vision =
      typeof body?.vision === "string" ? body.vision.trim() : null;
    const mission =
      typeof body?.mission === "string" ? body.mission.trim() : null;

    const cookieStore = await cookies();
    const token = cookieStore.get("institution_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenPayload = await verifyToken(token);
    if (!tokenPayload || !tokenPayload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const institutionId = tokenPayload.id as string;

    const client = await pool.connect();
    try {
      const updateResult = await client.query(
        `UPDATE institution_details
         SET vision = $2,
             mission = $3,
             updated_at = NOW()
         WHERE institution_id = $1
         RETURNING institution_id`,
        [institutionId, vision, mission],
      );
      if (updateResult.rowCount === 0) {
        return NextResponse.json(
          {
            error:
              "Institution profile is missing. Save institution details before editing Vision and Mission.",
          },
          { status: 409 },
        );
      }

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
