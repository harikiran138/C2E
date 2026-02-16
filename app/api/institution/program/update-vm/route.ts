import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { program_id, vision, mission } = body;

    if (!program_id) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE programs 
         SET vision = $1, 
             mission = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [vision, mission, program_id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Update VM Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
