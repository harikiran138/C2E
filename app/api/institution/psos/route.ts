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

    if (!programId) {
      return NextResponse.json({ error: 'Program ID required' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM program_psos WHERE program_id = $1 ORDER BY pso_number ASC',
        [programId]
      );
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { program_id, psos } = await request.json();
    const programId = String(program_id || '');

    if (!programId || !Array.isArray(psos)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM program_psos WHERE program_id = $1', [programId]);

      if (psos.length > 0) {
        for (let i = 0; i < psos.length; i += 1) {
          await client.query(
            'INSERT INTO program_psos (program_id, pso_statement, pso_number) VALUES ($1, $2, $3)',
            [programId, psos[i].statement, i + 1]
          );
        }
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
    console.error('PSO Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const client = await pool.connect();
    try {
      if (context.mode === 'program') {
        await client.query('DELETE FROM program_psos WHERE id = $1 AND program_id = $2', [id, context.programId]);
      } else {
        await client.query(
          `DELETE FROM program_psos
           WHERE id = $1
             AND program_id IN (SELECT id FROM programs WHERE institution_id = $2)`,
          [id, context.institutionId]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
