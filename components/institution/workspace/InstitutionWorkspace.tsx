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

import { useInstitution } from '@/context/InstitutionContext';

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

  const { institution, programs, selectProgram, selectedProgram } = useInstitution();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const institutionName = institution?.institution_name || 'Institution';
  const selectedProgramId = selectedProgram?.id || '';

  // Handle scroll listener for header transitions
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await fetch('/api/institution/logout', { method: 'POST' });
      window.location.href = '/institution/login';
    } catch (error) {
      console.error('Logout error:', error);
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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[320px] bg-white border-r border-slate-200 lg:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black italic text-sm shadow-indigo-200 shadow-lg">C</div>
                    <span className="font-bold text-slate-900">C2X Plus+</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600">
                    <X className="size-5" />
                  </button>
                </div>
                <div ref={mobileSidebarRef} className="flex-1 overflow-y-auto p-4 overscroll-y-contain scroll-smooth scrollbar-hide pb-20">
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
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-[280px] z-30 bg-white border-r border-slate-100 shadow-[2px_0_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex h-full flex-col">
             <div className="p-6 pb-2 shrink-0">
                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="size-10 relative flex-none bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                      <Image src="/C2XPlus.jpeg" alt="C2X Plus" fill className="object-contain p-1" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xs font-bold text-slate-900 truncate leading-tight">{institutionName}</h1>
                        <p className="text-[10px] text-slate-500 font-medium">Academic Portal</p>
                    </div>
                </div>
             </div>
             
             {/* Navigation */}
             <div ref={desktopSidebarRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth custom-scrollbar px-3 py-4 space-y-1">
                <SidebarContent 
                    activeStepKey={activeStepKey} 
                    buildHref={buildHref} 
                    institutionName={institutionName} 
                    programs={programs}
                    selectedProgramId={selectedProgramId}
                    onSelectProgram={handleProgramSelect}
                />
             </div>
             
             {/* Footer Info */}
             <div className="p-4 text-center">
                <p className="text-[10px] text-slate-300 font-medium">Powered by C2X Plus v2.0</p>
             </div>
          </div>
        </aside>

        {/* Main Layout Area */}
        <main className="flex-1 flex flex-col min-w-0 lg:pl-[280px] transition-all duration-300">
          
          {/* Sticky Header */}
          <header className={`sticky top-0 z-20 px-6 py-3 transition-all duration-200 ${isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Mobile Toggle */}
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900"
                >
                  <Menu className="size-6" />
                </button>

                {/* Search Bar (Placeholder) */}
                <div className="hidden md:flex items-center gap-2 bg-white/60 border border-slate-200 px-3 py-2 rounded-full w-full max-w-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                    <Icons.Search className="size-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search processes, programs..." 
                      className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-700"
                    />
                    <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500 border-slate-200">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 ml-auto">
                    {/* Notifications */}
                    <button className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors">
                        <Icons.Bell className="size-5" />
                        <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white" />
                    </button>
                    
                    {/* Help */}
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                        <Icons.HelpCircle className="size-5" />
                    </button>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    {/* User Profile dropdown */}
                    <div className="flex items-center gap-3 pl-1">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 leading-none">{institution?.institution_name || 'Admin'}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Administrator</p>
                        </div>
                        <Avatar className="size-9 bg-white border border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500/20 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs">
                                {(institution?.institution_name || 'A').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        
                        {/* Simple Logout Button for now */}
                        <button 
                            onClick={handleLogout}
                            title="Logout"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                            <LogOut className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* Breadcrumb / Layout Title */}
            <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                    {subtitle && <p className="mt-2 text-lg text-slate-500">{subtitle}</p>}
            </div>

            {/* Content Card */}
            <motion.div 
              key={activeStepKey || 'dashboard'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px] relative"
            >
               {children}
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
                    <span className="text-sm font-semibold">Program Dashboard</span>
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
                                <Icon className="size-3.5" />
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
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                active 
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
            >
            {active && (
                <div className="absolute left-0 bottom-1 top-1 w-1 bg-indigo-600 rounded-r-full" />
            )}
            {children}
        </Link>
    );
}


