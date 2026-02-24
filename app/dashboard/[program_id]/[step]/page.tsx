import { notFound } from 'next/navigation';
import { getProcessStep } from '@/lib/institution/process';
import ProcessStepPanel from '@/components/institution/workspace/ProcessStepPanel';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ step: string }> }): Promise<Metadata> {
    const { step } = await params;
    const processStep = getProcessStep(step);
    return {
        title: processStep ? `${processStep.title} - Program Dashboard` : 'Program Dashboard',
    };
}

export default async function ProgramProcessStepPage({
    params,
}: {
    params: Promise<{ program_id: string; step: string }>;
}) {
    const { step } = await params;
    const processStep = getProcessStep(step);

    if (!processStep) {
        notFound();
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProcessStepPanel step={processStep} />
        </div>
    );
}
