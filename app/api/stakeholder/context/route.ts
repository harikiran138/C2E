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
  program_name?: string;
};

async function getStakeholderPayload(
  request: NextRequest,
): Promise<StakeholderTokenPayload | null> {
  const token = request.cookies.get("stakeholder_token")?.value;
  if (!token) return null;
  const payload = (await verifyToken(token)) as StakeholderTokenPayload | null;
  if (!payload || payload.role !== "stakeholder") return null;
  if (!payload.stakeholder_ref_id || !payload.program_id) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getStakeholderPayload(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const stakeholderRes = await client.query(
        `SELECT
            rs.id,
            rs.member_id,
            rs.member_name,
            rs.category,
            rs.is_approved,
            rs.program_id,
            p.program_name,
            p.vision,
            p.mission,
            p.vmpeo_feedback_start_at,
            p.vmpeo_feedback_end_at,
            p.vmpeo_feedback_cycle,
            i.institution_name
         FROM representative_stakeholders rs
         INNER JOIN programs p ON p.id = rs.program_id
         INNER JOIN institutions i ON i.id = p.institution_id
         WHERE rs.id = $1 AND rs.program_id = $2
         LIMIT 1`,
        [payload.stakeholder_ref_id, payload.program_id],
      );

      if (stakeholderRes.rows.length === 0) {
        return NextResponse.json(
          { error: "Stakeholder mapping not found." },
          { status: 404 },
        );
      }

      const stakeholder = stakeholderRes.rows[0];
      if (!stakeholder.is_approved) {
        return NextResponse.json(
          { error: "Stakeholder is not approved for feedback access." },
          { status: 403 },
        );
      }

      const peosRes = await client.query(
        `SELECT id, peo_number, peo_statement
         FROM program_peos
         WHERE program_id = $1
         ORDER BY peo_number ASC`,
        [payload.program_id],
      );

      const latestSubmissionRes = await client.query(
        `SELECT submitted_at
         FROM program_vmpeo_feedback_submissions
         WHERE program_id = $1 AND stakeholder_ref_id = $2
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [payload.program_id, payload.stakeholder_ref_id],
      );

      const startAt = stakeholder.vmpeo_feedback_start_at
        ? new Date(stakeholder.vmpeo_feedback_start_at)
        : null;
      const endAt = stakeholder.vmpeo_feedback_end_at
        ? new Date(stakeholder.vmpeo_feedback_end_at)
        : null;
      const now = new Date();
      const canSubmit = !!(startAt && endAt && now >= startAt && now <= endAt);

      let lockReason: string | null = null;
      if (!startAt || !endAt) {
        lockReason = "Feedback timeline is not configured by Program Admin.";
      } else if (now < startAt) {
        lockReason = `Feedback window starts on ${startAt.toLocaleDateString()}.`;
      } else if (now > endAt) {
        lockReason = `Feedback window ended on ${endAt.toLocaleDateString()}.`;
      }

      return NextResponse.json({
        stakeholder: {
          stakeholderRefId: stakeholder.id,
          stakeholderId: stakeholder.member_id,
          stakeholderName: stakeholder.member_name,
          category: stakeholder.category,
          institutionName: stakeholder.institution_name,
          programId: stakeholder.program_id,
          programName: stakeholder.program_name,
        },
        feedbackWindow: {
          startAt: startAt ? startAt.toISOString() : null,
          endAt: endAt ? endAt.toISOString() : null,
          cycle: (stakeholder.vmpeo_feedback_cycle || "brainstorming") as
            | "brainstorming"
            | "finalization",
          canSubmit,
          lockReason,
        },
        vision: stakeholder.vision || "",
        mission: stakeholder.mission || "",
        peos: peosRes.rows.map((row) => ({
          id: String(row.id),
          peoNumber: Number(row.peo_number),
          statement: String(row.peo_statement),
        })),
        latestSubmissionAt: latestSubmissionRes.rows[0]?.submitted_at
          ? new Date(latestSubmissionRes.rows[0].submitted_at).toISOString()
          : null,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholder context error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
