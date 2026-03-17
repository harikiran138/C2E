import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

export async function PUT(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { program_id, consistency_matrix } = await request.json();

    if (!program_id || !consistency_matrix) {
      return NextResponse.json(
        { error: "Program ID and matrix required" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO consistency_matrix (program_id, matrix_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (program_id) 
         DO UPDATE SET matrix_data = $2, updated_at = NOW()`,
        [program_id, consistency_matrix]
      );

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Consistency Matrix Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
