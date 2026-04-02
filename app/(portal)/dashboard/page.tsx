'use client';

import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    LogOut,
    Plus,
    Activity,
    ShieldCheck,
    Database,
    Zap,
    LayoutDashboard,
    Globe,
    Lock,
    Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { buildMutationHeaders } from '@/lib/client-security';
import OverviewCards from '@/components/super-admin/OverviewCards';
import InstitutionTable from '@/components/super-admin/InstitutionTable';
import dynamic from "next/dynamic";

const SecurityPanel = dynamic(() => import("@/components/super-admin/SecurityPanel"), {
  loading: () => <div className="p-12 text-center text-slate-500 animate-pulse">Initializing Isolation Protocols...</div>
});
const ActivityLogs = dynamic(() => import("@/components/super-admin/ActivityLogs"), {
  loading: () => <div className="p-12 text-center text-slate-500 animate-pulse">Synchronizing Pulse Stream...</div>
});
const CreateInstitutionModal = dynamic(() => import("@/components/super-admin/CreateInstitutionModal"), {
  loading: () => null
});
import { getRoleDashboardPath } from '@/lib/auth-routing';

export default function SuperAdminDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Verify Auth & Role
                const authRes = await fetch('/api/auth/me');
                if (!authRes.ok) {
                    router.push('/login');
                    return;
                }
                const userData = await authRes.json();
                if (userData.role !== 'SUPER_ADMIN') {
                    // Redirect non-super-admins to their correct dashboard
                    router.push(
                      getRoleDashboardPath(
                        userData.role,
                        userData.programs?.[0]?.id || userData.user?.id,
                      ),
                    );
                    return;
                }

                // 2. Fetch Dashboard Data
                const [metricsRes, instRes] = await Promise.all([
                    fetch('/api/super-admin/metrics'),
                    fetch('/api/super-admin/institutions')
                ]);

                if (metricsRes.ok) setMetrics(await metricsRes.json());
                if (instRes.ok) setInstitutions(await instRes.json());

            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleLogout = async () => {
        try {
            // 1. Unified Logout API (Clears all HTTP-only cookies)
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: buildMutationHeaders(),
            }); 
            
            // 2. Client-side storage cleanup
            localStorage.clear();
            sessionStorage.clear();
            
            // 3. Redirect to login
            router.replace('/login');
        } catch (err) {
            console.error('Logout failed:', err);
            router.replace('/login');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="size-16 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                      <Shield className="size-6 text-slate-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Secure Environment</p>
                      <p className="text-sm font-bold text-slate-600 mt-1">Initializing Master Node Control Tower...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Top Navigation */}
            <nav className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-12 fixed top-0 w-full z-50">
                <div className="flex items-center gap-5">
                    <div className="size-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <Shield className="size-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase italic">C2E CENTRAL</h1>
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black uppercase tracking-tighter text-slate-500">v1.1</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Platform Governance Interface</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden lg:flex items-center p-1.5 bg-slate-100/50 rounded-2xl border border-slate-100/50">
                      {[
                        { id: 'overview', icon: LayoutDashboard },
                        { id: 'nodes', icon: Globe },
                        { id: 'security', icon: Lock },
                        { id: 'audit', icon: Clock }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`flex items-center gap-2.5 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-xl ${
                            activeTab === item.id 
                              ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-y-[-1px]' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                          }`}
                        >
                          <item.icon className={`size-3.5 ${activeTab === item.id ? 'animate-pulse' : ''}`} />
                          {item.id}
                        </button>
                      ))}
                    </div>

                    <div className="h-8 w-px bg-slate-100" />

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.1em]">Core Node Online</span>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="size-11 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all text-slate-400 group relative"
                            title="Logout"
                        >
                            <LogOut className="size-5 group-hover:scale-110 transition-transform" />
                            <span className="absolute -bottom-1 w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="mt-28 flex-1 p-12 max-w-7xl mx-auto w-full space-y-12">
                {/* Header Section */}
                <header className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-8 bg-slate-900 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Current Vector</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
                      {activeTab === 'overview' && "System Cluster State"}
                      {activeTab === 'nodes' && "Node Registry"}
                      {activeTab === 'security' && "Isolation Protocols"}
                      {activeTab === 'audit' && "Omni Audit Trail"}
                    </h2>
                  </div>
                  
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="group bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-[24px] flex items-center gap-3 transition-all shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 border-b-4 border-slate-700 active:border-b-0 active:translate-y-[4px]"
                  >
                    <Plus className="size-5 group-hover:rotate-90 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Provision Entity</span>
                  </button>
                </header>

                {/* Dashboard Views */}
                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                  {activeTab === 'overview' && (
                    <>
                      <OverviewCards metrics={metrics} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <section className="space-y-8">
                          <header className="flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="size-5 text-slate-900" />
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Node Activation</h3>
                            </div>
                            <button onClick={() => setActiveTab('nodes')} className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:underline">View All Registry</button>
                          </header>
                          <InstitutionTable institutions={institutions.slice(0, 3)} />
                        </section>
                        <section className="space-y-8">
                          <header className="flex items-center gap-3 px-4">
                            <Activity className="size-5 text-slate-900" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Global Pulse Stream</h3>
                          </header>
                          <ActivityLogs />
                        </section>
                      </div>
                    </>
                  )}

                  {activeTab === 'nodes' && (
                    <div className="animate-in fade-in duration-500">
                      <InstitutionTable institutions={institutions} />
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="bg-white border border-slate-100 rounded-[48px] p-12 shadow-sm animate-in zoom-in-95 duration-500">
                      <SecurityPanel />
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="bg-white border border-slate-100 rounded-[48px] p-12 shadow-sm animate-in zoom-in-95 duration-500">
                      <ActivityLogs />
                    </div>
                  )}
                </div>
            </main>

            {/* Modals */}
            <CreateInstitutionModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              onCreated={() => window.location.reload()}
            />

            {/* Bottom Status Bar */}
            <footer className="h-14 bg-slate-900 flex items-center justify-between px-12 fixed bottom-0 w-full z-50 border-t border-slate-800">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 group cursor-help">
                  <Database className="size-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">PostgreSQL Status: <span className="text-emerald-400">Synchronized</span></span>
                </div>
                <div className="flex items-center gap-3 group cursor-help">
                  <ShieldCheck className="size-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Compliance Buffer: <span className="text-white font-black">100% SECURE</span></span>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <Zap className="size-3.5 text-amber-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">System Uptime: 99.998%</span>
                </div>
                <div className="px-3 py-1 bg-slate-800 rounded-lg">
                  <span className="text-[8px] font-black text-slate-500 tabular-nums">NODE_CLUSTER://0X4F9E...B21</span>
                </div>
              </div>
            </footer>
        </div>
    );
}
