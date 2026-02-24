import { Metadata } from 'next';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import ProgramWorkspace from '@/components/program/workspace/ProgramWorkspace';

export const metadata: Metadata = {
  title: 'Program Dashboard - C2X Plus',
  description: 'Program execution and outcome management dashboard',
};

export default async function ProgramLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<any>;
}) {
  const { programId } = (await params) as { programId: string };
  const session = await getSession();

  if (!session) {
    redirect('/program-login');
  }

  if (session.programId !== programId) {
    redirect(`/program/${session.programId}/dashboard`);
  }

  return (
    <ProgramWorkspace
      programId={session.programId}
      programName={session.programName}
      programCode={session.programCode}
    >
      {children}
    </ProgramWorkspace>
  );
}
