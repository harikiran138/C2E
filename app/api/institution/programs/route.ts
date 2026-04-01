import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { v4 as uuidv4 } from "uuid";
import { validateProgramPayload } from "@/lib/validation/onboarding";
import { verifyToken } from "@/lib/auth";
import { logAudit, ACTION_TYPES } from "@/lib/audit";
import bcrypt from "bcrypt";

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
      // 1. Fetch institution shortform for email generation
      const instRes = await client.query("SELECT shortform FROM institutions WHERE id = $1", [institutionId]);
      const shortform = instRes.rows[0]?.shortform || "edu";
      const programEmail = `${normalizedProgramCode.toLowerCase()}@${shortform}.c2x.ai`;

      // 2. Hash password if provided
      const rawPassword = body.password || "Password@123"; // Default if not provided
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Check for duplicate code or email
      const checkResult = await client.query(
        "SELECT id FROM programs WHERE institution_id = $1 AND (UPPER(program_code) = $2 OR email = $3) LIMIT 1",
        [institutionId, normalizedProgramCode, programEmail],
      );

      if (checkResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Program code or email already exists for this institution." },
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
          email,
          password_hash,
          is_password_set,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
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
          programEmail,
          passwordHash,
          !!body.password
        ],
      );

      // [Audit Log]
      await logAudit({
        institutionId,
        programId: newId,
        action: "PROGRAM_CREATED",
        ipAddress: ip,
        details: { programId: newId, programCode: normalizedProgramCode, email: programEmail },
      });

      return NextResponse.json({
        ok: true,
        program: {
          id: newId,
          ...tokenPayload,
          email: programEmail,
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
      program_chair: body.program_chair ? String(body.program_chair) : null,
      nba_coordinator: body.nba_coordinator ? String(body.nba_coordinator) : null,
    };

    const validationError = validateProgramPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Handle password update separately if provided
      let passwordUpdateValue = null;
      if (body.password) {
        passwordUpdateValue = await bcrypt.hash(body.password, 10);
      }

      const updateResult = await client.query(
        `UPDATE programs 
         SET program_name = $1, 
             degree = $2, 
             level = $3, 
             duration = $4, 
             intake = $5, 
             academic_year = $6, 
             program_code = $7, 
             vision = $8, 
             mission = $9, 
             program_chair = $10, 
             nba_coordinator = $11, 
             password_hash = COALESCE($12, password_hash),
             is_password_set = CASE WHEN $12 IS NOT NULL THEN true ELSE is_password_set END,
             updated_at = NOW() 
         WHERE id = $13 AND institution_id = $14
         RETURNING id`,
        [
          payload.program_name.trim(),
          payload.degree,
          payload.level,
          payload.duration,
          payload.intake,
          payload.academic_year.trim(),
          payload.program_code.trim().toUpperCase(),
          payload.vision?.trim() || null,
          payload.mission?.trim() || null,
          payload.program_chair?.trim() || null,
          payload.nba_coordinator?.trim() || null,
          passwordUpdateValue,
          id,
          institutionId,
        ],
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
          updates: payload,
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
