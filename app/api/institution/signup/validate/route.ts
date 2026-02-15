import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { validateSignupPayload } from '@/lib/validation/onboarding';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const institutionName = String(body.institutionName || '');
    const email = String(body.email || '');
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    const validationError = validateSignupPayload({ institutionName, email, password, confirmPassword });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const dupInstitution = await pool.query(
      'SELECT id FROM public.institutions WHERE LOWER(institution_name) = LOWER($1) LIMIT 1',
      [institutionName.trim()]
    );

    if (dupInstitution.rowCount) {
      return NextResponse.json({ error: 'An institution with this name is already registered.' }, { status: 409 });
    }

    const dupEmail = await pool.query(
      'SELECT id FROM public.institutions WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );

    if (dupEmail.rowCount) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Validation failed.' }, { status: 500 });
  }
}
