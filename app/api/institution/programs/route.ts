import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { v4 as uuidv4 } from "uuid";
import { validateProgramPayload } from "@/lib/validation/onboarding";
import { verifyToken } from "@/lib/auth";
import { logAudit, ACTION_TYPES } from "@/lib/audit";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const tokenPayload = await verifyToken(token);
  return (tokenPayload?.id as string) || null;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tokenPayload = {
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

    const validationError = validateProgramPayload(tokenPayload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const normalizedProgramCode = tokenPayload.program_code.trim().toUpperCase();
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
          tokenPayload.program_name.trim(),
          tokenPayload.degree,
          tokenPayload.level,
          tokenPayload.duration,
          tokenPayload.intake,
          tokenPayload.academic_year.trim(),
          normalizedProgramCode,
          tokenPayload.vision?.trim() || null,
          tokenPayload.mission?.trim() || null,
        ],
      );

      // [Audit Log]
      await logAudit({
        institutionId,
        programId: newId,
        action: "PROGRAM_CREATED",
        ipAddress: ip,
        details: { programId: newId, programCode: normalizedProgramCode },
      });

      return NextResponse.json({
        ok: true,
        program: {
          id: newId,
          program_name: tokenPayload.program_name.trim(),
          degree: tokenPayload.degree,
          level: tokenPayload.level,
          duration: tokenPayload.duration,
          intake: tokenPayload.intake,
          academic_year: tokenPayload.academic_year.trim(),
          program_code: normalizedProgramCode,
          vision: tokenPayload.vision,
          mission: tokenPayload.mission,
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
        programId: id,
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
        programId: id,
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
