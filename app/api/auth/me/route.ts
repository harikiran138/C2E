import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    // Try both cookie names: 'institution_token' (set by login) and legacy 'c2e_auth_token'
    const token =
      cookieStore.get("institution_token")?.value ||
      cookieStore.get("c2e_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id || !payload.role) {
      return NextResponse.json({ authenticated: false, error: "Invalid session" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      let institution = null;
      let programs = [];

      // Logic based on Role (v5.1 Hierarchy)
      if (payload.role === 'SUPER_ADMIN') {
        // Super Admin sees all (or a summary)
        const insts = await client.query("SELECT id, institution_name, email FROM institutions");
        return NextResponse.json({
            authenticated: true,
            role: payload.role,
            user: { id: payload.id, email: payload.email },
            all_institutions: insts.rows
        });
      }

      if (
        payload.role === 'INSTITUTE_ADMIN' ||
        payload.role === 'institution_admin' ||
        payload.role === 'PROGRAM_ADMIN' ||
        payload.role === 'program_admin'
      ) {
        const instId = payload.institution_id || payload.id;
        
        // Fetch Institution
        const instRes = await client.query(
            "SELECT i.id, i.institution_name, i.email, id.vision, id.mission FROM institutions i LEFT JOIN institution_details id ON i.id = id.institution_id WHERE i.id = $1",
            [instId]
        );
        institution = instRes.rows[0];

        // Fetch Programs (Filtered if PROGRAM_ADMIN)
        let progQuery = "SELECT id, program_name, program_code, degree FROM programs WHERE institution_id = $1";
        const queryParams = [instId];

        if ((payload.role === 'PROGRAM_ADMIN' || payload.role === 'program_admin') && payload.program_id) {
            progQuery += " AND id = $2";
            queryParams.push(payload.program_id as string);
        }

        const progRes = await client.query(progQuery, queryParams);
        programs = progRes.rows;

        return NextResponse.json({
            authenticated: true,
            role: payload.role,
            institution,
            programs,
            user: { id: payload.id, email: payload.email }
        });
      }

      return NextResponse.json({ error: "Unknown Role" }, { status: 403 });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Auth Me Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
