import pool from '@/lib/postgres';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

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
        // 1. Fetch Institution Name, Vision, and Mission
        const nameRes = await client.query('SELECT institution_name, vision, mission FROM institutions WHERE id = $1', [institutionId]);
        const institutionName = nameRes.rows[0]?.institution_name || 'Institution';
        const vision = nameRes.rows[0]?.vision;
        const mission = nameRes.rows[0]?.mission;

        // 2. Total Programs
        const progRes = await client.query('SELECT COUNT(*) as count FROM programs WHERE institution_id = $1', [institutionId]);
        const programsCount = parseInt(progRes.rows[0]?.count || '0');

        // 3. PAC Members (Correct table: pac_members)
        let pacCount = 0;
        if (programId) {
            const pacRes = await client.query('SELECT COUNT(*) as count FROM pac_members WHERE program_id = $1', [programId]);
            pacCount = parseInt(pacRes.rows[0]?.count || '0');
        }

        // 4. BoS Members (Correct table: bos_members)
        let bosCount = 0;
        if (programId) {
            const bosRes = await client.query('SELECT COUNT(*) as count FROM bos_members WHERE program_id = $1', [programId]);
            bosCount = parseInt(bosRes.rows[0]?.count || '0');
        }

        // 5. Representative Stakeholders (Correct table: representative_stakeholders)
        let stakeholdersCount = 0;
        if (programId) {
            const stakeRes = await client.query('SELECT COUNT(*) as count FROM representative_stakeholders WHERE program_id = $1', [programId]);
            stakeholdersCount = parseInt(stakeRes.rows[0]?.count || '0');
        }

        // 6. Program Step Statuses (New mapping for customization)
        let stepStatus: Record<string, any> = {};
        if (programId) {
            // Check Program Coordinator
            const coordRes = await client.query('SELECT COUNT(*) as count FROM program_coordinators WHERE program_id = $1', [programId]);
            stepStatus['process-2'] = parseInt(coordRes.rows[0]?.count) > 0;

            // Check PAC
            stepStatus['process-3'] = pacCount > 0;

            // Check Stakeholders
            stepStatus['process-4'] = stakeholdersCount > 0;

            // Check Vision/Mission (finalized)
            const vmpRes = await client.query('SELECT COUNT(*) as count FROM program_vmp_versions WHERE program_id = $1 AND is_final = true', [programId]);
            stepStatus['process-5'] = parseInt(vmpRes.rows[0]?.count) > 0;

            // Check PO/PSOs
            const poRes = await client.query('SELECT COUNT(*) as count FROM program_outcomes WHERE program_id = $1', [programId]);
            const psoRes = await client.query('SELECT COUNT(*) as count FROM program_psos WHERE program_id = $1', [programId]);
            stepStatus['process-6'] = parseInt(poRes.rows[0]?.count) > 0 || parseInt(psoRes.rows[0]?.count) > 0;
        }

        // 7. Academic Council Members (Always institutional)
        const acRes = await client.query('SELECT COUNT(*) as count FROM academic_council WHERE institution_id = $1', [institutionId]);
        const acCount = parseInt(acRes.rows[0]?.count || '0');

        // 6. Full Programs List (New)
        const allProgsRes = await client.query(
            'SELECT id, program_name, degree, level, program_code, academic_year, created_at FROM programs WHERE institution_id = $1 ORDER BY created_at DESC',
            [institutionId]
        );
        const programsList = allProgsRes.rows || [];

        // 7. Recent Activities (Filter by program if selected)
        let recentQuery = 'SELECT id, program_name, created_at FROM programs WHERE institution_id = $1';
        let recentParams = [institutionId];
        if (programId) {
            recentQuery += ' AND id = $2';
            recentParams.push(programId);
        }
        recentQuery += ' ORDER BY created_at DESC LIMIT 5';
        
        const recentRes = await client.query(recentQuery, recentParams);
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
            vision,
            mission,
            totalPrograms: programsCount,
            programs: programsList,
            pacMembers: pacCount,
            bosMembers: bosCount,
            stakeholdersCount,
            stepStatus,
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
