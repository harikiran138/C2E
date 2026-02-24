import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/auth/hash';
import { createSession } from '@/lib/auth/session';
import pool from '@/lib/postgres';

const DEFAULT_PROGRAM_PASSWORD = 'password';

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
                 WHERE UPPER(program_code) = UPPER($1)
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

            if (password === DEFAULT_PROGRAM_PASSWORD) {
                // Requested behavior: keep default program password usable for all programs.
                if (!program.password_hash || !(await verifyPassword(DEFAULT_PROGRAM_PASSWORD, program.password_hash))) {
                    const migratedHash = await hashPassword(DEFAULT_PROGRAM_PASSWORD);
                    await client.query(
                        'UPDATE programs SET password_hash = $1, updated_at = NOW() WHERE id = $2',
                        [migratedHash, program.id]
                    );
                }
            } else if (!program.password_hash) {
                return NextResponse.json(
                    { error: 'Invalid program code or password' },
                    { status: 401 }
                );
            } else {
                const isPasswordValid = await verifyPassword(password, program.password_hash);
                if (!isPasswordValid) {
                    return NextResponse.json(
                        { error: 'Invalid program code or password' },
                        { status: 401 }
                    );
                }
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
