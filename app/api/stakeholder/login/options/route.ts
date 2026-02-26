import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('instituteId');

    const client = await pool.connect();
    try {
      if (instituteId) {
        const programsRes = await client.query(
          `SELECT id, program_name, program_code
           FROM programs
           WHERE institution_id = $1
           ORDER BY program_name ASC`,
          [instituteId]
        );

        return NextResponse.json({
          programs: programsRes.rows.map((row) => ({
            id: String(row.id),
            name: String(row.program_name),
            code: row.program_code ? String(row.program_code) : '',
          })),
        });
      }

      const institutesRes = await client.query(
        `SELECT id, institution_name
         FROM institutions
         ORDER BY institution_name ASC`
      );

      return NextResponse.json({
        institutes: institutesRes.rows.map((row) => ({
          id: String(row.id),
          name: String(row.institution_name),
        })),
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Stakeholder login options error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load options' }, { status: 500 });
  }
}
