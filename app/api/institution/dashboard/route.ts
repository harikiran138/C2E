import { createClient } from '../../../../utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('institution_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key');
    let institutionId: string;

    try {
        const { payload } = await jwtVerify(token, secret);
        institutionId = payload.id as string;
    } catch (err) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch Stats
    // 1. Total Programs
    const { count: programsCount } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId);

    // 2. PAC Members
    const { count: pacCount } = await supabase
        .from('pac_council')
        .select('*, programs!inner(institution_id)', { count: 'exact', head: true })
        .eq('programs.institution_id', institutionId);

    // 3. BoS Members
    const { count: bosCount } = await supabase
        .from('bos_council')
        .select('*, programs!inner(institution_id)', { count: 'exact', head: true })
        .eq('programs.institution_id', institutionId);

    // 4. Academic Council Members
    const { count: acCount } = await supabase
        .from('academic_council')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId);
    
    // Construct response
    const data = {
        totalPrograms: programsCount || 0,
        pacMembers: pacCount || 0,
        bosMembers: bosCount || 0,
        academicCouncilMembers: acCount || 0,
        activeStudents: 120, // Placeholder
        totalResponses: 0, 
        avgRating: 4.8 
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
