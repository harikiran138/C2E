import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { signToken, verifyToken } from "@/lib/auth";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const tokenPayload = await verifyToken(token);
  return (tokenPayload?.id as string) || null;
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Check institution details by joining with institution_details
      const instResult = await client.query(
        `SELECT 
          i.id, 
          id.type as institution_type, 
          id.status as institution_status, 
          id.established_year, 
          id.affiliation as university_affiliation, 
          id.city, 
          id.state, 
          i.email 
         FROM institutions i
         LEFT JOIN institution_details id ON i.id = id.institution_id
         WHERE i.id = $1`,
        [institutionId],
      );

      const details = instResult.rows[0];
      if (!details) {
        return NextResponse.json(
          { error: "Institution record not found." },
          { status: 400 },
        );
      }

      // Validate required fields
      const isValid =
        details.institution_type &&
        details.established_year >= 1800 &&
        details.city &&
        details.state;

      if (!isValid) {
        return NextResponse.json(
          { error: "Institution details are incomplete." },
          { status: 400 },
        );
      }

      // Check programs
      const progResult = await client.query(
        "SELECT COUNT(*) as count FROM programs WHERE institution_id = $1",
        [institutionId],
      );

      const programCount = parseInt(progResult.rows[0]?.count || "0");
      if (programCount < 1) {
        return NextResponse.json(
          { error: "At least one program is required." },
          { status: 400 },
        );
      }

      // Mark completed
      await client.query(
        "UPDATE institutions SET onboarding_status = $1, updated_at = NOW() WHERE id = $2",
        ["COMPLETED", institutionId],
      );

      // Re-issue token with COMPLETED status
      const email = details.email;

      const jwt = await signToken({
        id: institutionId,
        email: email || "",
        role: "institution_admin",
        onboarding_status: "COMPLETED",
      });

      const response = NextResponse.json({ ok: true });
      response.cookies.set("institution_token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to complete onboarding." },
      { status: 500 },
    );
  }
}
