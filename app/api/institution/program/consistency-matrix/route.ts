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
      const result = await client.query(
        `UPDATE programs 
         SET consistency_matrix = $1, updated_at = NOW()
         WHERE id = $2 AND institution_id = $3
         RETURNING id`,
        [consistency_matrix, program_id, institutionId],
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Program not found or unauthorized" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Consistency Matrix Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
