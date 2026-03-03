import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("institution_token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { authenticated: false, error: "Invalid token" },
        { status: 401 },
      );
    }
    const institutionId = payload.id as string;

    const client = await pool.connect();
    try {
      // Fetch Institution details
      const instRes = await client.query(
        "SELECT id, institution_name, email, institution_type, institution_status, city, state, vision, mission, onboarding_status FROM institutions WHERE id = $1",
        [institutionId],
      );

      if (instRes.rows.length === 0) {
        return NextResponse.json(
          { authenticated: false, error: "Institution not found" },
          { status: 404 },
        );
      }

      const institution = instRes.rows[0];

      // Fetch Programs
      const progRes = await client.query(
        "SELECT id, program_name, program_code, degree, intake, duration FROM programs WHERE institution_id = $1 ORDER BY program_name ASC",
        [institutionId],
      );

      return NextResponse.json({
        authenticated: true,
        institution,
        programs: progRes.rows || [],
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Me API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
