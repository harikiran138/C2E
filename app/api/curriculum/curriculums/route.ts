import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = normalizeText(searchParams.get("programId"));

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
           id,
           program_id,
           regulation_year,
           version,
           total_credits,
           approval_status,
           approved_by,
           approved_at,
           created_at,
           updated_at
         FROM curriculums
         WHERE program_id = $1
         ORDER BY regulation_year DESC, version DESC`,
        [programId],
      );

      return NextResponse.json({ curriculums: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculums fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch curriculums." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const programId = normalizeText(body.programId);
    const regulationYear = Number(body.regulationYear);
    const version = normalizeText(body.version);
    const totalCredits = Number(body.totalCredits || 0) || null;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (!Number.isInteger(regulationYear) || regulationYear < 2000 || regulationYear > 2100) {
      return NextResponse.json({ error: "regulationYear must be a valid year." }, { status: 400 });
    }
    if (!version) {
      return NextResponse.json({ error: "version is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO curriculums (
            program_id,
            regulation_year,
            version,
            total_credits,
            approval_status,
            updated_at
         ) VALUES ($1, $2, $3, $4, 'draft', NOW())
         ON CONFLICT (program_id, regulation_year, version)
         DO UPDATE SET
           total_credits = COALESCE(EXCLUDED.total_credits, curriculums.total_credits),
           updated_at = NOW()
         RETURNING *`,
        [programId, regulationYear, version, totalCredits],
      );

      return NextResponse.json({ curriculum: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculum create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save curriculum." },
      { status: 500 },
    );
  }
}
