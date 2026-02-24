import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';
import {
  forbiddenProgramResponse,
  getAccessContext,
  hasProgramAccess,
  unauthorizedResponse,
} from '@/lib/auth/request-access';

export async function PUT(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { program_id, lead_society } = await request.json();
    const programId = String(program_id || '');

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE programs
         SET lead_society = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [lead_society, programId]
      );

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Update Lead Society Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
