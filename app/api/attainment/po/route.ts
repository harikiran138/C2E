import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { normalizeAcademicYear } from "@/lib/curriculum/attainment";

interface ComputePOAttainmentRequest {
  programId?: string;
  curriculumId?: string | null;
  academicYear?: string;
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

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
           id,
           program_id,
           curriculum_id,
           po_id,
           attainment_value,
           academic_year,
           approval_status,
           approved_by,
           approved_at,
           created_at,
           updated_at
         FROM po_attainment
         WHERE ${filters.join(" AND ")}
         ORDER BY po_id ASC, academic_year DESC`,
        params,
      );

      return NextResponse.json({ entries: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PO attainment fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch PO attainment." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ComputePOAttainmentRequest;
    const programId = String(body.programId || "").trim();
    const curriculumId = String(body.curriculumId || "").trim() || null;
    const academicYear = normalizeAcademicYear(body.academicYear);

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const poAggregation = await client.query<{
        po_id: number;
        attainment_value: string;
      }>(
        `SELECT
            map.po_id AS po_id,
            ROUND(SUM(co.calculated_attainment * map.strength::numeric)::numeric, 2) AS attainment_value
         FROM co_attainment co
         INNER JOIN co_po_mapping map
           ON map.program_id = co.program_id
          AND map.course_code = co.course_code
          AND map.co_code = co.co_code
          AND map.curriculum_id IS NOT DISTINCT FROM co.curriculum_id
         WHERE co.program_id = $1
           AND co.curriculum_id IS NOT DISTINCT FROM $2::uuid
           AND co.academic_year = $3
         GROUP BY map.po_id
         ORDER BY map.po_id ASC`,
        [programId, curriculumId, academicYear],
      );

      if (poAggregation.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:
              "No PO attainment could be computed. Ensure CO attainment and CO-PO mapping data exist for this academic year.",
          },
          { status: 400 },
        );
      }

      const upsertedRows: any[] = [];
      for (const row of poAggregation.rows) {
        if (!curriculumId) {
          await client.query(
            `DELETE FROM po_attainment
             WHERE program_id = $1
               AND curriculum_id IS NULL
               AND po_id = $2
               AND academic_year = $3`,
            [programId, row.po_id, academicYear],
          );
        }

        const result = await client.query(
          `INSERT INTO po_attainment (
              program_id,
              curriculum_id,
              po_id,
              attainment_value,
              academic_year,
              updated_at
           ) VALUES ($1, $2, $3, $4, $5, NOW())
           ${curriculumId ? `ON CONFLICT (program_id, curriculum_id, po_id, academic_year)
           DO UPDATE SET
             attainment_value = EXCLUDED.attainment_value,
             updated_at = NOW()` : ""}
           RETURNING *`,
          [programId, curriculumId, row.po_id, Number(row.attainment_value || 0), academicYear],
        );
        upsertedRows.push(result.rows[0]);
      }

      await client.query("COMMIT");
      return NextResponse.json({
        entries: upsertedRows,
        formula: "PO_Attainment = Σ (CO_Attainment × CO_PO_Strength)",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PO attainment compute error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compute PO attainment." },
      { status: 500 },
    );
  }
}
