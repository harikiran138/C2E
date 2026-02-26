"use client";

import React, { useState } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Loader2, Settings2, Check, X, ArrowRight, Plus, Save } from 'lucide-react';
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

function ensureCoreModules(keys: string[]) {
  return Array.from(new Set([...keys, 'process-7']));
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
  // Pinned module keys - loading from DB preferences if available
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(ensureCoreModules(['process-4', 'process-3', 'process-5']));
  const [tempPinnedKeys, setTempPinnedKeys] = useState<string[]>([]);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load preferences
  React.useEffect(() => {
    if (selectedProgramId) {
      console.log('[Dashboard] Loading preferences for program:', selectedProgramId);
      fetch(`/api/institution/dashboard/preferences?programId=${selectedProgramId}`)
        .then(res => res.json())
        .then(data => {
          console.log('[Dashboard] Loaded preferences:', data);
          if (data.enabled_modules && data.enabled_modules.length > 0) {
            const nextKeys = ensureCoreModules(data.enabled_modules);
            setPinnedKeys(nextKeys);
            console.log('[Dashboard] Set pinned keys to:', nextKeys);
          } else {
            console.log('[Dashboard] No saved preferences, using defaults');
          }
        })
        .catch(err => console.error('Failed to load preferences:', err));
    }
  }, [selectedProgramId]);

  // Debug: Log when pinnedKeys changes
  React.useEffect(() => {
    console.log('[Dashboard] pinnedKeys updated:', pinnedKeys);
    console.log('[Dashboard] Number of pinned cards:', pinnedKeys.length);
  }, [pinnedKeys]);

  // Sync temp state when panel opens
  React.useEffect(() => {
    if (showCustomizePanel) {
      setTempPinnedKeys([...pinnedKeys]);
      setSaveSuccess(false);
    }
  }, [showCustomizePanel, pinnedKeys]);

  if (loading) return null;

  // Get dynamic values for BOS, PAC, Stakeholders and other program metrics
  const metricsMap: Record<string, { label: string; value: string | number; color: string; icon: keyof typeof Icons }> = {
    'process-1': {
      label: 'OBE Framworks',
      value: statsData?.obeFrameworkCount || 0,
      color: 'emerald',
      icon: 'BookOpen'
    },
    'process-3': {
      label: 'PAC Members',
      value: statsData?.pacMembers || 0,
      color: 'purple',
      icon: 'Shield'
    },
    'process-4': {
      label: 'BoS Members',
      value: statsData?.bosMembers || 0,
      color: 'blue',
      icon: 'Gavel'
    },
    'process-5': {
      label: 'Stakeholders',
      value: statsData?.stakeholdersCount || 0,
      color: 'amber',
      icon: 'UserPlus'
    },
    'process-6': {
      label: 'Finalised VMP',
      value: statsData?.stepStatus?.['process-6'] ? 'Yes' : 'No',
      color: 'emerald',
      icon: 'Target'
    },
    'process-7': {
      label: 'VMPEO Feedback',
      value: statsData?.vmpeoFeedbackEntries || 0,
      color: 'teal',
      icon: 'MessageSquare'
    },
    'process-9': {
      label: 'Generated POs',
      value: statsData?.poCount || 0,
      color: 'indigo',
      icon: 'ListChecks'
    },
    'process-10': {
      label: 'Generated PSOs',
      value: statsData?.psoCount || 0,
      color: 'pink',
      icon: 'Sparkles'
    },
    'council': {
      label: 'Council Members',
      value: statsData?.academicCouncilMembers || 0,
      color: 'teal',
      icon: 'Users'
    },
    'process-8': {
      label: 'Consistency Matrix',
      value: 'Mapped',
      color: 'cyan',
      icon: 'Grid'
    },
    'process-12': {
      label: 'Curriculum Structure',
      value: 'Drafting',
      color: 'orange',
      icon: 'Layers'
    }
  };

  const togglePin = (key: string) => {
    setTempPinnedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSavePreferences = async () => {
    if (!selectedProgramId) return;
    console.log('[Dashboard] Saving preferences:', tempPinnedKeys);
    setIsSaving(true);
    try {
      const response = await fetch('/api/institution/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: selectedProgramId,
          enabled_modules: tempPinnedKeys,
          layout_order: tempPinnedKeys // Defaulting order to current selection
        })
      });
      const result = await response.json();
      console.log('[Dashboard] Save response:', result);
      const nextKeys = ensureCoreModules(tempPinnedKeys);
      setPinnedKeys(nextKeys);
      console.log('[Dashboard] Updated pinnedKeys to:', nextKeys);
      setSaveSuccess(true);
      setTimeout(() => {
        setShowCustomizePanel(false);
      }, 800);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Pinned Modules</h2>
        <button
          onClick={() => setShowCustomizePanel(true)}
          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          <Settings2 className="size-3.5" />
          Customize Grid
        </button>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {pinnedKeys.map((key) => {
          const step = PROCESS_MENU_STEPS.find(s => s.key === key);
          if (!step) return null;

          const metric = (metricsMap as any)[key];
          const isCompleted = statsData?.stepStatus?.[key];

          return (
            <motion.div key={key} variants={item}>
              <Link href={`/institution/process/${key}?programId=${selectedProgramId}`}>
                <Card className="h-full border border-slate-200 bg-white hover:border-indigo-300 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between p-4 rounded-lg group relative overflow-hidden">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "size-8 rounded-md flex items-center justify-center transition-all duration-300",
                      metric?.color === 'blue' ? "bg-blue-50 text-blue-600" :
                        metric?.color === 'purple' ? "bg-purple-50 text-purple-600" :
                          metric?.color === 'amber' ? "bg-amber-50 text-amber-600" :
                            metric?.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                              metric?.color === 'pink' ? "bg-pink-50 text-pink-600" :
                                metric?.color === 'teal' ? "bg-teal-50 text-teal-600" :
                                  metric?.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                                    metric?.color === 'orange' ? "bg-orange-50 text-orange-600" :
                                      "bg-indigo-50 text-indigo-600"
                    )}>
                      {React.createElement((Icons as any)[step.icon || 'Circle'], { className: 'size-4' })}
                    </div>

                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                      isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                    )}>
                      {isCompleted ? 'Done' : 'Pending'}
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="font-bold text-slate-900 text-[13px] mb-0.5 group-hover:text-indigo-600 transition-colors line-clamp-1">{step.title || 'Untitled'}</h3>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-1 mb-3">
                      {step.description || 'Module details.'}
                    </p>

                    {metric ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-slate-900 tracking-tight">{metric.value}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-slate-400 italic">Data coming soon</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-300 group-hover:text-indigo-500 transition-colors">
                    <span>Details</span>
                    <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}

        {/* Add Card Placeholder */}
        <motion.div variants={item}>
          <button
            onClick={() => setShowCustomizePanel(true)}
            className="w-full h-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:bg-slate-50 hover:border-indigo-300 group shadow-sm bg-white"
          >
            <div className="size-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-200 group-hover:bg-white group-hover:text-indigo-600 transition-all duration-300 shadow-sm">
              <Plus className="size-4" />
            </div>
            <div className="text-center">
              <span className="block text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Pin More</span>
            </div>
          </button>
        </motion.div>
      </motion.div>

      {/* Customize Side Panel */}
      <AnimatePresence>
        {showCustomizePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomizePanel(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Customize Grid</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Select modules to display on home</p>
                </div>
                <button onClick={() => setShowCustomizePanel(false)} className="p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <X className="size-4 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {PROCESS_MENU_STEPS.map((step) => {
                  const isPinned = tempPinnedKeys.includes(step.key);
                  return (
                    <button
                      key={step.key}
                      onClick={() => togglePin(step.key)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                        isPinned
                          ? "bg-indigo-50/50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "size-7 rounded-lg flex items-center justify-center",
                          isPinned ? "bg-white border border-indigo-100" : "bg-slate-50"
                        )}>
                          {React.createElement((Icons as any)[step.icon || 'Circle'], { className: 'size-3.5' })}
                        </div>
                        <span className="text-[11px] font-bold text-left">{step.title}</span>
                      </div>
                      <div className={cn(
                        "size-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                        isPinned ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                      )}>
                        {isPinned && <Check className="size-2.5 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                <button
                  disabled={isSaving || saveSuccess}
                  onClick={handleSavePreferences}
                  className={cn(
                    "w-full py-3 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                    saveSuccess ? "bg-emerald-600 text-white shadow-emerald-200" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                  )}
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : saveSuccess ? <Check className="size-4" /> : <Save className="size-4" />}
                  {saveSuccess ? 'Dashboard Updated!' : 'Update Dashboard'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
