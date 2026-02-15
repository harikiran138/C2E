'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PROCESS_MENU_STEPS, SIDE_MENU_STEPS } from '@/lib/institution/process';

interface ProgramOption {
  id: string;
  program_name: string;
  program_code: string;
}

interface InstitutionWorkspaceProps {
  title: string;
  subtitle: string;
  activeStepKey?: string;
  children: React.ReactNode;
}

export default function InstitutionWorkspace({
  title,
  subtitle,
  activeStepKey,
  children,
}: InstitutionWorkspaceProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [institutionName, setInstitutionName] = useState('Institution');
  const [programs, setPrograms] = useState<ProgramOption[]>([]);

  const selectedProgramId = searchParams.get('programId') || '';

  useEffect(() => {
    const loadWorkspaceData = async () => {
      const response = await fetch('/api/institution/details');
      if (response.status === 401) {
        router.push('/institution/login');
        return;
      }

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const institution = payload?.institution;
      const dbPrograms = payload?.programs;

      if (institution?.institution_name) {
        setInstitutionName(institution.institution_name);
      }

      if (Array.isArray(dbPrograms)) {
        setPrograms(
          dbPrograms
            .map((program: ProgramOption) => ({
              id: program.id,
              program_name: program.program_name,
              program_code: program.program_code,
            }))
            .sort((a: ProgramOption, b: ProgramOption) => a.program_name.localeCompare(b.program_name))
        );
      }
    };

    loadWorkspaceData();
  }, [router]);

  const selectedProgramLabel = useMemo(() => {
    if (!selectedProgramId) return 'Not selected';
    const selected = programs.find((program) => program.id === selectedProgramId);
    if (!selected) return 'Not selected';
    return `${selected.program_name} (${selected.program_code})`;
  }, [programs, selectedProgramId]);

  const query = searchParams.toString();

  const buildHref = (stepKey: string) => {
    const base = `/institution/process/${stepKey}`;
    return query ? `${base}?${query}` : base;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-6 p-4 lg:p-6">
        <aside className="sticky top-4 h-[calc(100vh-2rem)] w-[360px] shrink-0 overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl">
          <div className="border-b border-white/10 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">College</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">{institutionName}</h1>
          </div>

          <nav className="h-[calc(100%-92px)] overflow-y-auto px-3 py-4">
            <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Side Menu</div>
            {SIDE_MENU_STEPS.map((step) => {
              const active = activeStepKey === step.key;
              return (
                <Link
                  key={step.key}
                  href={buildHref(step.key)}
                  className={`mb-1 block rounded-xl border px-3 py-3 transition ${
                    active
                      ? 'border-white/20 bg-white/10'
                      : 'border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium leading-snug text-white">{step.title}</p>
                </Link>
              );
            })}

            <div className="mb-3 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Process</div>
            {PROCESS_MENU_STEPS.map((step) => {
              const active = activeStepKey === step.key;
              return (
                <Link
                  key={step.key}
                  href={buildHref(step.key)}
                  className={`mb-1 block rounded-xl border px-3 py-3 transition ${
                    active
                      ? 'border-white/20 bg-white/10'
                      : 'border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-300">{step.processNumber}.</span>
                    {step.aiDriven ? (
                      <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">AI</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug text-white">{step.title}</p>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Selected Program</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedProgramLabel}</p>
              </div>
            </header>

            <div className="p-6 lg:p-8">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
