import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { v4 as uuidv4 } from "uuid";
import { validateProgramPayload } from "@/lib/validation/onboarding";
import { verifyToken } from "@/lib/auth";
import { logAudit, ACTION_TYPES } from "@/lib/audit";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      program_name: String(body.program_name || ""),
      degree: String(body.degree || ""),
      level: String(body.level || ""),
      duration: Number(body.duration),
      intake: Number(body.intake),
      academic_year: String(body.academic_year || ""),
      program_code: String(body.program_code || ""),
      vision: body.vision ? String(body.vision) : null,
      mission: body.mission ? String(body.mission) : null,
    };

    const validationError = validateProgramPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const normalizedProgramCode = payload.program_code.trim().toUpperCase();
    const newId = uuidv4();

    const client = await pool.connect();
    try {
      // Check for duplicate code
      const checkResult = await client.query(
        "SELECT id FROM programs WHERE institution_id = $1 AND UPPER(program_code) = $2 LIMIT 1",
        [institutionId, normalizedProgramCode],
      );

      if (checkResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Program code already exists for this institution." },
          { status: 409 },
        );
      }

      await client.query(
        `INSERT INTO programs (
          id,
          institution_id,
          program_name,
          degree,
          level,
          duration,
          intake,
          academic_year,
          program_code,
          vision,
          mission,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          newId,
          institutionId,
          payload.program_name.trim(),
          payload.degree,
          payload.level,
          payload.duration,
          payload.intake,
          payload.academic_year.trim(),
          normalizedProgramCode,
          payload.vision?.trim() || null,
          payload.mission?.trim() || null,
        ],
      );

      // [Audit Log]
      await logAudit({
        institutionId,
        action: "PROGRAM_CREATED",
        ipAddress: ip,
        details: { programId: newId, programCode: normalizedProgramCode },
      });

      return NextResponse.json({
        ok: true,
        program: {
          id: newId,
          program_name: payload.program_name.trim(),
          degree: payload.degree,
          level: payload.level,
          duration: payload.duration,
          intake: payload.intake,
          academic_year: payload.academic_year.trim(),
          program_code: normalizedProgramCode,
          vision: payload.vision,
          mission: payload.mission,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error adding program:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Program ID required" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const deleteResult = await client.query(
        "DELETE FROM programs WHERE id = $1 AND institution_id = $2 RETURNING id",
        [id, institutionId],
      );

      if (deleteResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Program not found or unauthorized" },
          { status: 404 },
        );
      }

      // [Audit Log]
      await logAudit({
        institutionId,
        action: "PROGRAM_DELETED",
        ipAddress: ip,
        details: { programId: id },
      });

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error deleting program:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function PUT(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Program ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { vision, mission } = body;

    const client = await pool.connect();
    try {
      const updateResult = await client.query(
        `UPDATE programs 
         SET vision = $1, mission = $2, updated_at = NOW() 
         WHERE id = $3 AND institution_id = $4
         RETURNING id`,
        [vision || null, mission || null, id, institutionId],
      );

      if (updateResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Program not found or unauthorized" },
          { status: 404 },
        );
      }

      // [Audit Log]
      await logAudit({
        institutionId,
        action: "PROGRAM_UPDATED",
        ipAddress: ip,
        details: {
          programId: id,
          updates: { vision: !!vision, mission: !!mission },
        },
      });

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating program VM:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
