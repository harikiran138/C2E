'use client';

import React from 'react';
import { Building2, Search, ExternalLink, Activity, Lock, Users, GraduationCap, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface Institution {
  id: string;
  institution_name: string;
  email: string;
  status: string;
  created_at: string;
  programs_count: number;
  users_count: number;
}

export default function InstitutionTable({ institutions }: { institutions: Institution[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Institutional Directory</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter node..."
            className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl outline-none focus:border-slate-900 text-xs font-bold transition-all shadow-sm focus:shadow-md"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8">
          <div className="grid grid-cols-1 gap-4">
            {institutions.map((inst, idx) => (
              <div 
                key={inst.id} 
                className="group p-6 bg-slate-50/50 hover:bg-slate-900 hover:scale-[0.99] rounded-[32px] border border-transparent hover:border-slate-800 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="size-16 bg-white rounded-[24px] flex items-center justify-center border-2 border-slate-100 group-hover:bg-slate-800 group-hover:border-slate-700 transition-colors shadow-sm">
                    <span className="text-xl font-black text-slate-900 group-hover:text-white uppercase italic tracking-tighter">
                      {inst.institution_name.substring(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-white tracking-tight">{inst.institution_name}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                        inst.status === 'ACTIVE' 
                          ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-900/50 group-hover:text-emerald-300' 
                          : 'bg-rose-100 text-rose-700 group-hover:bg-rose-900/50'
                      }`}>
                        {inst.status === 'ACTIVE' ? 'verified' : 'disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium group-hover:text-slate-500 mt-1">{inst.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  {/* Stats Labels */}
                  <div className="hidden lg:flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-900 group-hover:text-white leading-none">{inst.programs_count}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Programs</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-900 group-hover:text-white leading-none">{inst.users_count}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Users</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Activity className="size-3" /> Health: 98%
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Lock className="size-3" /> Compliance: 100%
                      </div>
                    </div>
                    
                    <button className="size-10 bg-white rounded-xl flex items-center justify-center border-2 border-slate-100 group-hover:bg-white group-hover:border-transparent group-hover:shadow-xl transition-all hover:scale-110 active:scale-95">
                      <ExternalLink className="size-4 text-slate-400 group-hover:text-slate-900" />
                    </button>
                    
                    <button className="size-10 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-transparent group-hover:bg-slate-800 group-hover:text-white transition-all opacity-0 group-hover:opacity-100">
                      <Edit2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {institutions.length === 0 && (
              <div className="py-24 text-center">
                <Building2 className="size-16 text-slate-100 mx-auto mb-6" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No active nodes discovered</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
