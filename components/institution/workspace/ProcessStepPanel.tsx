'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProcessStep } from '@/lib/institution/process';
import ProgramAdvisoryCommitteeForm from '@/components/institution/process/ProgramAdvisoryCommitteeForm';
import BoardOfStudiesForm from '@/components/institution/process/BoardOfStudiesForm';
import RepresentativeStakeholdersForm from '@/components/institution/process/RepresentativeStakeholdersForm';
import VisionMissionGenerator from '@/components/institution/process/VisionMissionGenerator';
import PeoGenerator from '@/components/institution/process/PeoGenerator';
import ConsistencyMatrix from '@/components/institution/process/ConsistencyMatrix';
import ProgramOutcomesForm from '@/components/institution/process/ProgramOutcomesForm';
import UnifiedOutcomesMatrix from '@/components/institution/process/UnifiedOutcomesMatrix';
import PsoGenerator from '@/components/institution/process/PsoGenerator';
import AcademicCouncilForm from '@/components/institution/process/AcademicCouncilForm';
import OBEFrameworkForm from '@/components/institution/process/OBEFrameworkForm';
import ProgramCoordinatorForm from '@/components/institution/process/ProgramCoordinatorForm';

interface ProcessStepPanelProps {
  step: ProcessStep;
}



function DevelopCurriculumPanel() {
  const headers = ['Semester', 'Course Code', 'Course Title', 'Credits', 'Category'];

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Develop Curriculum</h3>
      <p className="text-sm text-slate-600">Table opens on the right side. You can fill prescribed format directly or use Excel-assisted input.</p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Upload Excel (Optional)</label>
        <input type="file" accept=".xlsx,.xls,.csv" className="block w-full text-sm" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-700">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td key={header} className="border-b border-slate-100 px-3 py-2">
                    <input className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder={header} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionPanel({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-700">Record status and communication reference numbers for this process step.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Mark In Progress</button>
          <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Mark Completed</button>
        </div>
      </div>
    </div>
  );
}


function SharedForm({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
    
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Title</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Enter title" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Reference ID</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Enter reference" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</label>
          <textarea className="min-h-[130px] w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Enter details" />
        </div>
        <div className="md:col-span-2">
          <button type="button" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProcessStepPanel({ step }: ProcessStepPanelProps) {
  if (step.key === 'council') {
    return <AcademicCouncilForm />;
  }

  if (step.key === 'process-1') {
    return <OBEFrameworkForm />;
  }

  if (step.key === 'process-2') {
    return <ProgramCoordinatorForm />;
  }

  if (step.key === 'process-3') {
    return <ProgramAdvisoryCommitteeForm />;
  }

  if (step.key === 'process-4') {
    return <BoardOfStudiesForm />;
  }

  if (step.key === 'process-5') {
    return <RepresentativeStakeholdersForm />;
  }

  if (step.key === 'process-6') {
    return <VisionMissionGenerator />;
  }

  if (step.key === 'process-7') {
    return <PeoGenerator />;
  }

  if (step.key === 'process-8') {
    return <ConsistencyMatrix />;
  }

  if (step.key === 'process-9') {
    return <UnifiedOutcomesMatrix />;
  }

  if (step.key === 'process-10') {
    return <PsoGenerator />;
  }

  if (step.key === 'process-14') {
    return <DevelopCurriculumPanel />;
  }

  if (step.kind === 'action' || step.kind === 'info') {
    return <ActionPanel step={step} />;
  }

  // Restore SharedForm usage for steps that don't have a specific component yet.
  if (step.kind === 'form' && !['council', 'process-2', 'process-3', 'process-4', 'process-5', 'process-6', 'process-7', 'process-9', 'process-10', 'process-14'].includes(step.key)) {
     return <SharedForm step={step} />;
  }
  
  // Fallback for matrix steps or unknown kinds
  return <SharedForm step={step} />;
}
