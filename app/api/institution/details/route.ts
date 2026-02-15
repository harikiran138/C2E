import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { createClient } from '@/utils/supabase/server';
import { validateInstitutionDetailsPayload } from '@/lib/validation/onboarding';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = {
      institution_type: String(body.institution_type || ''),
      institution_status: String(body.institution_status || ''),
      established_year: Number(body.established_year),
      university_affiliation: body.university_affiliation ? String(body.university_affiliation) : null,
      address: String(body.address || ''),
      city: String(body.city || ''),
      state: String(body.state || ''),
    };

    const validationError = validateInstitutionDetailsPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO public.institution_details (institution_id, type, status, established_year, affiliation, address, city, state, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (institution_id)
       DO UPDATE SET
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        established_year = EXCLUDED.established_year,
        affiliation = EXCLUDED.affiliation,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        updated_at = NOW()`,
      [
        user.id,
        payload.institution_type,
        payload.institution_status,
        payload.established_year,
        payload.institution_status === 'Non-Autonomous' ? payload.university_affiliation : null,
        payload.address.trim(),
        payload.city.trim(),
        payload.state.trim(),
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save institution details.' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT type, status, established_year, affiliation, address, city, state
       FROM public.institution_details
       WHERE institution_id = $1
       LIMIT 1`,
      [user.id]
    );

    return NextResponse.json({ details: result.rows[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch institution details.' }, { status: 500 });
  }
}
