import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import * as jose from 'jose';

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('institution_token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key');
    const { payload } = await jose.jwtVerify(token, secret);
    return payload.id as string;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Check institution details in `institutions` table
      const instRes = await client.query(
        `SELECT id, institution_type, institution_status, established_year, university_affiliation, address, city, state
         FROM institutions
         WHERE id = $1`,
        [institutionId]
      );
      
      const details = instRes.rows[0];
      if (!details) {
        return NextResponse.json({ error: 'Institution record not found.' }, { status: 400 });
      }

      // Validate required fields
      const isValid = 
        details.institution_type &&
        details.established_year >= 1900 &&
        details.address && details.address.trim().length >= 10 &&
        details.city && details.state &&
        (details.institution_status !== 'Non-Autonomous' || details.university_affiliation);

      if (!isValid) {
        return NextResponse.json({ error: 'Institution details are incomplete.' }, { status: 400 });
      }

      // Check programs
      const programsRes = await client.query(
        'SELECT COUNT(*)::INT AS count FROM programs WHERE institution_id = $1',
        [institutionId]
      );

      const programCount = programsRes.rows[0]?.count || 0;
      if (programCount < 1) {
        return NextResponse.json({ error: 'At least one program is required.' }, { status: 400 });
      }

      // Mark completed
      await client.query(
        `UPDATE institutions
         SET onboarding_status = 'COMPLETED', updated_at = NOW()
         WHERE id = $1`,
        [institutionId]
      );

      // Re-issue token with COMPLETED status
      // We need email for the token, but we only have ID here.
      // We should fetch email or just use ID if we change middleware to not need email.
      // But let's fetch email to be safe and consistent.
      const emailRes = await client.query('SELECT email FROM institutions WHERE id = $1', [institutionId]);
      const email = emailRes.rows[0]?.email;

      const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key');
      const alg = 'HS256';
      const jwt = await new jose.SignJWT({ 
          id: institutionId, 
          email: email || '', 
          role: 'institution_admin',
          onboarding_status: 'COMPLETED'
      })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
      
      const response = NextResponse.json({ ok: true });
      response.cookies.set('institution_token', jwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 // 24 hours
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to complete onboarding.' }, { status: 500 });
  }
}
