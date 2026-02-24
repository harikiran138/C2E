'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { LayoutDashboard, ChevronRight, Menu, X, Users, BookOpen, Grid, LogOut, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/client';

interface InstitutionWorkspaceProps {
    title: string;
    subtitle: string;
    activeStepKey?: string;
    children: React.ReactNode;
    headerContent?: React.ReactNode;
}

import { useInstitution } from '@/context/InstitutionContext';

const INSTITUTION_NAV_ITEMS = [
    {
        key: 'dashboard',
        label: 'Institution Dashboard',
        href: '/institution/dashboard',
        icon: <LayoutDashboard className="size-4" />,
    },
    {
        key: 'programs',
        label: 'Programs List',
        href: '/institution/programs',
        icon: <BookOpen className="size-4" />,
    },
    {
        key: 'governance',
        label: 'Governance',
        href: '/institution/governance',
        icon: <Users className="size-4" />,
    },
    {
        key: 'obe-framework',
        label: 'OBE Framework',
        href: '/institution/obe-framework',
        icon: <Grid className="size-4" />,
    },
];

export default function InstitutionWorkspace({
    title,
    subtitle,
    activeStepKey,
    children,
    headerContent,
}: InstitutionWorkspaceProps) {
    const supabase = createClient();
    const desktopSidebarRef = useRef<HTMLDivElement>(null);
    const mobileSidebarRef = useRef<HTMLDivElement>(null);

    const { institution, programs } = useInstitution();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const institutionName = institution?.institution_name || 'Institution';

    // Restore sidebar scroll position on mount
    useEffect(() => {
        const savedScrollPos = sessionStorage.getItem('sidebarScrollPos');
        if (desktopSidebarRef.current && savedScrollPos) {
            // Use a timeout to ensure DOM is fully rendered before restoring scroll
            setTimeout(() => {
                if (desktopSidebarRef.current) {
                    desktopSidebarRef.current.scrollTop = parseInt(savedScrollPos, 10);
                }
            }, 0);
        }
    }, []);

    const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
        sessionStorage.setItem('sidebarScrollPos', e.currentTarget.scrollTop.toString());
    };

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

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
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
                                        onClose={() => setIsSidebarOpen(false)}
                                        programs={programs}
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
                        <div
                            ref={desktopSidebarRef}
                            onScroll={handleSidebarScroll}
                            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-2 pb-24 space-y-2 custom-scrollbar"
                            data-lenis-prevent
                        >
                            <SidebarContent
                                activeStepKey={activeStepKey}
                                programs={programs}
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
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                                {subtitle && <p className="mt-2 text-lg text-slate-500">{subtitle}</p>}
                            </div>
                            {headerContent && (
                                <div className="flex-1 max-w-2xl">
                                    {headerContent}
                                </div>
                            )}
                        </div>

                        {/* Content Area - No more nested white card */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStepKey || 'dashboard'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </main>
            </div>
        </div>
    );
}

// --- SHARED SIDEBAR COMPONENTS ---

function SidebarContent({ activeStepKey, onClose, programs }: any) {
    const [isProgramListOpen, setIsProgramListOpen] = useState(false);
    const [selectedProgramName, setSelectedProgramName] = useState('Select Program');

    const handleProgramPortalOpen = (programCode?: string) => {
        const base = '/program-login';
        const target = programCode ? `${base}?programCode=${encodeURIComponent(programCode)}` : base;
        window.location.href = target;
    };

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* GROUP 1 — Institution */}
            <SidebarGroup title="Institution Dashboard" variant="blue">
                {INSTITUTION_NAV_ITEMS.map((item) => (
                    <SidebarNavItem
                        key={item.key}
                        href={item.href}
                        active={activeStepKey === item.key || (item.key === 'dashboard' && !activeStepKey)}
                        onClick={onClose}
                        icon={item.icon}
                    >
                        {item.label}
                    </SidebarNavItem>
                ))}
            </SidebarGroup>

            {/* PROGRAM SELECTOR (Dropdown Section) */}
            <div className="space-y-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 px-4">Program Portals</p>
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setIsProgramListOpen(!isProgramListOpen);
                        }}
                        className={cn(
                            "flex items-center gap-3 w-full text-left px-5 py-4 rounded-2xl transition-all group border-2 shadow-sm",
                            isProgramListOpen
                                ? "bg-white border-slate-900 ring-4 ring-slate-900/5 shadow-xl shadow-slate-200"
                                : "bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white hover:shadow-md"
                        )}
                    >
                        <div className={cn(
                            "size-8 flex items-center justify-center rounded-xl transition-colors",
                            isProgramListOpen ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                        )}>
                            <BookOpen className="size-4" />
                        </div>
                        <span className={cn(
                            "flex-1 text-sm font-bold",
                            selectedProgramName !== 'Select Program' ? "text-slate-900" : "text-slate-400"
                        )}>
                            {selectedProgramName}
                        </span>
                        <ChevronRight className={cn(
                            "size-4 text-slate-300 transition-transform duration-500",
                            isProgramListOpen ? "rotate-90 text-slate-900" : "group-hover:text-slate-600"
                        )} />
                    </button>

                    <AnimatePresence>
                        {isProgramListOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                className="absolute top-full left-0 right-0 mt-2 z-50 p-2 bg-white border border-slate-100 rounded-[24px] shadow-2xl shadow-slate-300/50 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar"
                            >
                                {programs && programs.length > 0 ? (
                                    programs.map((program: any) => (
                                        <button
                                            key={program.id}
                                            onClick={() => {
                                                setSelectedProgramName(program.program_name);
                                                setIsProgramListOpen(false);
                                                handleProgramPortalOpen(program.program_code);
                                            }}
                                            className={cn(
                                                "w-full flex items-center px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left",
                                                "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <span className="flex-1 pr-2">{program.program_name}</span>
                                            <ChevronRight className="size-3 text-slate-300" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-xs text-slate-400 font-medium italic text-center">No programs available</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function SidebarGroup({ title, children, variant = 'neutral' }: { title: string, children: React.ReactNode, variant?: 'blue' | 'purple' | 'neutral' }) {
    const variants = {
        blue: 'bg-blue-400/[0.06] border-blue-200/40 text-blue-900',
        purple: 'bg-purple-400/[0.06] border-purple-200/40 text-purple-900',
        neutral: 'bg-slate-400/[0.06] border-slate-200/40 text-slate-900'
    };

    const labelVariants = {
        blue: 'text-blue-500',
        purple: 'text-purple-500',
        neutral: 'text-slate-500'
    };

    return (
        <div className={cn("rounded-[32px] p-4 border backdrop-blur-md space-y-1.5 shadow-sm transition-all duration-500", variants[variant])}>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-4 mb-4", labelVariants[variant])}>{title}</p>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );
}

function SidebarNavItem({ href, active, children, onClick, icon, aiDriven, className }: any) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "group flex items-start gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative text-xs font-semibold",
                active
                    ? "bg-white shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100 ring-1 ring-slate-900/5"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-900 hover:shadow-md",
                aiDriven && !active && "border border-dashed border-indigo-200/50 bg-indigo-50/10",
                className
            )}
        >
            {active && (
                <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 bottom-3 top-3 w-1 bg-slate-900 rounded-full"
                />
            )}
            <div className={cn(
                "size-9 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0",
                active
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-300 scale-110"
                    : "bg-white text-slate-400 group-hover:bg-slate-900 group-hover:text-white border border-slate-100 group-hover:border-slate-900 group-hover:scale-105"
            )}>
                {icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 pt-0.5 flex-1">
                <span className="leading-tight truncate">{children}</span>
                {aiDriven && (
                    <div className="flex items-center gap-1 mt-1">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">
                            <Sparkles className="size-2 text-indigo-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">AI Powered</span>
                        </div>
                        {active && <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="size-1.5 bg-indigo-400 rounded-full blur-[2px]" />}
                    </div>
                )}
            </div>
        </Link>
    );
}
