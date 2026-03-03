import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

type StakeholderTokenPayload = {
  role?: string;
  stakeholder_ref_id?: string;
  stakeholder_member_id?: string;
  stakeholder_name?: string;
  stakeholder_category?: string;
  institution_name?: string;
  program_id?: string;
};

type FeedbackInputBlock = {
  rating: number;
  comment?: string;
};

type PEOFeedbackInput = {
  peoId: string;
  rating: number;
  comment?: string;
};

function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

async function getStakeholderPayload(
  request: NextRequest,
): Promise<StakeholderTokenPayload | null> {
  const token = request.cookies.get("stakeholder_token")?.value;
  if (!token) return null;

  const payload = (await verifyToken(token)) as StakeholderTokenPayload | null;
  if (!payload || payload.role !== "stakeholder") return null;
  if (
    !payload.stakeholder_ref_id ||
    !payload.stakeholder_member_id ||
    !payload.program_id
  )
    return null;

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const stakeholder = await getStakeholderPayload(request);
    if (!stakeholder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const vision = (body?.vision || {}) as FeedbackInputBlock;
    const mission = (body?.mission || {}) as FeedbackInputBlock;
    const peos = Array.isArray(body?.peos)
      ? (body.peos as PEOFeedbackInput[])
      : [];

    if (!isValidRating(vision.rating) || !isValidRating(mission.rating)) {
      return NextResponse.json(
        { error: "Vision and Mission ratings must be between 1 and 5." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const stakeholderRes = await client.query(
        `SELECT
            rs.id,
            rs.member_id,
            rs.member_name,
            rs.category,
            rs.is_approved,
            rs.program_id,
            p.program_name,
            p.vmpeo_feedback_start_at,
            p.vmpeo_feedback_end_at,
            p.vmpeo_feedback_cycle,
            i.institution_name
         FROM representative_stakeholders rs
         INNER JOIN programs p ON p.id = rs.program_id
         INNER JOIN institutions i ON i.id = p.institution_id
         WHERE rs.id = $1 AND rs.program_id = $2
         LIMIT 1`,
        [stakeholder.stakeholder_ref_id, stakeholder.program_id],
      );

      if (stakeholderRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Stakeholder record not found." },
          { status: 404 },
        );
      }

      const stakeholderRow = stakeholderRes.rows[0];
      if (!stakeholderRow.is_approved) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Stakeholder is not approved for feedback." },
          { status: 403 },
        );
      }

      const startAt = stakeholderRow.vmpeo_feedback_start_at
        ? new Date(stakeholderRow.vmpeo_feedback_start_at)
        : null;
      const endAt = stakeholderRow.vmpeo_feedback_end_at
        ? new Date(stakeholderRow.vmpeo_feedback_end_at)
        : null;
      const now = new Date();
      if (!startAt || !endAt || now < startAt || now > endAt) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Feedback submission is outside the active timeline." },
          { status: 403 },
        );
      }

      const peoRes = await client.query(
        `SELECT id, peo_number, peo_statement
         FROM program_peos
         WHERE program_id = $1
         ORDER BY peo_number ASC`,
        [stakeholder.program_id],
      );

      const peoRows = peoRes.rows;
      const peoFeedbackById = new Map<string, PEOFeedbackInput>();

      peos.forEach((entry) => {
        if (entry && typeof entry.peoId === "string") {
          peoFeedbackById.set(entry.peoId, entry);
        }
      });

      if (peoRows.length > 0 && peos.length !== peoRows.length) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Please provide rating and comment for each PEO." },
          { status: 400 },
        );
      }

      for (const peo of peoRows) {
        const feedback = peoFeedbackById.get(String(peo.id));
        if (!feedback || !isValidRating(feedback.rating)) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              error: `Missing valid rating for PEO-${String(peo.peo_number).padStart(2, "0")}.`,
            },
            { status: 400 },
          );
        }
      }

      const submissionRes = await client.query(
        `INSERT INTO program_vmpeo_feedback_submissions (
            program_id,
            stakeholder_ref_id,
            stakeholder_member_id,
            stakeholder_name,
            stakeholder_category,
            institution_name,
            feedback_cycle,
            submitted_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, submitted_at`,
        [
          stakeholder.program_id,
          stakeholder.stakeholder_ref_id,
          stakeholder.stakeholder_member_id,
          stakeholderRow.member_name,
          stakeholderRow.category || null,
          stakeholderRow.institution_name,
          stakeholderRow.vmpeo_feedback_cycle || "brainstorming",
        ],
      );

      const submissionId = submissionRes.rows[0].id as string;

      await client.query(
        `INSERT INTO program_vmpeo_feedback_entries (
            submission_id,
            program_id,
            category,
            rating,
            comment
         ) VALUES ($1, $2, 'vision', $3, $4)`,
        [
          submissionId,
          stakeholder.program_id,
          vision.rating,
          String(vision.comment || "").trim() || null,
        ],
      );

      await client.query(
        `INSERT INTO program_vmpeo_feedback_entries (
            submission_id,
            program_id,
            category,
            rating,
            comment
         ) VALUES ($1, $2, 'mission', $3, $4)`,
        [
          submissionId,
          stakeholder.program_id,
          mission.rating,
          String(mission.comment || "").trim() || null,
        ],
      );

      for (const peo of peoRows) {
        const feedback = peoFeedbackById.get(String(peo.id));
        if (!feedback) continue;

        await client.query(
          `INSERT INTO program_vmpeo_feedback_entries (
              submission_id,
              program_id,
              category,
              peo_id,
              peo_number,
              peo_statement,
              rating,
              comment
           ) VALUES ($1, $2, 'peo', $3, $4, $5, $6, $7)`,
          [
            submissionId,
            stakeholder.program_id,
            peo.id,
            peo.peo_number,
            peo.peo_statement,
            feedback.rating,
            String(feedback.comment || "").trim() || null,
          ],
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({
        ok: true,
        submissionId,
        submittedAt: new Date(submissionRes.rows[0].submitted_at).toISOString(),
        feedbackCycle: stakeholderRow.vmpeo_feedback_cycle || "brainstorming",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholder feedback submit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
