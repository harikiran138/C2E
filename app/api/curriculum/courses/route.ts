import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * GET /api/curriculum/courses?programId=<uuid>[&curriculumId=<uuid>][&versionId=<uuid>]
 *
 * Returns courses from curriculum_generated_courses.
 * Uses direct pg queries to bypass Supabase RLS (custom JWT auth not recognized by Supabase auth.uid()).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const versionId = String(searchParams.get("versionId") || "").trim();
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
      } else if (versionId && isValidUUID(versionId)) {
        params.push(versionId);
        filterClause = `AND version_id = $${params.length}`;
      }
      // If neither is provided, return all courses for the program (no null filter)

      const result = await client.query(
        `SELECT *
         FROM curriculum_generated_courses
         WHERE program_id = $1 ${filterClause}
         ORDER BY semester ASC, course_code ASC`,
        params,
      );

      return NextResponse.json({ courses: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Courses fetch error:", error.message, error.code);
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
