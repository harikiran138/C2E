import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';
import {
  forbiddenProgramResponse,
  getAccessContext,
  hasProgramAccess,
  unauthorizedResponse,
} from '@/lib/auth/request-access';

export async function GET(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const requestedProgramId = searchParams.get('programId');
    const programId = requestedProgramId || (context.mode === 'program' ? context.programId : '');

    if (!programId) return NextResponse.json({ error: 'Program ID required' }, { status: 400 });

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM program_outcomes WHERE program_id = $1 ORDER BY po_code ASC',
        [programId]
      );
      const tier = result.rows.length > 0 ? result.rows[0].tier : null;

      return NextResponse.json({ data: result.rows, tier });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { program_id, tier, pos } = await request.json();
    const programId = String(program_id || '');

    if (!programId || !tier || !Array.isArray(pos)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM program_outcomes WHERE program_id = $1', [programId]);

      for (const po of pos) {
        await client.query(
          `INSERT INTO program_outcomes (program_id, po_code, po_title, po_description, tier)
           VALUES ($1, $2, $3, $4, $5)`,
          [programId, po.code || po.po_code, po.title || po.po_title, po.description || po.po_description, tier]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('PO Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
