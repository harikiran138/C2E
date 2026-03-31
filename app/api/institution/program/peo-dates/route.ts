import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const tokenPayload = await verifyToken(token);
  return (tokenPayload?.id as string) || null;
}

export async function PUT(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const programId = String(body?.program_id || "").trim();
    if (!programId) {
      return NextResponse.json(
        { error: "Program ID is required." },
        { status: 400 },
      );
    }

    const {
      peo_brainstorming_start_date,
      peo_brainstorming_end_date,
      peo_feedback_start_date,
      peo_feedback_end_date,
      peo_consolidation_start_date,
      peo_consolidation_end_date,
    } = body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE programs
         SET
           peo_brainstorming_start_date = $2,
           peo_brainstorming_end_date = $3,
           peo_feedback_start_date = $4,
           peo_feedback_end_date = $5,
           peo_consolidation_start_date = $6,
           peo_consolidation_end_date = $7,
           updated_at = NOW()
         WHERE id = $1 AND institution_id = $8
         RETURNING id`,
        [
          programId,
          peo_brainstorming_start_date || null,
          peo_brainstorming_end_date || null,
          peo_feedback_start_date || null,
          peo_feedback_end_date || null,
          peo_consolidation_start_date || null,
          peo_consolidation_end_date || null,
          institutionId,
        ],
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: "Program not found or unauthorized." },
          { status: 404 },
        );
      }

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating PEO dates:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update PEO dates." },
      { status: 500 },
    );
  }
}
