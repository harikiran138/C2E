import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";
import {
  validateInstitutionDetailsPayload,
  validateVisionMissionPayload,
} from "@/lib/validation/onboarding";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Fetch Institution with Details
      const instResult = await client.query(
        `SELECT
          i.id,
          i.institution_name,
          i.email,
          i.onboarding_status,
          id.type as institution_type,
          id.status as institution_status,
          id.established_year,
          id.affiliation as university_affiliation,
          id.city,
          id.state,
          id.vision,
          id.mission
         FROM institutions i
         LEFT JOIN institution_details id ON i.id = id.institution_id
         WHERE i.id = $1`,
        [institutionId],
      );

      const institution = instResult.rows[0];

      // Fetch Programs (Selecting only existing columns)
      const progResult = await client.query(
        `SELECT
          p.id,
          p.program_name,
          p.degree,
          p.level,
          p.duration,
          p.intake,
          p.academic_year,
          p.program_code,
          p.vision,
          p.program_vision,
          p.mission,
          p.program_mission,
          p.vision_score,
          p.vision_analysis,
          p.mission_score,
          p.mission_analysis,
          p.generated_by_ai,
          p.vision_inputs_used,
          p.mission_inputs_used,
          p.vision_options,
          p.mission_options,
          p.vision_priorities,
          p.mission_priorities,
          p.lead_society,
          cm.matrix_data as consistency_matrix
         FROM programs p
         LEFT JOIN consistency_matrix cm ON p.id = cm.program_id
         WHERE p.institution_id = $1
         ORDER BY p.created_at ASC`,
        [institutionId],
      );

      const programs = progResult.rows;

      return NextResponse.json({
        institution: institution || {},
        programs: programs || [],
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching details:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
        details: "Failed at /api/institution/details GET",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      institution_name: String(body.institution_name || ""),
      institution_type: String(body.institution_type || ""),
      institution_status: String(body.institution_status || ""),
      established_year: Number(body.established_year),
      university_affiliation: body.university_affiliation
        ? String(body.university_affiliation)
        : null,
      city: String(body.city || ""),
      state: String(body.state || ""),
      vision: body.vision ? String(body.vision) : null,
      mission: body.mission ? String(body.mission) : null,
    };

    const validationError = validateInstitutionDetailsPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update basic institution name
      await client.query(
        `UPDATE institutions SET institution_name = $1, updated_at = NOW() WHERE id = $2`,
        [payload.institution_name.trim(), institutionId]
      );

      // Upsert into institution_details
      await client.query(
        `INSERT INTO institution_details (
          institution_id, 
          type, 
          status, 
          established_year, 
          affiliation, 
          city, 
          state, 
          vision, 
          mission, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (institution_id) DO UPDATE SET
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          established_year = EXCLUDED.established_year,
          affiliation = EXCLUDED.affiliation,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          vision = EXCLUDED.vision,
          mission = EXCLUDED.mission,
          updated_at = NOW()`,
        [
          institutionId,
          payload.institution_type,
          payload.institution_status,
          payload.established_year,
          payload.university_affiliation?.trim() || null,
          payload.city.trim(),
          payload.state.trim(),
          payload.vision?.trim() || null,
          payload.mission?.trim() || null,
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
