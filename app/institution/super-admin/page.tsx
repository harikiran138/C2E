'use client';

import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    Building2, 
    Users, 
    Plus, 
    Search, 
    ExternalLink, 
    Lock, 
    Activity,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function SuperAdminDashboard() {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchAll = async () => {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.role !== 'SUPER_ADMIN') {
                   router.push('/institution/dashboard');
                   return;
                }
                setInstitutions(data.all_institutions || []);
            } else {
                router.push('/institution/login');
            }
            setLoading(false);
        };
        fetchAll();
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/institution/login');
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Nav */}
            <nav className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-12 fixed top-0 w-full z-50">
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center">
                        <Shield className="size-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase italic">C2E CENTRAL</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Platform Governance v5.1</p>
                    </div>
                </div>

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
            </nav>

            <main className="mt-20 flex-1 p-12 max-w-7xl mx-auto w-full space-y-12">
                {/* Hero Stats */}
                <header className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm flex items-center gap-6">
                        <div className="size-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-slate-200">
                             <Building2 className="size-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-none">{institutions.length}</h2>
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mt-2">Institutions</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm flex items-center gap-6">
                        <div className="size-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-blue-100">
                             <Users className="size-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-none">--</h2>
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mt-2">Active Users</p>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-900 p-8 rounded-[40px] shadow-2xl shadow-slate-200 flex items-center gap-6 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
                        <div className="size-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white">
                             <Plus className="size-8" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-lg font-black text-slate-900 leading-tight">Provision<br/>New Entity</h2>
                        </div>
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-slate-50 -skew-x-12 translate-x-12 group-hover:translate-x-8 transition-transform" />
                    </div>
                </header>

                {/* Directory */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Institutional Directory</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filter node..."
                                className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl outline-none focus:border-slate-900 text-xs font-bold transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                        <div className="p-8">
                            <div className="grid grid-cols-1 gap-4">
                                {institutions.map((inst, idx) => (
                                    <div 
                                        key={inst.id} 
                                        className="group p-6 bg-slate-50/50 hover:bg-slate-900 hover:scale-[0.99] rounded-[24px] border border-transparent hover:border-slate-800 transition-all flex items-center justify-between cursor-pointer"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="size-14 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-100 group-hover:bg-slate-800 group-hover:border-slate-700 transition-colors">
                                                <span className="text-lg font-black text-slate-900 group-hover:text-white uppercase italic tracking-tighter">
                                                    {inst.institution_name.substring(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-md font-black text-slate-900 group-hover:text-white tracking-tight">{inst.institution_name}</h4>
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase group-hover:bg-emerald-900 group-hover:text-emerald-300">verified</span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-medium group-hover:text-slate-500 mt-1">{inst.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <Activity className="size-3" />
                                                    Health: 98%
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <Lock className="size-3" />
                                                    Compliance: 100%
                                                </div>
                                            </div>
                                            <div className="size-10 bg-white rounded-xl flex items-center justify-center border-2 border-slate-100 group-hover:bg-white group-hover:border-transparent group-hover:shadow-xl transition-all">
                                                <ExternalLink className="size-4 text-slate-400 group-hover:text-slate-900" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {institutions.length === 0 && (
                                    <div className="py-20 text-center">
                                        <Building2 className="size-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No active nodes found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
