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
  const [isScrolled, setIsScrolled] = useState(false);

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

  // Handle scroll listener for header transitions
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleProgramSelect = (programId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (programId) {
      params.set('programId', programId);
    } else {
      params.delete('programId');
    }
    router.push(`${window.location.pathname}?${params.toString()}`);
    setIsProgramDropdownOpen(false); 
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Mobile Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-[60] flex h-16 items-center justify-between border-b border-border/40 px-4 transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-xl shadow-lg border-primary/10" : "bg-transparent"
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex-none p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors active:scale-95 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className={cn("size-6", !isScrolled && "text-white")} />
          </button>
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 relative flex-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isScrolled ? "scrolled" : "initial"}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0"
                >
                  <Image 
                    src={isScrolled ? "/C2XPlusb_text.jpeg" : "/Logo2w_text.jpeg"} 
                    alt="C2X Plus" 
                    fill 
                    className="object-contain rounded-lg" 
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <h1 className={cn(
              "text-sm font-bold tracking-tight truncate transition-colors",
              isScrolled ? "text-foreground" : "text-white drop-shadow-sm"
            )}>{institutionName}</h1>
          </div>
        </div>
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
                    programs={programs}
                    selectedProgramId={selectedProgramId}
                    onSelectProgram={handleProgramSelect}
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
                <SidebarContent 
                    activeStepKey={activeStepKey} 
                    buildHref={buildHref} 
                    institutionName={institutionName} 
                    programs={programs}
                    selectedProgramId={selectedProgramId}
                    onSelectProgram={handleProgramSelect}
                />
             </div>

             <div className="mt-auto border-t border-border/40 shrink-0">
                <UserSection onLogout={handleLogout} />
             </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 lg:pl-[320px] transition-all duration-300">
          <div 
            className="h-screen overflow-y-auto overscroll-y-contain scroll-smooth custom-scrollbar p-6 lg:p-12 space-y-12 pt-24 lg:pt-12 pb-24" 
            data-lenis-prevent
          >
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
            </div>

            <motion.div 
              key={activeStepKey || 'dashboard'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl min-h-[600px] relative overflow-hidden mb-12"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="relative p-8 lg:p-12">
                {children}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

// --- SHARED SIDEBAR COMPONENTS ---

function SidebarContent({ activeStepKey, buildHref, institutionName, onClose, programs, selectedProgramId, onSelectProgram }: any) {
    const [isProgramExpanded, setIsProgramExpanded] = useState(true);

    const selectedProgramName = useMemo(() => {
        if (!selectedProgramId) return 'Select Program';
        const prog = programs?.find((p: any) => p.id === selectedProgramId);
        return prog ? prog.program_name : 'Select Program';
    }, [selectedProgramId, programs]);

    return (
        <nav className="flex-1 px-4 py-6">
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
                    const isActive = activeStepKey === step.key;
                    
                    return (
                        <motion.div layout initial={false} key={step.key} className="relative">
                            <SidebarLink 
                                href={buildHref(step.key)} 
                                active={isActive}
                                onClick={onClose}
                            >
                                <Icon className="size-4" />
                                <span className="text-sm font-semibold">{step.title}</span>
                            </SidebarLink>

                            {/* Program Selector - Nested under Constitute Academic Council */}
                            {step.key === 'council' && (
                                <div className="ml-5 pl-4 border-l border-border/40 my-1">
                                    <div className="relative">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setIsProgramExpanded(!isProgramExpanded);
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 w-full text-left py-2 px-2 rounded-lg transition-all group",
                                                "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Select Program of Study</p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={cn(
                                                        "text-sm font-medium truncate",
                                                        selectedProgramId ? "text-primary" : "text-foreground/80"
                                                    )}>
                                                        {selectedProgramName}
                                                    </span>
                                                    <ChevronRight className={cn(
                                                        "size-3.5 text-muted-foreground transition-transform duration-300", 
                                                        isProgramExpanded ? "rotate-90" : ""
                                                    )} />
                                                </div>
                                            </div>
                                        </button>
                                        
                                        <AnimatePresence initial={false}>
                                            {isProgramExpanded && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-1 pb-2 space-y-0.5">
                                                        {programs?.map((program: any) => {
                                                            const isSelected = selectedProgramId === program.id;
                                                            return (
                                                                <button
                                                                    key={program.id}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        onSelectProgram(program.id);
                                                                        if (window.innerWidth < 1024) onClose();
                                                                    }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between text-left px-3 py-2 rounded-md transition-all text-xs group/item ml-1",
                                                                        isSelected 
                                                                        ? "bg-primary/10 text-primary font-semibold" 
                                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col truncate">
                                                                        <span className="truncate">{program.program_name}</span>
                                                                        <span className="text-[10px] opacity-70 font-normal">{program.program_code}</span>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <motion.div
                                                                            layoutId="active-program-indicator"
                                                                            className="size-1.5 rounded-full bg-primary shrink-0 ml-2"
                                                                        />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                        {(!programs || programs.length === 0) && (
                                                            <div className="text-[11px] text-muted-foreground/60 italic px-3 py-2">No programs available</div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
                {PROCESS_MENU_STEPS.map((step) => {
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
