'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PROCESS_MENU_STEPS, SIDE_MENU_STEPS } from '@/lib/institution/process';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FileText, LayoutDashboard, Settings, ChevronRight, LogOut, Search, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    if (stepKey === 'dashboard') return query ? `/institution/dashboard?${query}` : '/institution/dashboard';
    const base = `/institution/process/${stepKey}`;
    return query ? `${base}?${query}` : base;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="mx-auto flex max-w-[1600px] gap-8 p-6">
        <aside className="sticky top-6 h-[calc(100vh-3rem)] w-[320px] shrink-0">
          <div className="flex h-full flex-col rounded-[2rem] border border-border/40 bg-sidebar/60 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
             <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
             <div className="p-8 pb-6 border-b border-border/40">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 font-black italic">C</div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Institution</p>
                        <h1 className="text-lg font-bold leading-none mt-0.5">{institutionName}</h1>
                    </div>
                </div>
             </div>

             <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none custom-scrollbar">
                <div className="space-y-8">
                    <div>
                        <div className="px-4 mb-4 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">General</span>
                        </div>
                        <div className="space-y-1">
                            <Link
                                href={buildHref('dashboard')}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative",
                                    !activeStepKey || activeStepKey === 'dashboard'
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                                >
                                {(!activeStepKey || activeStepKey === 'dashboard') && (
                                    <motion.div 
                                        layoutId="active-sidebar-pill"
                                        className="absolute inset-0 bg-primary rounded-xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <LayoutDashboard className="size-4" />
                                <span className="text-sm font-semibold">Dashboard</span>
                            </Link>
                            {SIDE_MENU_STEPS.map((step) => {
                            const active = activeStepKey === step.key;
                            return (
                                <Link
                                key={step.key}
                                href={buildHref(step.key)}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative",
                                    active 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                                >
                                {active && (
                                    <motion.div 
                                        layoutId="active-sidebar-pill"
                                        className="absolute inset-0 bg-primary rounded-xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="text-sm font-semibold">{step.title}</span>
                                </Link>
                            );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="px-4 mb-4 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">OBE Workflow</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/20 text-primary bg-primary/5">Guided</Badge>
                        </div>
                        <div className="space-y-1">
                            {PROCESS_MENU_STEPS.map((step) => {
                            const active = activeStepKey === step.key;
                            return (
                                <Link
                                key={step.key}
                                href={buildHref(step.key)}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative",
                                    active 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                                >
                                {active && (
                                    <motion.div 
                                        layoutId="active-sidebar-pill"
                                        className="absolute inset-0 bg-primary rounded-xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <div className={cn(
                                    "size-6 flex items-center justify-center rounded-lg text-[10px] font-bold border transition-colors",
                                    active ? "bg-white/20 border-white/20 text-white" : "bg-muted border-border/40 text-muted-foreground group-hover:bg-background group-hover:border-primary/40 group-hover:text-primary"
                                )}>
                                    {step.processNumber}
                                </div>
                                <span className="text-sm font-semibold flex-1 truncate">{step.title}</span>
                                {step.aiDriven && (
                                    <span className={cn(
                                        "size-1.5 rounded-full",
                                        active ? "bg-white" : "bg-emerald-500"
                                    )} />
                                )}
                                </Link>
                            );
                            })}
                        </div>
                    </div>
                </div>
             </nav>

             <div className="p-6 mt-auto border-t border-border/40 bg-muted/20">
                <div className="flex items-center gap-3">
                    <Avatar className="size-10 border border-border/40">
                        <AvatarImage src="" />
                        <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">Admin User</p>
                        <p className="text-xs text-muted-foreground truncate">Logout</p>
                    </div>
                </div>
             </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                <Link href="/institution/dashboard" className="hover:text-primary transition-colors">Workspace</Link>
                <span>/</span>
                <span className="text-foreground">{title}</span>
              </nav>
              <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
            </div>
            
            <div className="group relative rounded-[1.5rem] border border-border/40 bg-card/40 backdrop-blur-xl p-4 transition-all hover:border-primary/40 min-w-[300px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 relative">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <FileText className="size-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Program</p>
                        <p className="text-sm font-bold mt-1 text-foreground truncate max-w-[180px]">{selectedProgramLabel}</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl min-h-[600px] relative overflow-hidden">
             <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
             <div className="relative p-8 lg:p-12">
                {children}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
}
