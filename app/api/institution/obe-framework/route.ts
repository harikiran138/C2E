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
        .from('obe_framework')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching Framework members:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('OBE Framework Fetch Error:', error);
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
            .from('obe_framework')
            .update({
                member_name: body.member_name,
                designation: body.designation,
                program: body.program,
                email_official: body.email_official,
                email_personal: body.email_personal,
                mobile_official: body.mobile_official,
                mobile_personal: body.mobile_personal,
                linkedin_id: body.linkedin_id
            })
            .eq('id', body.id)
            .eq('institution_id', institutionId)
            .select()
            .single();
    } else {
        // Insert new member
        query = supabase
            .from('obe_framework')
            .insert({
                institution_id: institutionId,
                member_name: body.member_name,
                designation: body.designation,
                program: body.program,
                email_official: body.email_official,
                email_personal: body.email_personal,
                mobile_official: body.mobile_official,
                mobile_personal: body.mobile_personal,
                linkedin_id: body.linkedin_id
            })
            .select()
            .single();
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error saving framework member:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('OBE Framework API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
