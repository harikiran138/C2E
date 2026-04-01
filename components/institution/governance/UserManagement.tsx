'use client';

import React, { useState, useEffect } from 'react';
import { useInstitution } from '@/context/InstitutionContext';
import { 
    UserPlus, 
    Shield, 
    Mail, 
    Lock, 
    Layout, 
    ChevronRight, 
    MoreHorizontal,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserManagement() {
    const { programs } = useInstitution();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/auth/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/auth/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    program_id: selectedProgramId
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Program Admin created successfully' });
                setEmail('');
                setPassword('');
                setSelectedProgramId('');
                fetchUsers();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to create user' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Delegations</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage Program Admins and Access Control</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                    <Shield className="size-3.5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">RBAC Enabled</span>
                </div>
            </div>

            {/* Create Section */}
            <section className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <UserPlus className="size-3.5" />
                        Create Program Admin
                    </h3>
                </div>
                <form onSubmit={handleCreateUser} className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase ml-1">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@program.edu"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl outline-none transition-all text-sm font-semibold"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase ml-1">Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl outline-none transition-all text-sm font-semibold"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase ml-1">Assigned Program</label>
                            <div className="relative">
                                <Layout className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                                <select 
                                    value={selectedProgramId}
                                    onChange={(e) => setSelectedProgramId(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl outline-none transition-all text-sm font-semibold appearance-none"
                                    required
                                >
                                    <option value="">Select Program...</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.program_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={submitting}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 px-6 font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-xl shadow-slate-200"
                        >
                            {submitting ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <>
                                    Provision Account
                                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    {message && (
                        <div className={cn(
                            "mt-6 p-4 rounded-2xl flex items-center gap-3 transition-all",
                            message.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-rose-50 text-rose-800 border border-rose-100"
                        )}>
                            {message.type === 'success' ? <CheckCircle2 className="size-4" /> : <div className="size-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-black">!</div>}
                            <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
                        </div>
                    )}
                </form>
            </section>

            {/* Users List */}
            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Authorized Program Admins</h3>
                    <span className="text-xs font-bold text-slate-400">Total: {users.length}</span>
                </div>
                
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="size-8 animate-spin mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Scanning Directory...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="size-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Shield className="size-6 text-slate-200" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">No Delegations Found</h4>
                        <p className="text-xs text-slate-500">Create a Program Admin account to delegate local governance.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {users.map((user) => (
                            <div key={user.id} className="group p-6 hover:bg-slate-50 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="size-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        <span className="text-sm font-black uppercase">{user.email.substring(0, 2)}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-slate-900">{user.email}</span>
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                {user.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Layout className="size-3" />
                                                {user.program_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="size-5 text-slate-400 hover:text-slate-900" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
