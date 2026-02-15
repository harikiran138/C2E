'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProcessStep } from '@/lib/institution/process';

interface ProcessStepPanelProps {
  step: ProcessStep;
}

interface ProgramOption {
  id: string;
  program_name: string;
  program_code: string;
}

const ACADEMIC_COUNCIL_CATEGORIES = [
  'The Principal (Chairman)',
  'Head of the Department',
  'Senior Teachers',
  'Governing Body Nominee',
  'University Nominee',
  'UGC Nominee',
  'Member Secretary',
];

function SharedForm({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
      {step.aiDriven ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          This section is AI driven as per specification.
        </div>
      ) : null}
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

function AcademicCouncilForm() {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Constitute Academic Council</h3>
      <p className="text-sm text-slate-600">Form requirements from document are implemented exactly in this panel.</p>

      <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Name of the Member</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Member full name" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Member ID</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Member ID" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Organisation</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Organisation" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Email ID</label>
          <input type="email" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Email ID" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mobile Number</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Mobile number" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Specialisation</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Specialisation" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Category</label>
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Select category</option>
            {ACADEMIC_COUNCIL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Communicate</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Communication mode / remarks" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tenure Starting Date</label>
          <input type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tenure Ending Date</label>
          <input type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">LinkedIn ID</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="LinkedIn profile URL" />
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-3 pt-1">
          <button type="button" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Save</button>
          <button type="button" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Edit</button>
          <button type="button" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Print PDF</button>
        </div>
      </form>
    </div>
  );
}

function SelectProgramPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState(searchParams.get('programId') || '');

  useEffect(() => {
    const queryProgram = searchParams.get('programId') || '';
    setSelectedProgramId(queryProgram);
  }, [searchParams]);

  useEffect(() => {
    const loadPrograms = async () => {
      const response = await fetch('/api/institution/details');
      if (!response.ok) return;

      const payload = await response.json();
      if (Array.isArray(payload?.programs)) {
        setPrograms(
          payload.programs
            .map((program: ProgramOption) => ({
              id: program.id,
              program_name: program.program_name,
              program_code: program.program_code,
            }))
            .sort((a: ProgramOption, b: ProgramOption) => a.program_name.localeCompare(b.program_name))
        );
      }
    };

    loadPrograms();
  }, []);

  const onProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    const next = new URLSearchParams(searchParams.toString());
    if (programId) {
      next.set('programId', programId);
    } else {
      next.delete('programId');
    }
    router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Select Program of Study</h3>
      <p className="text-sm text-slate-600">Name of the Program (Drop down Menu) - floated from institutional details.</p>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Name of the Program</label>
        <select
          value={selectedProgramId}
          onChange={(e) => onProgramChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Select program</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.program_name} ({program.program_code})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ConsistencyMatrixPanel() {
  const rows = ['Mission 1', 'Mission 2', 'Mission 3'];
  const cols = ['PEO 1', 'PEO 2', 'PEO 3', 'PEO 4'];

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Generate Consistency Matrix of Mission & PEOs</h3>
      <p className="text-sm text-slate-600">Generate and fill consistency values to validate Mission to PEO mapping.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Mission \ PEO</th>
              {cols.map((col) => (
                <th key={col} className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">{row}</td>
                {cols.map((col) => (
                  <td key={`${row}-${col}`} className="border-b border-slate-100 px-4 py-3">
                    <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                      <option>0</option>
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                    </select>
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

export default function ProcessStepPanel({ step }: ProcessStepPanelProps) {
  if (step.key === 'council') {
    return <AcademicCouncilForm />;
  }

  if (step.key === 'process-2') {
    return <SelectProgramPanel />;
  }

  if (step.key === 'process-7') {
    return <ConsistencyMatrixPanel />;
  }

  if (step.key === 'process-14') {
    return <DevelopCurriculumPanel />;
  }

  if (step.kind === 'action' || step.kind === 'info') {
    return <ActionPanel step={step} />;
  }

  return <SharedForm step={step} />;
}
