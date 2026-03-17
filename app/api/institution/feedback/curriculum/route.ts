import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;
  return String(payload.id);
}

// GET: fetch curriculum feedback timeline + all stakeholder responses
export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Fetch program timeline fields
      const progRes = await client.query(
        `SELECT id, program_name,
                curriculum_feedback_start_at,
                curriculum_feedback_end_at,
                curriculum_feedback_status
         FROM programs
         WHERE id = $1 AND institution_id = $2 LIMIT 1`,
        [programId, institutionId],
      );
      if (progRes.rows.length === 0) {
        return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
      }
      const program = progRes.rows[0];

      const now = new Date();
      const startAt = program.curriculum_feedback_start_at
        ? new Date(program.curriculum_feedback_start_at)
        : null;
      const endAt = program.curriculum_feedback_end_at
        ? new Date(program.curriculum_feedback_end_at)
        : null;
      const isOpen = !!(startAt && endAt && now >= startAt && now <= endAt);

      // Fetch stakeholder responses
      const feedbackRes = await client.query(
        `SELECT
           cf.id,
           cf.stakeholder_id,
           cf.rating,
           cf.comments,
           cf.submitted_at,
           rs.member_name,
           rs.category,
           rs.organization
         FROM curriculum_feedback cf
         JOIN representative_stakeholders rs ON rs.id = cf.stakeholder_id
         WHERE cf.program_id = $1
         ORDER BY cf.submitted_at DESC`,
        [programId],
      );

      // Compliance checklist: check required steps are complete
      const completionRes = await client.query(
        `SELECT step_key, is_completed
         FROM program_step_completions
         WHERE program_id = $1
           AND step_key IN ('vision-mission','program-outcomes','pso','curriculum','course-outcomes')`,
        [programId],
      );
      const completionMap: Record<string, boolean> = {};
      completionRes.rows.forEach((r: any) => {
        completionMap[r.step_key] = r.is_completed;
      });

      const checklist = [
        { key: "vision-mission",    label: "Vision, Mission & PEOs Finalised",    done: !!completionMap["vision-mission"] },
        { key: "program-outcomes",  label: "Program Outcomes (POs) Defined",       done: !!completionMap["program-outcomes"] },
        { key: "pso",               label: "Program Specific Outcomes (PSOs) Set", done: !!completionMap["pso"] },
        { key: "curriculum",        label: "Curriculum Structure Generated",        done: !!completionMap["curriculum"] },
        { key: "course-outcomes",   label: "Course Outcomes (COs) Mapped",         done: !!completionMap["course-outcomes"] },
      ];

      return NextResponse.json({
        programId,
        programName: program.program_name,
        feedbackStartAt: startAt ? startAt.toISOString() : null,
        feedbackEndAt: endAt ? endAt.toISOString() : null,
        feedbackStatus: program.curriculum_feedback_status || "pending",
        isOpen,
        responses: feedbackRes.rows,
        checklist,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculum Feedback GET error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// PUT: set feedback timeline / mark phase complete
export async function PUT(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { programId, feedbackStartAt, feedbackEndAt, feedbackStatus } = body || {};

    if (!programId || typeof programId !== "string") {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ownerCheck = await client.query(
        "SELECT id FROM programs WHERE id = $1 AND institution_id = $2 LIMIT 1",
        [programId, institutionId],
      );
      if (ownerCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
      }

      // Build dynamic SET clause
      const setClauses: string[] = ["updated_at = NOW()"];
      const params: any[] = [programId];
      let idx = 2;

      if (feedbackStartAt !== undefined) {
        const d = new Date(feedbackStartAt);
        if (!isNaN(d.getTime())) { setClauses.push(`curriculum_feedback_start_at = $${idx++}`); params.push(d.toISOString()); }
      }
      if (feedbackEndAt !== undefined) {
        const d = new Date(feedbackEndAt);
        if (!isNaN(d.getTime())) { setClauses.push(`curriculum_feedback_end_at = $${idx++}`); params.push(d.toISOString()); }
      }
      if (feedbackStatus && ["pending", "open", "closed", "completed"].includes(feedbackStatus)) {
        setClauses.push(`curriculum_feedback_status = $${idx++}`);
        params.push(feedbackStatus);
      }

      const updateRes = await client.query(
        `UPDATE programs SET ${setClauses.join(", ")}
         WHERE id = $1
         RETURNING id, curriculum_feedback_start_at, curriculum_feedback_end_at, curriculum_feedback_status`,
        params,
      );

      await client.query("COMMIT");
      const row = updateRes.rows[0];
      return NextResponse.json({
        ok: true,
        programId: row.id,
        feedbackStartAt: row.curriculum_feedback_start_at,
        feedbackEndAt: row.curriculum_feedback_end_at,
        feedbackStatus: row.curriculum_feedback_status,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculum Feedback PUT error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
