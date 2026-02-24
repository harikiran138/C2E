import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProcessStepPanel from '@/components/institution/workspace/ProcessStepPanel';
import { getProcessStep } from '@/lib/institution/process';

const ROUTE_TO_STEP: Record<string, string> = {
  tutor: 'process-1',
  committee: 'process-3',
  bos: 'process-4',
  stakeholders: 'process-5',
  obe: 'process-6',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const mappedStep = ROUTE_TO_STEP[section] || section;
  const processStep = getProcessStep(mappedStep);

  if (section === 'reports') {
    return { title: 'Program Reports - C2X Plus' };
  }

  return {
    title: processStep ? `${processStep.title} - Program Dashboard` : 'Program Dashboard',
  };
}

export default async function ProgramSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (section === 'reports') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Reports</h2>
        <p className="text-slate-600">
          Program reports will be generated here based on approved Vision, Mission, PEO, PO, and PSO datasets.
        </p>
      </div>
    );
  }

  const mappedStep = ROUTE_TO_STEP[section] || section;
  const processStep = getProcessStep(mappedStep);
  if (!processStep) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ProcessStepPanel step={processStep} />
    </div>
  );
}
