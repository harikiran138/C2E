import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const { program_id, consistency_matrix } = await request.json();

    if (!program_id) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE programs 
         SET consistency_matrix = $1, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [consistency_matrix, program_id]
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
