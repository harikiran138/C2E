'use client';

import React from 'react';
import { Building2, GraduationCap, Users, Brain, AlertTriangle } from 'lucide-react';

interface Metrics {
  institutions: number;
  programs: number;
  users: number;
  ai_generations: number;
}

export default function OverviewCards({ metrics }: { metrics: Metrics | null }) {
  const cards = [
    { 
      label: 'Total Institutions', 
      value: metrics?.institutions ?? '--', 
      icon: Building2, 
      color: 'bg-slate-900',
      shadow: 'shadow-slate-200'
    },
    { 
      label: 'Total Programs', 
      value: metrics?.programs ?? '--', 
      icon: GraduationCap, 
      color: 'bg-blue-600',
      shadow: 'shadow-blue-100'
    },
    { 
      label: 'Total Users', 
      value: metrics?.users ?? '--', 
      icon: Users, 
      color: 'bg-emerald-600',
      shadow: 'shadow-emerald-100'
    },
    { 
      label: 'AI Generations', 
      value: metrics?.ai_generations ?? '--', 
      icon: Brain, 
      color: 'bg-purple-600',
      shadow: 'shadow-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex items-center gap-5 hover:scale-[1.02] transition-transform cursor-default">
          <div className={`size-14 ${card.color} rounded-2xl flex items-center justify-center text-white shadow-xl ${card.shadow}`}>
            <card.icon className="size-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-none">{card.value}</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
