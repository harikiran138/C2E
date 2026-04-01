'use client';

import React from 'react';
import { ShieldAlert, CheckCircle2, AlertCircle, Database, Lock, Key } from 'lucide-react';

export default function SecurityPanel() {
  const securityItems = [
    { 
      label: 'Row-Level Security (RLS)', 
      status: 'Protected', 
      statusColor: 'text-emerald-500', 
      icon: Database,
      details: 'All critical tables enforced with program_id policies' 
    },
    { 
      label: 'Isolation Health', 
      status: 'Stable', 
      statusColor: 'text-blue-500', 
      icon: ShieldAlert,
      details: 'No cross-tenant leakage detected in last 24h' 
    },
    { 
      label: 'Authentication Node', 
      status: 'Active', 
      statusColor: 'text-emerald-500', 
      icon: Key, 
      details: 'Super Admin login bound to Master Auth Token' 
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {securityItems.map((item, idx) => (
        <div key={idx} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-6">
             <div className="size-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100">
                <item.icon className="size-6" />
             </div>
             <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${item.statusColor}`}>
               {item.status}
             </span>
          </div>
          <h4 className="text-sm font-black text-slate-900 mb-2">{item.label}</h4>
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">{item.details}</p>
        </div>
      ))}
    </div>
  );
}
