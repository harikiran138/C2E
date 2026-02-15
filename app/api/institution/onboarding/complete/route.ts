import { NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const institutionRes = await pool.query(
      'SELECT id FROM public.institutions WHERE id = $1 LIMIT 1',
      [user.id]
    );
    if (!institutionRes.rowCount) {
      return NextResponse.json({ error: 'Account record not found.' }, { status: 400 });
    }

    const detailsRes = await pool.query(
      `SELECT institution_id
       FROM public.institution_details
       WHERE institution_id = $1
       AND type IS NOT NULL
       AND status IS NOT NULL
       AND established_year BETWEEN 1900 AND EXTRACT(YEAR FROM NOW())::INT
       AND address IS NOT NULL AND LENGTH(TRIM(address)) >= 10
       AND city IS NOT NULL AND LENGTH(TRIM(city)) > 0
       AND state IS NOT NULL AND LENGTH(TRIM(state)) > 0
       AND (status <> 'Non-Autonomous' OR (affiliation IS NOT NULL AND LENGTH(TRIM(affiliation)) > 0))
       LIMIT 1`,
      [user.id]
    );

    if (!detailsRes.rowCount) {
      return NextResponse.json({ error: 'Institution details are incomplete.' }, { status: 400 });
    }

    const programsRes = await pool.query(
      'SELECT COUNT(*)::INT AS count FROM public.programs WHERE institution_id = $1',
      [user.id]
    );

    const programCount = programsRes.rows[0]?.count || 0;
    if (programCount < 1) {
      return NextResponse.json({ error: 'At least one program is required.' }, { status: 400 });
    }

    await pool.query(
      `UPDATE public.institutions
       SET onboarding_status = 'COMPLETED', updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to complete onboarding.' }, { status: 500 });
  }
}
