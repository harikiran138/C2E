'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PROCESS_MENU_STEPS, SIDE_MENU_STEPS, ProcessPhase } from '@/lib/institution/process';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { LayoutDashboard, FileText, ChevronRight, Menu, X, Users, BookOpen, CheckSquare, Shield, Gavel, UserPlus, Target, Grid, ListChecks, Sparkles, Share2, Layers, Book, Table, MessageSquare, Send, FileCheck, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/client';

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
  const supabase = createClient();
  const desktopSidebarRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);

  const [institutionName, setInstitutionName] = useState('Institution');
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);

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

  // Handle automatic scrolling to active item
  useEffect(() => {
    if (!activeStepKey) return;

    const scrollActiveIntoView = (container: HTMLDivElement | null) => {
      if (!container) return;
      const activeItem = container.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Use a small timeout to ensure the DOM has updated and sidebar is potentially open
    const timer = setTimeout(() => {
      scrollActiveIntoView(desktopSidebarRef.current);
      scrollActiveIntoView(mobileSidebarRef.current);
    }, 150);

    return () => clearTimeout(timer);
  }, [activeStepKey, isSidebarOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Call server-side logout to clear HttpOnly cookies
      await fetch('/api/institution/logout', { method: 'POST' });
      // Use window.location.href for a hard reload to clear any stale state
      window.location.href = '/institution/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback redirect
      window.location.href = '/institution/login';
    }
  };

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
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-[60] flex h-16 items-center justify-between border-b border-border/40 bg-background/60 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="size-8 relative flex-none">
            <Image src="/C2XPlus.jpeg" alt="C2X Plus" fill className="object-contain rounded-lg shadow-lg shadow-primary/20" />
          </div>
          <h1 className="text-sm font-bold tracking-tight truncate">{institutionName}</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex-none p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[320px] bg-sidebar/80 backdrop-blur-2xl border-r border-border/40 lg:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black italic text-sm">C</div>
                    <span className="font-bold">C2X Plus+</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                    <X className="size-5" />
                  </button>
                </div>
                <div ref={mobileSidebarRef} className="flex-1 overflow-y-auto p-4 overscroll-y-contain scroll-smooth scrollbar-hide pb-20" data-lenis-prevent>
                  <SidebarContent 
                    activeStepKey={activeStepKey} 
                    buildHref={buildHref} 
                    institutionName={institutionName}
                    onClose={() => setIsSidebarOpen(false)}
                  />
                </div>
                <div className="p-6 border-t border-border/40 mt-auto">
                   <UserSection onLogout={handleLogout} />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-[320px] z-30">
          <div className="flex h-full flex-col border-r border-border/40 bg-sidebar/60 backdrop-blur-2xl shadow-xl relative">
             <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
             <div className="p-8 pb-6 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-10 relative flex-none">
                      <Image src="/C2XPlus.jpeg" alt="C2X Plus" fill className="object-contain rounded-xl shadow-lg shadow-primary/20" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Institution</p>
                        <h1 className="text-lg font-bold leading-none mt-0.5">{institutionName}</h1>
                    </div>
                </div>
             </div>
             
             {/* Robust Scrollable Area */}
             <div ref={desktopSidebarRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth scrollbar-hide pb-20" data-lenis-prevent>
                <SidebarContent activeStepKey={activeStepKey} buildHref={buildHref} institutionName={institutionName} />
             </div>

             <div className="mt-auto border-t border-border/40 shrink-0">
                <UserSection onLogout={handleLogout} />
             </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 lg:pl-[320px] transition-all duration-300">
          <div className="p-6 lg:p-12 space-y-8 pt-24 lg:pt-12">
            <div>
              <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                <Link href="/institution/dashboard" className="hover:text-primary transition-colors">Workspace</Link>
                <span>/</span>
                <span className="text-foreground">{title}</span>
              </nav>
              <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
            </div>
            
            <div className="relative">
                <button 
                    onClick={() => setIsProgramDropdownOpen(!isProgramDropdownOpen)}
                    className="group relative rounded-[1.5rem] border border-border/40 bg-card/40 backdrop-blur-xl p-4 transition-all hover:border-primary/40 min-w-[300px] text-left"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                    <div className="flex items-center gap-4 relative">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <FileText className="size-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Program</p>
                            <p className="text-sm font-bold mt-1 text-foreground truncate max-w-[180px]">{selectedProgramId ? programs.find(p => p.id === selectedProgramId)?.program_name || 'Select' : 'Not selected'}</p>
                        </div>
                        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-300", isProgramDropdownOpen ? "rotate-90" : "")} />
                    </div>
                </button>

                <AnimatePresence>
                    {isProgramDropdownOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-full z-50 rounded-2xl border border-border/40 bg-background/80 backdrop-blur-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-2 space-y-1">
                                {programs.map((program) => (
                                    <button
                                        key={program.id}
                                        onClick={() => {
                                            router.push(`/institution/dashboard?programId=${program.id}`);
                                            setIsProgramDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                                            selectedProgramId === program.id 
                                            ? "bg-primary text-primary-foreground" 
                                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{program.program_name}</p>
                                            <p className={cn("text-[10px] uppercase font-bold tracking-wider", selectedProgramId === program.id ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                                                {program.program_code}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                                {programs.length === 0 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">No programs found</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </div>

          <motion.div 
            key={activeStepKey || 'dashboard'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl min-h-[600px] relative overflow-hidden"
          >
             <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
             <div className="relative p-8 lg:p-12">
                {children}
             </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// --- SHARED SIDEBAR COMPONENTS ---

function SidebarContent({ activeStepKey, buildHref, institutionName, onClose }: any) {
    const phases: ProcessPhase[] = ['Set-up', 'Stakeholder & PEOs', 'Program Outcomes', 'Curriculum Development', 'Approval & Closure'];

    return (
        <nav className="flex-1 px-4 py-6">
            <div className="space-y-8">
                <div>
                    <div className="px-4 mb-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">General</span>
                    </div>
                    <div className="space-y-1">
                        <SidebarLink 
                            href={buildHref('dashboard')} 
                            active={!activeStepKey || activeStepKey === 'dashboard'}
                            onClick={onClose}
                        >
                            <LayoutDashboard className="size-4" />
                            <span className="text-sm font-semibold">Dashboard</span>
                        </SidebarLink>
                        {SIDE_MENU_STEPS.map((step) => {
                            const Icon = (Icons as any)[step.icon || 'FileText'] || FileText;
                            return (
                                <SidebarLink 
                                    key={step.key} 
                                    href={buildHref(step.key)} 
                                    active={activeStepKey === step.key}
                                    onClick={onClose}
                                >
                                    <Icon className="size-4" />
                                    <span className="text-sm font-semibold">{step.title}</span>
                                </SidebarLink>
                            );
                        })}
                    </div>
                </div>

                {phases.map((phase) => {
                    const stepsInPhase = PROCESS_MENU_STEPS.filter(s => s.phase === phase);
                    if (stepsInPhase.length === 0) return null;

                    return (
                        <div key={phase}>
                            <div className="px-4 mb-4 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{phase}</span>
                                {phase === 'Set-up' && (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/20 text-primary bg-primary/5">Guided</Badge>
                                )}
                            </div>
                            <div className="space-y-1">
                                {stepsInPhase.map((step) => {
                                    const active = activeStepKey === step.key;
                                    const Icon = (Icons as any)[step.icon || 'Circle'] || ChevronRight;
                                    return (
                                        <SidebarLink 
                                            key={step.key} 
                                            href={buildHref(step.key)} 
                                            active={active}
                                            onClick={onClose}
                                        >
                                            <div className={cn(
                                                "size-6 flex items-center justify-center rounded-lg text-[10px] font-bold border transition-colors shrink-0",
                                                active ? "bg-white/20 border-white/20 text-white" : "bg-muted border-border/40 text-muted-foreground group-hover:bg-background group-hover:border-primary/40 group-hover:text-primary"
                                            )}>
                                                {step.processNumber}
                                            </div>
                                            <span className="text-sm font-semibold flex-1 truncate">{step.title}</span>
                                            {step.aiDriven && (
                                                <Icons.Sparkles className={cn(
                                                    "size-3",
                                                    active ? "text-white" : "text-primary/60"
                                                )} />
                                            )}
                                        </SidebarLink>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}

function SidebarLink({ href, active, children, onClick }: any) {
    return (
        <Link
            href={href}
            onClick={onClick}
            data-active={active}
            className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative",
                active 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            >
            {active && (
                <motion.div 
                    layoutId="mobile-sidebar-pill"
                    className="absolute inset-0 bg-primary rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
            {children}
        </Link>
    );
}

function UserSection({ onLogout }: { onLogout: () => void }) {
    return (
        <div className="p-6 border-t border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
                <Avatar className="size-10 border border-border/40">
                    <AvatarImage src="" />
                    <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">Admin User</p>
                    <button 
                        onClick={onLogout}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors group"
                    >
                        <LogOut className="size-3 group-hover:translate-x-0.5 transition-transform" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
