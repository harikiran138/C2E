import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyPassword } from '@/lib/auth/hash';
import { createSession } from '@/lib/auth/session';

export async function POST(request: Request) {
    try {
        const { program_code, password } = await request.json();

        if (!program_code || !password) {
            return NextResponse.json(
                { error: 'Program code and password are required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Fetch the program
        const { data: program, error } = await supabase
            .from('programs')
            .select('id, institution_id, program_code, program_name, password_hash, status')
            .eq('program_code', program_code)
            .single();

        if (error || !program) {
            return NextResponse.json(
                { error: 'Invalid program code or password' },
                { status: 401 }
            );
        }

        if (program.status !== 'active') {
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

        // Verify password
        const isPasswordValid = await verifyPassword(password, program.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid program code or password' },
                { status: 401 }
            );
        }

        // Create session cookie
        await createSession({
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
    } catch (error) {
        console.error('Program login error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
