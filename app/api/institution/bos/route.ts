import { createClient } from '../../../../utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('bos_council')
        .insert({
            program_id: body.program_id,
            member_name: body.member_name,
            member_id: body.member_id,
            organization: body.organization,
            email: body.email,
            mobile_number: body.mobile_number,
            category: body.category,
            role: body.role
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving BoS member:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('BoS API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
