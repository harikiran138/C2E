import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import bcrypt from 'bcrypt';
import * as jose from 'jose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, password_hash, onboarding_status FROM public.institutions WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email.trim()]
      );

      const institution = result.rows[0];
      if (!institution || !institution.password_hash) {
        return NextResponse.json({ error: 'Invalid credentials or account incomplete.' }, { status: 401 });
      }

      // Verify password
      const match = await bcrypt.compare(password, institution.password_hash);
      if (!match) {
        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      }

      // Generate JWT
      const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key'); 
      const alg = 'HS256';
      const jwt = await new jose.SignJWT({ 
          id: institution.id, 
          email: email.trim(), 
          role: 'institution_admin',
          onboarding_status: institution.onboarding_status || 'PENDING'
      })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
      
      const response = NextResponse.json({ ok: true, id: institution.id });
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
    console.error('Login error:', error);
    return NextResponse.json({ error: error?.message || 'Login failed.' }, { status: 500 });
  }
}
