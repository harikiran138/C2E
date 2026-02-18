import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      program_id, 
      program_vision, 
      program_mission, 
      vision_inputs_used, 
      mission_inputs_used,
      generated_by_ai,
      // Keep support for legacy fields if they are sent
      vision,
      mission,
      vision_priorities,
      mission_priorities
    } = body;

    if (!program_id) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE programs 
         SET vision = $1, 
             mission = $2,
             vision_priorities = $3,
             mission_priorities = $4,
             program_vision = $5,
             program_mission = $6,
             vision_inputs_used = $7,
             mission_inputs_used = $8,
             generated_by_ai = $9,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
         RETURNING *`,
        [
          vision || program_vision, 
          mission || program_mission, 
          vision_priorities || vision_inputs_used, 
          mission_priorities || mission_inputs_used,
          program_vision,
          program_mission,
          vision_inputs_used,
          mission_inputs_used,
          generated_by_ai || false,
          program_id
        ]
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
