import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import * as jose from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { validateProgramPayload } from '@/lib/validation/onboarding';

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

    const body = await request.json();
    const payload = {
      program_name: String(body.program_name || ''),
      degree: String(body.degree || ''),
      level: String(body.level || ''),
      duration: Number(body.duration),
      intake: Number(body.intake),
      academic_year: String(body.academic_year || ''),
      program_code: String(body.program_code || ''),
    };

    const validationError = validateProgramPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const normalizedProgramCode = payload.program_code.trim().toUpperCase();
    const newId = uuidv4();

    const client = await pool.connect();
    try {
      // Check for duplicate code
      const checkResult = await client.query(
        'SELECT id FROM programs WHERE institution_id = $1 AND UPPER(program_code) = $2 LIMIT 1',
        [institutionId, normalizedProgramCode]
      );

      if (checkResult.rows.length > 0) {
        return NextResponse.json({ error: 'Program code already exists for this institution.' }, { status: 409 });
      }

      await client.query(
        `INSERT INTO programs (
          id,
          institution_id,
          program_name,
          degree,
          level,
          duration,
          intake,
          academic_year,
          program_code,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          newId,
          institutionId,
          payload.program_name.trim(),
          payload.degree,
          payload.level,
          payload.duration,
          payload.intake,
          payload.academic_year.trim(),
          normalizedProgramCode
        ]
      );

      return NextResponse.json({ 
        ok: true, 
        program: { 
          id: newId, 
          program_name: payload.program_name.trim(),
          degree: payload.degree,
          level: payload.level,
          duration: payload.duration,
          intake: payload.intake,
          academic_year: payload.academic_year.trim(),
          program_code: normalizedProgramCode,
        } 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error adding program:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Program ID required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const deleteResult = await client.query(
        'DELETE FROM programs WHERE id = $1 AND institution_id = $2 RETURNING id',
        [id, institutionId]
      );

      if (deleteResult.rows.length === 0) {
        return NextResponse.json({ error: 'Program not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error deleting program:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
