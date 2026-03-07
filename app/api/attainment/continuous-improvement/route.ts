import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { normalizeAcademicYear } from "@/lib/curriculum/attainment";

interface ContinuousImprovementRecordInput {
  id?: string;
  poId?: number;
  issueIdentified?: string;
  actionTaken?: string;
  nextCyclePlan?: string;
  academicYear?: string;
}

interface UpsertContinuousImprovementRequest {
  programId?: string;
  curriculumId?: string | null;
  records?: ContinuousImprovementRecordInput[];
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizePoId(value: unknown): number {
  const poId = Number(value || 0);
  return Number.isInteger(poId) && poId >= 1 && poId <= 12 ? poId : 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = normalizeText(searchParams.get("programId"));
    const curriculumId = normalizeText(searchParams.get("curriculumId"));
    const academicYear = normalizeText(searchParams.get("academicYear"));
    const poId = normalizePoId(searchParams.get("poId"));

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const whereClauses: string[] = ["program_id = $1"];
    const params: unknown[] = [programId];

    if (curriculumId) {
      whereClauses.push(`curriculum_id = $${params.length + 1}`);
      params.push(curriculumId);
    } else {
      whereClauses.push("curriculum_id IS NULL");
    }

    if (academicYear) {
      whereClauses.push(`academic_year = $${params.length + 1}`);
      params.push(academicYear);
    }

    if (poId > 0) {
      whereClauses.push(`po_id = $${params.length + 1}`);
      params.push(poId);
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
           id,
           program_id,
           curriculum_id,
           po_id,
           issue_identified,
           action_taken,
           next_cycle_plan,
           academic_year,
           approval_status,
           approved_by,
           approved_at,
           created_at,
           updated_at
         FROM continuous_improvement
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY academic_year DESC, po_id ASC, updated_at DESC`,
        params,
      );

      return NextResponse.json({ records: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Continuous improvement fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch continuous improvement records." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpsertContinuousImprovementRequest;
    const programId = normalizeText(body.programId);
    const curriculumId = normalizeText(body.curriculumId) || null;
    const records = Array.isArray(body.records) ? body.records : [];

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "records array must not be empty" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const savedRecords: any[] = [];
      for (const record of records) {
        const poId = normalizePoId(record.poId);
        const issueIdentified = normalizeText(record.issueIdentified);
        const actionTaken = normalizeText(record.actionTaken);
        const nextCyclePlan = normalizeText(record.nextCyclePlan);
        const academicYear = normalizeAcademicYear(record.academicYear);

        if (!poId || !issueIdentified || !actionTaken) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              error:
                "Each record requires valid poId (1-12), issueIdentified, and actionTaken fields.",
            },
            { status: 400 },
          );
        }

        if (record.id) {
          const updateResult = await client.query(
            `UPDATE continuous_improvement
             SET
               po_id = $1,
               issue_identified = $2,
               action_taken = $3,
               next_cycle_plan = $4,
               academic_year = $5,
               updated_at = NOW()
             WHERE id = $6
               AND program_id = $7
               AND curriculum_id IS NOT DISTINCT FROM $8::uuid
             RETURNING *`,
            [
              poId,
              issueIdentified,
              actionTaken,
              nextCyclePlan || null,
              academicYear,
              record.id,
              programId,
              curriculumId,
            ],
          );

          if (updateResult.rows.length > 0) {
            savedRecords.push(updateResult.rows[0]);
            continue;
          }
        }

        const insertResult = await client.query(
          `INSERT INTO continuous_improvement (
              program_id,
              curriculum_id,
              po_id,
              issue_identified,
              action_taken,
              next_cycle_plan,
              academic_year,
              updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING *`,
          [
            programId,
            curriculumId,
            poId,
            issueIdentified,
            actionTaken,
            nextCyclePlan || null,
            academicYear,
          ],
        );

        savedRecords.push(insertResult.rows[0]);
      }

      await client.query("COMMIT");
      return NextResponse.json({ records: savedRecords });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Continuous improvement save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save continuous improvement records." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = normalizeText(searchParams.get("programId"));
    const id = normalizeText(searchParams.get("id"));

    if (!programId || !id) {
      return NextResponse.json({ error: "programId and id are required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM continuous_improvement
         WHERE id = $1
           AND program_id = $2
         RETURNING id`,
        [id, programId],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Continuous improvement delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete continuous improvement record." },
      { status: 500 },
    );
  }
}
