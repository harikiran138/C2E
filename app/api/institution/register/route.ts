import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { validateSignupPayload } from '@/lib/validation/onboarding';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as jose from 'jose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const institutionName = String(body.institutionName || '');
    const email = String(body.email || '');
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    // 1. Validate Payload
    const validationError = validateSignupPayload({ institutionName, email, password, confirmPassword });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // 2. Check for replicates in DB
    const client = await pool.connect();
    try {
        const dupCheck = await client.query(
            'SELECT id FROM public.institutions WHERE LOWER(email) = LOWER($1) OR LOWER(institution_name) = LOWER($2) LIMIT 1',
            [email.trim(), institutionName.trim()]
        );

        if ((dupCheck.rowCount ?? 0) > 0) {
             return NextResponse.json({ error: 'Institution name or email already registered.' }, { status: 409 });
        }

        // 3. Hash Password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Generate UUID
        // Supabase Auth usually handles this, but we are bypassing it.
        const newId = uuidv4();


        // 5. Insert into DB
        const insertQuery = `
          INSERT INTO public.institutions (
            id,
            institution_name,
            email,
            password_hash,
            onboarding_status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id
        `;

        await client.query(insertQuery, [
          newId,
          institutionName.trim(),
          email.trim(),
          hashedPassword,
          'PENDING' 
        ]);

        console.log('Registered institution:', newId);

        // 6. Generate Session Token (JWT)
        const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key'); 
        const alg = 'HS256';
        const jwt = await new jose.SignJWT({ 
            id: newId, 
            email: email.trim(), 
            role: 'institution_admin',
            onboarding_status: 'PENDING'
        })
          .setProtectedHeader({ alg })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(secret);
          
        const response = NextResponse.json({ ok: true, id: newId });
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


    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error?.message || 'Registration failed.' }, { status: 500 });
  }
}
