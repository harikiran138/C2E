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

    const tokenPayload = await verifyToken(token);
    if (!tokenPayload || !tokenPayload.id) {
      return NextResponse.json(
        { authenticated: false, error: "Invalid token" },
        { status: 401 },
      );
    }
    const institutionId = tokenPayload.id as string;

    const client = await pool.connect();
    try {
      // Fetch Institution details by joining with institution_details
      const instRes = await client.query(
        `SELECT 
          i.id, 
          i.institution_name, 
          i.email, 
          id.type as institution_type, 
          id.status as institution_status, 
          id.city, 
          id.state, 
          id.vision, 
          id.mission, 
          i.onboarding_status 
         FROM institutions i
         LEFT JOIN institution_details id ON i.id = id.institution_id
         WHERE i.id = $1`,
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
        `SELECT 
          p.id, 
          p.program_name, 
          p.program_code, 
          p.degree, 
          p.intake, 
          p.duration,
          p.vision,
          p.mission,
          cm.matrix_data as consistency_matrix 
         FROM programs p 
         LEFT JOIN consistency_matrix cm ON p.id = cm.program_id
         WHERE p.institution_id = $1 
         ORDER BY p.program_name ASC`,
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
