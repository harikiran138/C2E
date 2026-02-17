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
    
    // Fetch coordinators
    const { data: coordinators, error } = await supabase
        .from('program_coordinators')
        .select(`
            *,
            programs (
                program_name
            )
        `)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching Program Coordinators:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the structure for easier frontend consumption if needed, 
    // or just return as is. The frontend can access programs.program_name
    const formattedData = coordinators.map(c => ({
        ...c,
        program_name: c.programs?.program_name || 'Unknown Program'
    }));

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Program Coordinator Fetch Error:', error);
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
        // Update existing coordinator
        query = supabase
            .from('program_coordinators')
            .update({
                name: body.name,
                designation: body.designation,
                program_id: body.program_id,
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
        // Insert new coordinator
        query = supabase
            .from('program_coordinators')
            .insert({
                institution_id: institutionId,
                name: body.name,
                designation: body.designation,
                program_id: body.program_id,
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
        console.error('Error saving program coordinator:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Program Coordinator API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from('program_coordinators')
        .delete()
        .eq('id', id)
        .eq('institution_id', institutionId);

    if (error) {
        console.error('Error deleting coordinator:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Program Coordinator DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
