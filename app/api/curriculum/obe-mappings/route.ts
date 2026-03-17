import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * GET /api/curriculum/obe-mappings?programId=<uuid>[&curriculumId=<uuid>]
 * POST /api/curriculum/obe-mappings  { programId, curriculumId, mappings }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const curriculumId = String(searchParams.get("curriculumId") || "").trim();

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const params: unknown[] = [programId];
      let filterClause = "";

      if (curriculumId && isValidUUID(curriculumId)) {
        params.push(curriculumId);
        filterClause = `AND curriculum_id = $${params.length}`;
      } else {
        // No valid curriculumId — return rows where curriculum_id IS NULL
        filterClause = "AND curriculum_id IS NULL";
      }

      const result = await client.query(
        `SELECT * FROM curriculum_obe_mappings WHERE program_id = $1 ${filterClause}`,
        params,
      );

      return NextResponse.json({ mappings: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("OBE mappings fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch OBE mappings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const programId = String(body.programId || "").trim();
    const curriculumId = body.curriculumId && isValidUUID(String(body.curriculumId))
      ? String(body.curriculumId)
      : null;
    const mappings = body.mappings;

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    if (!mappings || typeof mappings !== "object") {
      return NextResponse.json({ error: "mappings object is required" }, { status: 400 });
    }

    const entries = Object.entries(mappings) as [string, any][];
    if (entries.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const client = await pool.connect();
    try {
      for (const [courseCode, mapping] of entries) {
        await client.query(
          `INSERT INTO curriculum_obe_mappings
            (program_id, curriculum_id, course_code, is_obe_core, category_override, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (program_id, curriculum_id, course_code)
           DO UPDATE SET
             is_obe_core = EXCLUDED.is_obe_core,
             category_override = EXCLUDED.category_override,
             updated_at = NOW()`,
          [
            programId,
            curriculumId,
            courseCode,
            !!mapping.isOBECore,
            mapping.categoryOverride || null,
          ],
        );
      }

      return NextResponse.json({ success: true, count: entries.length });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("OBE mappings save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save OBE mappings" },
      { status: 500 },
    );
  }
}
