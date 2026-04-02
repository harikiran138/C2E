import InstitutionWorkspace from "@/components/institution/workspace/InstitutionWorkspace";
import ProcessStepPanel from "@/components/institution/workspace/ProcessStepPanel";
import { getProcessStep } from "@/lib/institution/process";
import { notFound } from "next/navigation";

interface ProcessPageProps {
  params: Promise<{ step: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProgramProcessPage({ params }: ProcessPageProps) {
  const { step } = await params;
  const processStep = getProcessStep(step);

  if (!processStep) {
    notFound();
  }

  return (
    <InstitutionWorkspace
      activeStepKey={processStep.key}
      title={processStep.title}
      subtitle={processStep.description || ""}
    >
      <ProcessStepPanel step={processStep} />
    </InstitutionWorkspace>
  );
}
