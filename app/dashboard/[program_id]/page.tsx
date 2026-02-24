import { redirect } from 'next/navigation';

export default async function LegacyProgramDashboardPage({
  params,
}: {
  params: Promise<{ program_id: string }>;
}) {
  const { program_id } = await params;
  redirect(`/program/${program_id}/dashboard`);
}
