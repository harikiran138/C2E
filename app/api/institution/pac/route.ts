import pool from '@/lib/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO pac_council (
            program_id,
            member_name,
            member_id,
            organization,
            email,
            mobile_number,
            category,
            specialisation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          body.program_id,
          body.member_name,
          body.member_id,
          body.organization,
          body.email,
          body.mobile_number,
          body.category,
          body.specialisation
        ]
      );

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('PAC API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
