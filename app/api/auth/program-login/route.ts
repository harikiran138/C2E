import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/hash';
import { createSession } from '@/lib/auth/session';
import pool from '@/lib/postgres';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const programCode = String(body?.program_code || '').trim();
        const password = String(body?.password || '');

        if (!programCode || !password) {
            return NextResponse.json(
                { error: 'Program code and password are required' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const programResult = await client.query(
                `SELECT id, institution_id, program_code, program_name, password_hash, status
                 FROM programs
                 WHERE program_code = $1
                 LIMIT 1`,
                [programCode]
            );

            const program = programResult.rows[0];
            if (!program) {
                return NextResponse.json(
                    { error: 'Invalid program code or password' },
                    { status: 401 }
                );
            }

            if (String(program.status || '').toLowerCase() !== 'active') {
                return NextResponse.json(
                    { error: 'Program is inactive' },
                    { status: 403 }
                );
            }

            if (!program.password_hash) {
                return NextResponse.json(
                    { error: 'Invalid program code or password' },
                    { status: 401 }
                );
            }

            const isPasswordValid = await verifyPassword(password, program.password_hash);
            if (!isPasswordValid) {
                return NextResponse.json(
                    { error: 'Invalid program code or password' },
                    { status: 401 }
                );
            }

            await createSession({
                userType: 'program',
                role: 'program_admin',
                programId: program.id,
                programCode: program.program_code,
                programName: program.program_name,
                institutionId: program.institution_id,
                // Legacy keys for compatibility.
                program_id: program.id,
                institution_id: program.institution_id,
                program_code: program.program_code,
                program_name: program.program_name,
            });

            return NextResponse.json({
                success: true,
                program: {
                    id: program.id,
                    program_code: program.program_code,
                    program_name: program.program_name,
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Program login error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
