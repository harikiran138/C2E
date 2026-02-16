
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const programId = searchParams.get('programId');
  const institutionId = request.cookies.get('institution_token')?.value ? JSON.parse(atob(request.cookies.get('institution_token')?.value.split('.')[1] || '{}')).id : null;

  if (!institutionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!programId) {
    return NextResponse.json({ error: 'Program ID required' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM public.program_coordinators WHERE institution_id = $1 AND program_id = $2',
      [institutionId, programId]
    );

    return NextResponse.json({ data: result.rows[0] || null });
  } catch (error) {
    console.error('Error fetching coordinator:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const institutionId = request.cookies.get('institution_token')?.value ? JSON.parse(atob(request.cookies.get('institution_token')?.value.split('.')[1] || '{}')).id : null;

    if (!institutionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { 
            program_id, 
            name, 
            designation, 
            email_official, 
            email_personal, 
            mobile_official, 
            mobile_personal, 
            linkedin_id 
        } = body;

        // Validation
        if (!program_id || !name || !designation || !email_official || !mobile_official) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Upsert logic
        const query = `
            INSERT INTO public.program_coordinators (
                institution_id, program_id, name, designation, 
                email_official, email_personal, mobile_official, mobile_personal, linkedin_id, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (program_id) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                designation = EXCLUDED.designation,
                email_official = EXCLUDED.email_official,
                email_personal = EXCLUDED.email_personal,
                mobile_official = EXCLUDED.mobile_official,
                mobile_personal = EXCLUDED.mobile_personal,
                linkedin_id = EXCLUDED.linkedin_id,
                updated_at = NOW()
            RETURNING *;
        `;

        const values = [
            institutionId, program_id, name, designation, 
            email_official, email_personal, mobile_official, mobile_personal, linkedin_id
        ];

        const result = await pool.query(query, values);

        return NextResponse.json({ success: true, data: result.rows[0] });

    } catch (error) {
        console.error('Error saving coordinator:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
