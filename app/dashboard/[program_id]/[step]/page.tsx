import { redirect } from 'next/navigation';

export default async function LegacyProgramStepPage({
  params,
}: {
  params: Promise<{ program_id: string; step: string }>;
}) {
  const { program_id, step } = await params;
  redirect(`/program/${program_id}/${step}`);
}
