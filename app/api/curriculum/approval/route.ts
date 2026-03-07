import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

type ApprovalAction = "submit_for_review" | "approve_hod" | "reject" | "reset_draft";

type ApprovalEntity =
  | "curriculums"
  | "curriculum_generated_courses"
  | "curriculum_course_outcomes"
  | "co_attainment"
  | "po_attainment"
  | "continuous_improvement"
  | "course_syllabus";

interface ApprovalUpdateRequest {
  entityType?: ApprovalEntity;
  ids?: string[];
  action?: ApprovalAction;
}

const ENTITY_TABLES: Record<ApprovalEntity, string> = {
  curriculums: "curriculums",
  curriculum_generated_courses: "curriculum_generated_courses",
  curriculum_course_outcomes: "curriculum_course_outcomes",
  co_attainment: "co_attainment",
  po_attainment: "po_attainment",
  continuous_improvement: "continuous_improvement",
  course_syllabus: "course_syllabus",
};

const STATUS_TRANSITIONS: Record<ApprovalAction, string> = {
  submit_for_review: "faculty_review",
  approve_hod: "hod_approved",
  reject: "rejected",
  reset_draft: "draft",
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function resolveInstitutionIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("institution_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  const id = normalizeText(payload?.id);
  return id || null;
}

function isValidAction(action: string): action is ApprovalAction {
  return Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, action);
}

function isValidEntity(entityType: string): entityType is ApprovalEntity {
  return Object.prototype.hasOwnProperty.call(ENTITY_TABLES, entityType);
}

function canTransition(currentStatus: string, action: ApprovalAction): boolean {
  const normalized = normalizeText(currentStatus).toLowerCase();

  if (action === "submit_for_review") return normalized === "draft";
  if (action === "approve_hod") return normalized === "faculty_review";
  if (action === "reject") return normalized === "faculty_review" || normalized === "hod_approved";
  if (action === "reset_draft") return normalized === "rejected" || normalized === "faculty_review";

  return false;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as ApprovalUpdateRequest;
    const entityType = normalizeText(body.entityType);
    const action = normalizeText(body.action);
    const ids = Array.isArray(body.ids)
      ? body.ids.map((id) => normalizeText(id)).filter(Boolean)
      : [];

    if (!isValidEntity(entityType)) {
      return NextResponse.json({ error: "entityType is invalid" }, { status: 400 });
    }

    if (!isValidAction(action)) {
      return NextResponse.json({ error: "action is invalid" }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids must contain at least one id" }, { status: 400 });
    }

    const institutionId = await resolveInstitutionIdFromSession();
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetStatus = STATUS_TRANSITIONS[action];
    const tableName = ENTITY_TABLES[entityType];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existingRows = await client.query<{
        id: string;
        approval_status: string | null;
      }>(
        `SELECT id, approval_status
         FROM ${tableName}
         WHERE id = ANY($1::uuid[])`,
        [ids],
      );

      if (existingRows.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "No matching records found" }, { status: 404 });
      }

      const invalidTransitions = existingRows.rows.filter(
        (row) => !canTransition(row.approval_status || "draft", action),
      );

      if (invalidTransitions.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:
              "One or more records are not eligible for this transition. Allowed flow: draft -> faculty_review -> hod_approved.",
            invalidRecordIds: invalidTransitions.map((row) => row.id),
          },
          { status: 400 },
        );
      }

      const shouldSetApprover = targetStatus === "hod_approved";
      const approvalReset = targetStatus === "draft" || targetStatus === "rejected";

      const updateResult = await client.query(
        `UPDATE ${tableName}
         SET
           approval_status = $1,
           approved_by = CASE
             WHEN $2::boolean = TRUE THEN $3::uuid
             WHEN $4::boolean = TRUE THEN NULL
             ELSE approved_by
           END,
           approved_at = CASE
             WHEN $2::boolean = TRUE THEN NOW()
             WHEN $4::boolean = TRUE THEN NULL
             ELSE approved_at
           END,
           updated_at = NOW()
         WHERE id = ANY($5::uuid[])
         RETURNING id, approval_status, approved_by, approved_at, updated_at`,
        [targetStatus, shouldSetApprover, institutionId, approvalReset, ids],
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        action,
        entityType,
        updated: updateResult.rows,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Approval workflow update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update approval workflow." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = normalizeText(searchParams.get("entityType"));
    const id = normalizeText(searchParams.get("id"));

    if (!isValidEntity(entityType)) {
      return NextResponse.json({ error: "entityType is invalid" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const tableName = ENTITY_TABLES[entityType];

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, approval_status, approved_by, approved_at, created_at, updated_at
         FROM ${tableName}
         WHERE id = $1
         LIMIT 1`,
        [id],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }

      return NextResponse.json({ record: result.rows[0], entityType });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Approval workflow fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch approval workflow state." },
      { status: 500 },
    );
  }
}
