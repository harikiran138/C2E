'use client';

import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    LogOut,
    Plus,
    Activity,
    ShieldCheck,
    Database,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import OverviewCards from '@/components/super-admin/OverviewCards';
import InstitutionTable from '@/components/super-admin/InstitutionTable';
import SecurityPanel from '@/components/super-admin/SecurityPanel';
import ActivityLogs from '@/components/super-admin/ActivityLogs';
import CreateInstitutionModal from '@/components/super-admin/CreateInstitutionModal';

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
                // 1. Verify Auth
                const authRes = await fetch('/api/auth/me');
                if (!authRes.ok) {
                    router.push('/institution/login');
                    return;
                }
                const userData = await authRes.json();
                if (userData.role !== 'SUPER_ADMIN') {
                    router.push('/institution/dashboard');
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
            // 1. Server-side logout (revokes session)
            await fetch('/api/auth/logout', { method: 'POST' }); 
            
            // 2. Client-side cleanup (Point #3 & #4)
            document.cookie = 'c2e_auth_token=; Max-Age=0; path=/;';
            localStorage.clear();
            sessionStorage.clear();
            
            // 3. Security-focused redirect (Point #10)
            router.replace('/institution/login');
        } catch (err) {
            console.error('Logout failed:', err);
            // Fallback: forcefully redirect even if API fails
            router.replace('/institution/login');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Initializing Control Tower...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Top Navigation */}
            <nav className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-12 fixed top-0 w-full z-50">
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center">
                        <Shield className="size-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase italic">C2E CENTRAL</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Platform Governance v1.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden md:flex items-center gap-1">
                      {['overview', 'nodes', 'security', 'audit'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                            activeTab === tab 
                              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="h-8 w-px bg-slate-100" />

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Master Node: Active</span>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="p-3 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all text-slate-400"
                        >
                            <LogOut className="size-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="mt-28 flex-1 p-12 max-w-7xl mx-auto w-full space-y-12">
                {/* Header Section */}
                <header className="flex items-end justify-between">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {activeTab === 'overview' && "System Overview"}
                      {activeTab === 'nodes' && "Institutional Nodes"}
                      {activeTab === 'security' && "Security Protocols"}
                      {activeTab === 'audit' && "Global Audit Trail"}
                    </h2>
                    <p className="text-sm font-medium text-slate-400">
                      Welcome back, Chief Architect. Monitoring platform stability and compliance.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="group bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-3xl flex items-center gap-3 transition-all shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95"
                  >
                    <div className="size-6 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20">
                      <Plus className="size-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Provision New Entity</span>
                  </button>
                </header>

                {/* Dashboard Views */}
                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {activeTab === 'overview' && (
                    <>
                      <OverviewCards metrics={metrics} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <section className="space-y-8">
                          <header className="flex items-center gap-3 px-4">
                            <ShieldCheck className="size-5 text-slate-900" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Node Snapshot</h3>
                          </header>
                          <InstitutionTable institutions={institutions.slice(0, 3)} />
                        </section>
                        <section className="space-y-8">
                          <header className="flex items-center gap-3 px-4">
                            <Activity className="size-5 text-slate-900" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Pulse Events</h3>
                          </header>
                          <ActivityLogs />
                        </section>
                      </div>
                    </>
                  )}

                  {activeTab === 'nodes' && (
                    <InstitutionTable institutions={institutions} />
                  )}

                  {activeTab === 'security' && (
                    <div className="bg-white border border-slate-100 rounded-[48px] p-12 shadow-sm">
                      <SecurityPanel />
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="bg-white border border-slate-100 rounded-[48px] p-12 shadow-sm">
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
            <footer className="h-12 bg-white border-t border-slate-100 flex items-center justify-between px-12 fixed bottom-0 w-full z-50">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Database className="size-3 text-slate-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">DB Status: Synchronized</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3 text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Compliance Buffer: 100%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="size-3 text-blue-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">System Uptime: 99.98%</span>
              </div>
            </footer>
        </div>
    );
}
