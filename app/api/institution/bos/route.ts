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
    const memberId = searchParams.get('id');

    const client = await pool.connect();
    try {
      const params: any[] = [];
      const where: string[] = [];
      let query = 'SELECT bm.* FROM bos_members bm';

      if (context.mode === 'institution') {
        query += ' INNER JOIN programs p ON p.id = bm.program_id';
        params.push(context.institutionId);
        where.push(`p.institution_id = $${params.length}`);
      }

      if (requestedProgramId) {
        const canAccess = await hasProgramAccess(context, requestedProgramId);
        if (!canAccess) return forbiddenProgramResponse();
        params.push(requestedProgramId);
        where.push(`bm.program_id = $${params.length}`);
      } else if (context.mode === 'program') {
        params.push(context.programId);
        where.push(`bm.program_id = $${params.length}`);
      }

      if (memberId) {
        params.push(memberId);
        where.push(`bm.id = $${params.length}`);
      }

      if (where.length > 0) {
        query += ` WHERE ${where.join(' AND ')}`;
      }

      query += ' ORDER BY bm.created_at ASC';

      const result = await client.query(query, params);
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('BoS API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const body = await request.json();
    const programId = String(body?.program_id || '');

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO bos_members (
            program_id,
            member_name,
            member_id,
            organization,
            email,
            mobile_number,
            specialisation,
            category,
            tenure_start_date,
            tenure_end_date,
            linkedin_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          programId,
          body.member_name,
          body.member_id,
          body.organization,
          body.email,
          body.mobile_number,
          body.specialisation,
          body.category,
          body.tenure_start_date || null,
          body.tenure_end_date || null,
          body.linkedin_id,
        ]
      );

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('BoS API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required for update' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const currentRecord = await client.query('SELECT program_id FROM bos_members WHERE id = $1 LIMIT 1', [id]);
      if ((currentRecord.rowCount || 0) === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const targetProgramId = String(fields.program_id || currentRecord.rows[0].program_id || '');
      const canAccess = await hasProgramAccess(context, targetProgramId);
      if (!canAccess) return forbiddenProgramResponse();

      const result = await client.query(
        `UPDATE bos_members SET
            member_name = $1,
            member_id = $2,
            organization = $3,
            email = $4,
            mobile_number = $5,
            specialisation = $6,
            category = $7,
            tenure_start_date = $8,
            tenure_end_date = $9,
            linkedin_id = $10,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $11 AND program_id = $12 RETURNING *`,
        [
          fields.member_name,
          fields.member_id,
          fields.organization,
          fields.email,
          fields.mobile_number,
          fields.specialisation,
          fields.category,
          fields.tenure_start_date || null,
          fields.tenure_end_date || null,
          fields.linkedin_id,
          id,
          targetProgramId,
        ]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('BoS API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      if (context.mode === 'program') {
        await client.query('DELETE FROM bos_members WHERE id = $1 AND program_id = $2', [id, context.programId]);
      } else {
        await client.query(
          `DELETE FROM bos_members
           WHERE id = $1
             AND program_id IN (SELECT id FROM programs WHERE institution_id = $2)`,
          [id, context.institutionId]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('BoS API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
