'use client';

import Link from 'next/link';
import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import { PROCESS_MENU_STEPS, SIDE_MENU_STEPS } from '@/lib/institution/process';

export default function Dashboard() {
  return (
    <InstitutionWorkspace
      title="Institution Curriculum Design Dashboard"
      subtitle="Follow the side menu and process sequence exactly as defined in the approved workflow."
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Workflow Frame Ready</h3>
          <p className="mt-2 text-sm text-slate-600">
            After institutional entries, this frame opens with college name on the top-left. Use the left menu to open each section.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Side Menu</h4>
            <div className="space-y-2">
              {SIDE_MENU_STEPS.map((step) => (
                <Link
                  key={step.key}
                  href={`/institution/process/${step.key}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{step.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Process</h4>
            <div className="space-y-2">
              {PROCESS_MENU_STEPS.map((step) => (
                <Link
                  key={step.key}
                  href={`/institution/process/${step.key}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{step.processNumber}.</span>
                    {step.aiDriven ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">AI</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </InstitutionWorkspace>
  );
}
