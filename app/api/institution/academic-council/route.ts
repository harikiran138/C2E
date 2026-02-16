import { createClient } from '../../../../utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('institution_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const institutionId = payload.id;

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('academic_council')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching council members:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Academic Council Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('institution_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const institutionId = payload.id as string;

    const body = await request.json();
    const supabase = await createClient();

    let query;

    if (body.id) {
        // Update existing member
        query = supabase
            .from('academic_council')
            .update({
                member_name: body.member_name,
                member_id: body.member_id,
                organization: body.organization,
                email: body.email,
                mobile_number: body.mobile_number,
                specialisation: body.specialisation,
                category: body.category,
                communicate: body.communicate,
                tenure_start_date: body.tenure_start_date || null,
                tenure_end_date: body.tenure_end_date || null,
                linkedin_id: body.linkedin_id
            })
            .eq('id', body.id)
            .eq('institution_id', institutionId)
            .select()
            .single();
    } else {
        // Insert new member
        query = supabase
            .from('academic_council')
            .insert({
                institution_id: institutionId,
                member_name: body.member_name,
                member_id: body.member_id,
                organization: body.organization,
                email: body.email,
                mobile_number: body.mobile_number,
                specialisation: body.specialisation,
                category: body.category,
                communicate: body.communicate,
                tenure_start_date: body.tenure_start_date || null,
                tenure_end_date: body.tenure_end_date || null,
                linkedin_id: body.linkedin_id
            })
            .select()
            .single();
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error saving council member:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Academic Council API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
