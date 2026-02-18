import pool from '@/lib/postgres';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    console.log(`API Dashboard: Request received for programId: ${programId}`);

    const cookieStore = await cookies();
    const token = cookieStore.get('institution_token')?.value;

    if (!token) {
        console.warn('API Dashboard: Unauthorized - No Token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const institutionId = payload.id as string;
    let dataVars: any = {};

    const client = await pool.connect();
    try {
        // Run independent queries in parallel
        const [
            nameRes,
            progRes,
            obeRes,
            acRes,
            allProgsRes
        ] = await Promise.all([
            client.query('SELECT institution_name, vision, mission FROM institutions WHERE id = $1', [institutionId]),
            client.query('SELECT COUNT(*) as count FROM programs WHERE institution_id = $1', [institutionId]),
            client.query('SELECT COUNT(*) as count FROM obe_framework WHERE institution_id = $1', [institutionId]),
            client.query('SELECT COUNT(*) as count FROM academic_council WHERE institution_id = $1', [institutionId]),
            client.query('SELECT id, program_name, degree, level, program_code, academic_year, created_at FROM programs WHERE institution_id = $1 ORDER BY created_at DESC', [institutionId])
        ]);

        const institutionName = nameRes.rows[0]?.institution_name || 'Institution';
        const vision = nameRes.rows[0]?.vision;
        const mission = nameRes.rows[0]?.mission;
        const programsCount = parseInt(progRes.rows[0]?.count || '0');
        const obeCount = parseInt(obeRes.rows[0]?.count || '0');
        const acCount = parseInt(acRes.rows[0]?.count || '0');
        const programsList = allProgsRes.rows || [];

        let dataVars: any = {};
        let stepStatus: Record<string, any> = {};
        stepStatus['process-1'] = obeCount > 0;

        let pacCount = 0;
        let bosCount = 0;
        let stakeholdersCount = 0;
        let peoCount = 0;
        let poCount = 0;
        let psoCount = 0;

        if (programId) {
            // Run program-specific queries in parallel
            const [
                pacRes,
                bosRes,
                stakeRes,
                coordRes,
                vmpRes,
                peoRes,
                poRes,
                psoRes
            ] = await Promise.all([
                client.query('SELECT COUNT(*) as count FROM pac_members WHERE program_id = $1', [programId]),
                client.query('SELECT COUNT(*) as count FROM bos_members WHERE program_id = $1', [programId]),
                client.query('SELECT COUNT(*) as count FROM representative_stakeholders WHERE program_id = $1', [programId]),
                client.query('SELECT COUNT(*) as count FROM program_coordinators WHERE program_id = $1', [programId]),
                client.query('SELECT EXISTS(SELECT 1 FROM program_vmp_versions WHERE program_id = $1 AND is_final = true) as finalized', [programId]),
                client.query('SELECT COUNT(*) as count FROM program_peos WHERE program_id = $1', [programId]),
                client.query('SELECT COUNT(*) as count FROM program_outcomes WHERE program_id = $1', [programId]),
                client.query('SELECT COUNT(*) as count FROM program_psos WHERE program_id = $1', [programId])
            ]);

            pacCount = parseInt(pacRes.rows[0]?.count || '0');
            bosCount = parseInt(bosRes.rows[0]?.count || '0');
            stakeholdersCount = parseInt(stakeRes.rows[0]?.count || '0');
            peoCount = parseInt(peoRes.rows[0]?.count || '0');
            poCount = parseInt(poRes.rows[0]?.count || '0');
            psoCount = parseInt(psoRes.rows[0]?.count || '0');

            stepStatus['process-2'] = parseInt(coordRes.rows[0]?.count) > 0;
            stepStatus['process-3'] = pacCount > 0;
            stepStatus['process-4'] = bosCount > 0;
            stepStatus['process-5'] = stakeholdersCount > 0;
            stepStatus['process-6'] = vmpRes.rows[0]?.finalized;
            stepStatus['process-7'] = peoCount > 0;
            stepStatus['process-9'] = poCount > 0;
            stepStatus['process-10'] = psoCount > 0;

            dataVars.peoCount = peoCount;
            dataVars.poCount = poCount;
            dataVars.psoCount = psoCount;
        }

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
            ...dataVars,
            institutionName,
            vision,
            mission,
            totalPrograms: programsCount,
            programs: programsList,
            pacMembers: pacCount,
            bosMembers: bosCount,
            stakeholdersCount,
            obeFrameworkCount: obeCount,
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
