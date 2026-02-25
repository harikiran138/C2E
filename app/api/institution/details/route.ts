import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { verifyToken } from '@/lib/auth';
import { validateInstitutionDetailsPayload, validateVisionMissionPayload } from '@/lib/validation/onboarding';

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('institution_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.id as string || null;
}

export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Fetch Institution
      const instResult = await client.query(
        `SELECT
          id,
          institution_name,
          email,
          onboarding_status,
          institution_type,
          institution_status,
          established_year,
          university_affiliation,
          city,
          state,
          vision,
          mission
         FROM institutions
         WHERE id = $1`,
        [institutionId]
      );

      const institution = instResult.rows[0];

      // Fetch Programs
      const progResult = await client.query(
        `SELECT
          id,
          program_name,
          degree,
          level,
          duration,
          intake,
          academic_year,
          program_code,
          vision,
          mission,
          vision_priorities,
          mission_priorities
         FROM programs
         WHERE institution_id = $1
         ORDER BY created_at ASC`,
        [institutionId]
      );

      const programs = progResult.rows;

      return NextResponse.json({ 
        institution: institution || {}, 
        programs: programs || [] 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching details:', error);
    return NextResponse.json({ 
        error: error.message,
        stack: error.stack,
        details: 'Failed at /api/institution/details GET'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      institution_name: String(body.institution_name || ''),
      institution_type: String(body.institution_type || ''),
      institution_status: String(body.institution_status || ''),
      established_year: Number(body.established_year),
      university_affiliation: body.university_affiliation ? String(body.university_affiliation) : null,
      city: String(body.city || ''),
      state: String(body.state || ''),
      vision: body.vision ? String(body.vision) : null,
      mission: body.mission ? String(body.mission) : null,
    };

    const validationError = validateInstitutionDetailsPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE institutions 
         SET institution_name = $1,
             institution_type = $2, 
             institution_status = $3, 
             established_year = $4, 
             university_affiliation = $5, 
             city = $6, 
             state = $7, 
             vision = $8,
             mission = $9,
             updated_at = NOW()
         WHERE id = $10`,
        [
          payload.institution_name.trim(),
          payload.institution_type,
          payload.institution_status,
          payload.established_year,
          payload.university_affiliation?.trim() || null,
          payload.city.trim(),
          payload.state.trim(),
          payload.vision?.trim() || null,
          payload.mission?.trim() || null,
          institutionId
        ]
      );

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
