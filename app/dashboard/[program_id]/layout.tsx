import { Metadata } from 'next';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import ProgramWorkspace from '@/components/program/workspace/ProgramWorkspace';

export const metadata: Metadata = {
    title: 'Program Dashboard - C2X Plus',
    description: 'Program execution and outcome management dashboard',
};

export default async function ProgramDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ program_id: string }>;
}) {
    const { program_id } = await params;

    // Verify session
    const session = await getSession();

    if (!session) {
        redirect('/program-login');
    }

    // Optional: Verify the URL matches their session program
    if (session.program_id !== program_id) {
        redirect(`/dashboard/${session.program_id}`);
    }

    return (
        <ProgramWorkspace
            programId={session.program_id}
            programName={session.program_name}
            programCode={session.program_code}
        >
            {children}
        </ProgramWorkspace>
    );
}
