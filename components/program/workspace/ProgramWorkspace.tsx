'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, LayoutDashboard, BookOpen, Shield, Gavel, Users, Grid2X2, FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ProgramWorkspaceProps {
    programId: string;
    programName: string;
    programCode: string;
    children: React.ReactNode;
    headerContent?: React.ReactNode;
}

const PROGRAM_NAV_ITEMS = [
    { key: 'dashboard', label: 'Program Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { key: 'tutor', label: 'Tutor Definitions', icon: <BookOpen className="size-4" /> },
    { key: 'committee', label: 'Committee', icon: <Shield className="size-4" /> },
    { key: 'bos', label: 'BoS', icon: <Gavel className="size-4" /> },
    { key: 'stakeholders', label: 'Stakeholders', icon: <Users className="size-4" /> },
    { key: 'obe', label: 'OBE Mapping', icon: <Grid2X2 className="size-4" /> },
    { key: 'reports', label: 'Reports', icon: <FileText className="size-4" /> },
];

const SECTION_META: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Program Dashboard', subtitle: 'Track progress and execute program-level workflows.' },
    tutor: { title: 'Tutor Definitions', subtitle: 'Define OBE protocols and reference framework resources.' },
    committee: { title: 'Committee', subtitle: 'Manage Program Advisory Committee composition and records.' },
    bos: { title: 'Board of Studies', subtitle: 'Maintain BoS constitution and member details.' },
    stakeholders: { title: 'Stakeholders', subtitle: 'Add and maintain representative stakeholder records.' },
    obe: { title: 'OBE Mapping', subtitle: 'Configure Vision, Mission, PEO, PO, and consistency mappings.' },
    reports: { title: 'Reports', subtitle: 'Generate program-level review and compliance reports.' },
};

export default function ProgramWorkspace({
    programId,
    programName,
    programCode,
    children,
    headerContent,
}: ProgramWorkspaceProps) {
    const pathname = usePathname();

    const segments = pathname.split('/');
    const activeSectionKey = segments.length > 3 ? segments[3] : 'dashboard';
    const sectionMeta = SECTION_META[activeSectionKey] || {
        title: 'Program Module',
        subtitle: 'Manage program execution tasks.',
    };
    const title = sectionMeta.title;
    const subtitle = sectionMeta.subtitle;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const desktopSidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedScrollPos = sessionStorage.getItem('programSidebarScrollPos');
        if (desktopSidebarRef.current && savedScrollPos) {
            setTimeout(() => {
                if (desktopSidebarRef.current) {
                    desktopSidebarRef.current.scrollTop = parseInt(savedScrollPos, 10);
                }
            }, 0);
        }
    }, []);

    const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
        sessionStorage.setItem('programSidebarScrollPos', e.currentTarget.scrollTop.toString());
    };

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/program-logout', { method: 'POST' });
            window.location.href = '/program-login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/program-login';
        }
    };

    const buildHref = (sectionKey: string) => {
        return `/program/${programId}/${sectionKey}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
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
                                        <div className="size-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black italic text-sm shadow-purple-200 shadow-lg">P</div>
                                        <span className="font-bold text-slate-900">Program Portal</span>
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600">
                                        <X className="size-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 overscroll-y-contain scroll-smooth scrollbar-hide pb-20">
                                    <SidebarContent activeSectionKey={activeSectionKey} buildHref={buildHref} onClose={() => setIsSidebarOpen(false)} />
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
                                    <h1 className="text-xs font-bold text-slate-900 truncate leading-tight" title={programName}>{programName}</h1>
                                    <p className="text-[10px] text-slate-500 font-medium tracking-wide">{(programCode || '').toUpperCase()}</p>
                                </div>
                            </div>
                        </div>

                        <div
                            ref={desktopSidebarRef}
                            onScroll={handleSidebarScroll}
                            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-2 pb-24 space-y-2 custom-scrollbar"
                        >
                            <SidebarContent activeSectionKey={activeSectionKey} buildHref={buildHref} />
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col min-w-0 lg:pl-[280px] transition-all duration-300">
                    <header className={cn("sticky top-0 z-20 px-6 py-3 transition-all duration-200", isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm' : 'bg-transparent')}>
                        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900"
                            >
                                <Menu className="size-6" />
                            </button>

                            <div className="flex items-center gap-3 ml-auto">
                                <div className="flex items-center gap-3 pl-1">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-slate-900 leading-none">Coordinator</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Program Admin</p>
                                    </div>
                                    <Avatar className="size-9 bg-white border border-slate-200 shadow-sm">
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-700 text-white font-bold text-xs">
                                            CO
                                        </AvatarFallback>
                                    </Avatar>
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

                    <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
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

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSectionKey || 'dashboard'}
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

function SidebarContent({ activeSectionKey, buildHref, onClose }: any) {
    return (
        <div className="flex flex-col gap-6 py-4">
            <div className="rounded-[32px] p-4 border backdrop-blur-md space-y-1.5 shadow-sm transition-all duration-500 bg-purple-400/[0.06] border-purple-200/40 text-purple-900">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] px-4 mb-4 text-purple-500">Program Execution</p>
                <div className="space-y-1">
                    {PROGRAM_NAV_ITEMS.map((item) => (
                        <SidebarNavItem
                            key={item.key}
                            href={buildHref(item.key)}
                            active={activeSectionKey === item.key}
                            onClick={onClose}
                            icon={item.icon}
                        >
                            {item.label}
                        </SidebarNavItem>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SidebarNavItem({ href, active, children, onClick, icon, className }: any) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "group flex items-start gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative text-xs font-semibold",
                active
                    ? "bg-white shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100 ring-1 ring-slate-900/5"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-900 hover:shadow-md",
                className
            )}
        >
            {active && (
                <motion.div
                    layoutId="program-sidebar-active-pill"
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
            </div>
        </Link>
    );
}
