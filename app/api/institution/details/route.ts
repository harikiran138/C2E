import { NextRequest, NextResponse } from "next/server";
import pool, { safeQuery, genericErrorResponse } from "@/lib/postgres";
import { authorize, isAuthorized } from "@/lib/api-utils";
import { validateInstitutionDetailsPayload } from "@/lib/validation/onboarding";



export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request, ["INSTITUTE_ADMIN", "SUPER_ADMIN"]);
    if (!isAuthorized(auth)) return auth;

    const institutionId = auth.institutionId;

    // Fetch Institution with Details
    const institutions = await safeQuery<any[]>(
      `SELECT
        i.id,
        i.institution_name,
        i.email,
        i.onboarding_status,
        id.type as institution_type,
        id.status as institution_status,
        id.established_year,
        id.affiliation as university_affiliation,
        id.address,
        id.city,
        id.state,
        id.country,
        id.vision,
        id.mission
       FROM institutions i
       LEFT JOIN institution_details id ON i.id = id.institution_id
       WHERE i.id = $1`,
      [institutionId],
      [],
    );

    const institution = institutions[0];

    // Fetch Programs (Selecting only existing columns)
    const programs = await safeQuery<any[]>(
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
      [],
    );

    return NextResponse.json({
      institution: institution || {},
      programs: programs || [],
    });
  } catch (error: any) {
    console.error("Error fetching details:", error);
    return genericErrorResponse("Failed to fetch institution details. Please try again.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request, ["INSTITUTE_ADMIN", "SUPER_ADMIN"]);
    if (!isAuthorized(auth)) return auth;

    const institutionId = auth.institutionId;

    const body = await request.json();
    const tokenPayload = {
      institution_name: String(body.institution_name || ""),
      institution_type: String(body.institution_type || ""),
      institution_status: String(body.institution_status || ""),
      established_year: Number(body.established_year),
      university_affiliation: body.university_affiliation
        ? String(body.university_affiliation)
        : null,
      city: String(body.city || ""),
      state: String(body.state || ""),
      address: body.address ? String(body.address) : null,
      country: body.country ? String(body.country) : "India",
      vision: body.vision ? String(body.vision) : null,
      mission: body.mission ? String(body.mission) : null,
    };

    const validationError = validateInstitutionDetailsPayload(tokenPayload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (
      tokenPayload.institution_status === "Non-Autonomous" &&
      !tokenPayload.university_affiliation?.trim()
    ) {
      return NextResponse.json(
        { error: "University affiliation is required for Non-Autonomous institutions." },
        { status: 400 },
      );
    }

    const normalizedCity = tokenPayload.city.trim();
    const normalizedState = tokenPayload.state.trim();
    const normalizedCountry = tokenPayload.country?.trim() || "India";
    const normalizedAddress =
      tokenPayload.address?.trim() ||
      `${normalizedCity}, ${normalizedState}, ${normalizedCountry}`.trim();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update basic institution name
      await client.query(
        `UPDATE institutions SET institution_name = $1, updated_at = NOW() WHERE id = $2`,
        [tokenPayload.institution_name.trim(), institutionId]
      );

      // Upsert into institution_details
      await client.query(
        `INSERT INTO institution_details (
          institution_id, 
          type, 
          status, 
          established_year, 
          affiliation, 
          address,
          city, 
          state, 
          country,
          vision, 
          mission, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (institution_id) DO UPDATE SET
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          established_year = EXCLUDED.established_year,
          affiliation = EXCLUDED.affiliation,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          vision = EXCLUDED.vision,
          mission = EXCLUDED.mission,
          updated_at = NOW()`,
        [
          institutionId,
          tokenPayload.institution_type,
          tokenPayload.institution_status,
          tokenPayload.established_year,
          tokenPayload.university_affiliation?.trim() || null,
          normalizedAddress,
          normalizedCity,
          normalizedState,
          normalizedCountry,
          tokenPayload.vision?.trim() || null,
          tokenPayload.mission?.trim() || null,
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
    return genericErrorResponse("Failed to update institution details. Please try again.");
  }
}
