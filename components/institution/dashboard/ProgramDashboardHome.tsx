"use client";

import React, { useState } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PROCESS_MENU_STEPS } from '@/lib/institution/process';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

interface ProgramDashboardHomeProps {
  statsData: any;
  loading: boolean;
  programName?: string;
  selectedProgramId?: string;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

export default function ProgramDashboardHome({ statsData, loading, selectedProgramId }: ProgramDashboardHomeProps) {
  // Pinned module keys - defaulting to BOS, PAC, and Stakeholders
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(['process-4', 'process-3', 'process-5']);
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (loading) return null;

  // Get dynamic values for BOS, PAC, Stakeholders
  const metricsMap: Record<string, { label: string; value: string | number; color: string; icon: keyof typeof Icons }> = {
    'process-4': { 
      label: 'Members', 
      value: statsData?.bosMembers || 0,
      color: 'blue',
      icon: 'Gavel'
    },
    'process-3': { 
      label: 'Members', 
      value: statsData?.pacMembers || 0,
      color: 'purple',
      icon: 'Shield'
    },
    'process-5': { 
      label: 'Stakeholders', 
      value: statsData?.stakeholdersCount || 0,
      color: 'amber',
      icon: 'UserPlus'
    },
    'process-2': {
      label: 'Assigned',
      value: statsData?.stepStatus?.['process-2'] ? 'Yes' : 'No',
      color: 'indigo',
      icon: 'UserCog'
    },
    'process-6': {
      label: 'Finalised',
      value: statsData?.stepStatus?.['process-5'] ? 'Yes' : 'No',
      color: 'emerald',
      icon: 'Target'
    }
  };

  const togglePin = (key: string) => {
    setPinnedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
           <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Pinned Modules</h2>
           <button 
             onClick={() => setShowAddMenu(!showAddMenu)}
             className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full"
           >
             <Icons.Plus className="size-3" />
             Customize Grid
           </button>
      </div>

      <AnimatePresence>
        {showAddMenu && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-slate-50/50 rounded-[32px] p-8 border border-slate-200/40 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Customize Dashboard</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Select modules to pin on your program overview grid</p>
                    </div>
                    <button onClick={() => setShowAddMenu(false)} className="size-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-all">
                        <Icons.X className="size-4" />
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {PROCESS_MENU_STEPS.map((step) => (
                        <button
                          key={step.key}
                          onClick={() => togglePin(step.key)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border text-[11px] font-bold transition-all duration-300",
                            pinnedKeys.includes(step.key)
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                              : "bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30"
                          )}
                        >
                          <div className={cn(
                            "size-6 rounded-lg flex items-center justify-center",
                            pinnedKeys.includes(step.key) ? "bg-white/20" : "bg-slate-50"
                          )}>
                             {React.createElement((Icons as any)[step.icon || 'Circle'], { size: 14 })}
                          </div>
                          <span className="truncate flex-1 text-left">{step.title}</span>
                          {pinnedKeys.includes(step.key) && <Icons.Check className="size-3" />}
                        </button>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {pinnedKeys.map((key) => {
          const step = PROCESS_MENU_STEPS.find(s => s.key === key);
          if (!step) return null;
          
          const metric = metricsMap[key];
          const isCompleted = statsData?.stepStatus?.[key];
          
          return (
            <motion.div key={key} variants={item}>
              <Link href={`/institution/dashboard?programId=${selectedProgramId}&step=${key}`}>
                <Card className="h-full border-border/40 bg-white/60 hover:bg-white transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/40 hover:-translate-y-1 flex flex-col justify-between p-7 rounded-[32px] group relative overflow-hidden isolate">
                    <div className="flex items-start justify-between mb-5">
                        <div className={cn(
                            "size-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                            metric?.color === 'blue' ? "bg-blue-50 text-blue-600" :
                            metric?.color === 'purple' ? "bg-purple-50 text-purple-600" :
                            metric?.color === 'amber' ? "bg-amber-50 text-amber-600" :
                            "bg-indigo-50 text-indigo-600",
                            "group-hover:scale-110 group-hover:rotate-3"
                        )}>
                            {React.createElement((Icons as any)[step.icon || 'Circle'], { className: 'size-6' })}
                        </div>
                        
                        <div className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em]",
                            isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                        )}>
                            {isCompleted ? 'Completed' : 'Pending'}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <h3 className="font-black text-slate-800 text-sm mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-1">{step.title}</h3>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2 mb-5">
                            {step.description || 'Module details and progress tracking.'}
                        </p>
                        
                        {metric && (
                           <div className="flex items-baseline gap-2.5">
                               <span className="text-3xl font-black text-slate-900 tracking-tight">{metric.value}</span>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</span>
                           </div>
                        )}
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-indigo-500 transition-colors">
                        <span>Open Section</span>
                        <Icons.ArrowRight className="size-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>

                    {/* Background Decorative Elements */}
                    <div className="absolute -bottom-10 -right-10 size-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50 transition-colors duration-500 -z-10" />
                </Card>
              </Link>
            </motion.div>
          );
        })}

        {/* Add Card Placeholder */}
        <motion.div variants={item}>
            <button 
              onClick={() => setShowAddMenu(true)}
              className="w-full h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all duration-500 hover:bg-indigo-50/50 hover:border-indigo-300 group shadow-sm hover:shadow-xl hover:shadow-indigo-50"
            >
                <div className="size-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:text-indigo-600 group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 shadow-sm">
                    <Icons.Plus className="size-6" />
                </div>
                <div className="text-center">
                    <span className="block text-[11px] font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Pin More</span>
                    <span className="block text-[9px] text-slate-300 group-hover:text-indigo-400 ont-medium mt-1">Customize Grid</span>
                </div>
            </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
