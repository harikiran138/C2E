import { NextRequest, NextResponse } from 'next/server';
import { validateSignupPayload } from '@/lib/validation/onboarding';
import { createClient } from '@/utils/supabase/server';

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

    const supabase = await createClient();

    // Check for duplicate institution name
    const { data: dupInstitution, error: instError } = await supabase
      .from('institutions')
      .select('id')
      .ilike('institution_name', institutionName.trim())
      .maybeSingle();

    if (instError) {
      console.error('Error checking duplicate institution name:', instError);
    }

    if (dupInstitution) {
      return NextResponse.json({ error: 'An institution with this name is already registered.' }, { status: 409 });
    }

    // Check for duplicate email
    const { data: dupEmail, error: emailError } = await supabase
      .from('institutions')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (emailError) {
      console.error('Error checking duplicate email:', emailError);
    }

    if (dupEmail) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Validation failed.' }, { status: 500 });
  }
}
