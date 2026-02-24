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

    const { program_id, consistency_matrix } = await request.json();
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
         SET consistency_matrix = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [consistency_matrix, programId]
      );

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Update Matrix Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
