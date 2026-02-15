import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { createClient } from '@/utils/supabase/server';
import { validateProgramPayload } from '@/lib/validation/onboarding';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = {
      program_name: String(body.program_name || ''),
      degree: String(body.degree || ''),
      level: String(body.level || ''),
      duration: Number(body.duration),
      intake: Number(body.intake),
      academic_year: String(body.academic_year || ''),
      program_code: String(body.program_code || '').trim().toUpperCase(),
    };

    const validationError = validateProgramPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const dup = await pool.query(
      'SELECT id FROM public.programs WHERE institution_id = $1 AND LOWER(program_code) = LOWER($2) LIMIT 1',
      [user.id, payload.program_code]
    );

    if (dup.rowCount) {
      return NextResponse.json({ error: `Program code "${payload.program_code}" already exists.` }, { status: 409 });
    }

    const inserted = await pool.query(
      `INSERT INTO public.programs (institution_id, program_name, degree, level, duration, intake, academic_year, program_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, institution_id, program_name, degree, level, duration, intake, academic_year, program_code`,
      [
        user.id,
        payload.program_name.trim(),
        payload.degree,
        payload.level,
        payload.duration,
        payload.intake,
        payload.academic_year.trim(),
        payload.program_code,
      ]
    );

    return NextResponse.json({ ok: true, program: inserted.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to add program.' }, { status: 500 });
  }
}
