import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { calculateCOAttainment, normalizeAcademicYear } from "@/lib/curriculum/attainment";

interface COAttainmentEntryInput {
  courseId?: string | null;
  coId?: string | null;
  courseCode?: string;
  coCode?: string;
  internalScore?: number;
  externalScore?: number;
}

interface UpsertCOAttainmentRequest {
  programId?: string;
  curriculumId?: string | null;
  academicYear?: string;
  entries?: COAttainmentEntryInput[];
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const curriculumId = String(searchParams.get("curriculumId") || "").trim();
    const academicYear = String(searchParams.get("academicYear") || "").trim();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const filters: string[] = ["program_id = $1"];
    const params: any[] = [programId];

    if (curriculumId) {
      filters.push(`curriculum_id = $${params.length + 1}`);
      params.push(curriculumId);
    } else {
      filters.push("curriculum_id IS NULL");
    }

    if (academicYear) {
      filters.push(`academic_year = $${params.length + 1}`);
      params.push(academicYear);
    }

    const query = `
      SELECT
        id,
        program_id,
        curriculum_id,
        course_id,
        co_id,
        course_code,
        co_code,
        internal_score,
        external_score,
        calculated_attainment,
        academic_year,
        approval_status,
        approved_by,
        approved_at,
        created_at,
        updated_at
      FROM co_attainment
      WHERE ${filters.join(" AND ")}
      ORDER BY course_code ASC, co_code ASC, academic_year DESC
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return NextResponse.json({ entries: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("CO attainment fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch CO attainment." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpsertCOAttainmentRequest;
    const programId = String(body.programId || "").trim();
    const curriculumId = String(body.curriculumId || "").trim() || null;
    const academicYear = normalizeAcademicYear(body.academicYear);
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (entries.length === 0) {
      return NextResponse.json({ error: "entries array must not be empty" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const upsertedRows: any[] = [];
      for (const entry of entries) {
        const courseCode = normalizeCode(entry.courseCode);
        const coCode = normalizeCode(entry.coCode);
        if (!courseCode || !coCode) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Each entry requires courseCode and coCode." },
            { status: 400 },
          );
        }

        const internalScore = Number(entry.internalScore || 0);
        const externalScore = Number(entry.externalScore || 0);
        const calculatedAttainment = calculateCOAttainment({
          internalScore,
          externalScore,
        });

        if (!curriculumId) {
          await client.query(
            `DELETE FROM co_attainment
             WHERE program_id = $1
               AND curriculum_id IS NULL
               AND course_code = $2
               AND co_code = $3
               AND academic_year = $4`,
            [programId, courseCode, coCode, academicYear],
          );
        }

        const result = await client.query(
          `INSERT INTO co_attainment (
              program_id,
              curriculum_id,
              course_id,
              co_id,
              course_code,
              co_code,
              internal_score,
              external_score,
              calculated_attainment,
              academic_year,
              updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ${curriculumId ? `ON CONFLICT (program_id, curriculum_id, course_code, co_code, academic_year)
           DO UPDATE SET
             internal_score = EXCLUDED.internal_score,
             external_score = EXCLUDED.external_score,
             calculated_attainment = EXCLUDED.calculated_attainment,
             course_id = COALESCE(EXCLUDED.course_id, co_attainment.course_id),
             co_id = COALESCE(EXCLUDED.co_id, co_attainment.co_id),
             updated_at = NOW()` : ""}
           RETURNING *`,
          [
            programId,
            curriculumId,
            entry.courseId || null,
            entry.coId || null,
            courseCode,
            coCode,
            internalScore,
            externalScore,
            calculatedAttainment,
            academicYear,
          ],
        );
        upsertedRows.push(result.rows[0]);
      }

      await client.query("COMMIT");
      return NextResponse.json({
        entries: upsertedRows,
        formula: "CO_Attainment = (Internal_Assessment × 0.3) + (External_Exam × 0.7)",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("CO attainment upsert error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save CO attainment." },
      { status: 500 },
    );
  }
}
