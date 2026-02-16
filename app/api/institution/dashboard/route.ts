import pool from '@/lib/postgres';
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
    const institutionId = payload.id as string;

    const client = await pool.connect();
    try {
        // 1. Fetch Institution Name
        const nameRes = await client.query('SELECT institution_name FROM institutions WHERE id = $1', [institutionId]);
        const institutionName = nameRes.rows[0]?.institution_name || 'Institution';

        // 2. Total Programs
        const progRes = await client.query('SELECT COUNT(*) as count FROM programs WHERE institution_id = $1', [institutionId]);
        const programsCount = parseInt(progRes.rows[0]?.count || '0');

        // 3. PAC Members
        const pacRes = await client.query('SELECT COUNT(*) as count FROM pac_council p JOIN programs pr ON p.program_id = pr.id WHERE pr.institution_id = $1', [institutionId]);
        const pacCount = parseInt(pacRes.rows[0]?.count || '0');

        // 4. BoS Members
        const bosRes = await client.query('SELECT COUNT(*) as count FROM bos_council b JOIN programs pr ON b.program_id = pr.id WHERE pr.institution_id = $1', [institutionId]);
        const bosCount = parseInt(bosRes.rows[0]?.count || '0');

        // 5. Academic Council Members
        const acRes = await client.query('SELECT COUNT(*) as count FROM academic_council WHERE institution_id = $1', [institutionId]);
        const acCount = parseInt(acRes.rows[0]?.count || '0');

        // 6. Recent Activities (Programs)
        const recentRes = await client.query('SELECT id, program_name, created_at FROM programs WHERE institution_id = $1 ORDER BY created_at DESC LIMIT 5', [institutionId]);
        const activities = (recentRes.rows || []).map(p => ({
            id: p.id,
            user: { name: 'Institutional Admin', avatar: '', initials: 'IA' },
            action: 'added a new program',
            target: p.program_name,
            timestamp: new Date(p.created_at).toLocaleDateString(),
            type: 'program' as const
        }));

        const data = {
            institutionName,
            totalPrograms: programsCount,
            pacMembers: pacCount,
            bosMembers: bosCount,
            academicCouncilMembers: acCount,
            activeStudents: 120, // Placeholder
            totalResponses: 0, 
            avgRating: 4.8,
            recentActivities: activities
        };

        return NextResponse.json(data);
    } finally {
        client.release();
    }

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error?.message, stack: error?.stack }, { status: 500 });
  }
}
