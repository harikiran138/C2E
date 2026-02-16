import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
        program_id, 
        peo_brainstorming_start_date, peo_brainstorming_end_date,
        peo_feedback_start_date, peo_feedback_end_date,
        peo_consolidation_start_date, peo_consolidation_end_date
    } = body;

    if (!program_id) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE programs 
         SET peo_brainstorming_start_date = $1, 
             peo_brainstorming_end_date = $2,
             peo_feedback_start_date = $3,
             peo_feedback_end_date = $4,
             peo_consolidation_start_date = $5,
             peo_consolidation_end_date = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
            peo_brainstorming_start_date, peo_brainstorming_end_date,
            peo_feedback_start_date, peo_feedback_end_date,
            peo_consolidation_start_date, peo_consolidation_end_date,
            program_id
        ]
      );

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Update PEO Date Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
