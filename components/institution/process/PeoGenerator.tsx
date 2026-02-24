'use client';

import { useState, useEffect } from 'react';
import { useActiveProgramId } from '@/components/program/useActiveProgramId';
import { 
  Sparkles, 
  Save, 
  Calendar, 
  Check, 
  Trash2, 
  Plus,
  Info,
  Clock,
  Layers,
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from "zod";
import { peoSchema, dateRangeSchema } from "@/lib/schemas";

// --- MASTER UI DESIGN TOKENS ---
// Typography: System (Inter-like)
// Colors: Indigo (Primary), Slate (Neutral), Teal (Accent)

const PEO_PRIORITIES = [
  'Institute Vision',
  'Institute Mission',
  'National Priorities',
  'Regional Priorities',
  'Local Priorities',
  '21st Century Skills',
  'Sustainable Development Goals (SDGs)',
  'Entrepreneurship',
  'Professional Practice',
  'Higher Education and Growth',
  'Leadership and Teamwork',
  'Ethics and Society',
  'Adaptability'
];

interface DateRange {
  start: string;
  end: string;
}

interface QualityCriterion {
  key: string;
  label: string;
  passed: boolean;
  guidance?: string;
}

interface SmartAbetQuality {
  score: number;
  maxScore?: number;
  percentage?: number;
  rating?: string;
  specific: boolean;
  measurable: boolean;
  attainable: boolean;
  relevant: boolean;
  timeBound: boolean;
  abetStyle: boolean;
  missionAligned?: boolean;
  criteria?: QualityCriterion[];
  gaps?: string[];
}

interface PeoGeneratorProps {
  hideContext?: boolean;
  isEmbedded?: boolean;
}

function resolveQualityRating(percentage: number) {
  if (percentage >= 86) return 'Strong';
  if (percentage >= 71) return 'Good';
  if (percentage >= 56) return 'Developing';
  return 'Needs improvement';
}

function getOrderedCriteria(quality: SmartAbetQuality): QualityCriterion[] {
  if (Array.isArray(quality.criteria) && quality.criteria.length > 0) {
    return quality.criteria;
  }

  return [
    { key: 'specific', label: 'Specific', passed: quality.specific },
    { key: 'measurable', label: 'Measurable', passed: quality.measurable },
    { key: 'attainable', label: 'Attainable', passed: quality.attainable },
    { key: 'relevant', label: 'Relevant', passed: quality.relevant },
    { key: 'timeBound', label: 'Time-Bound', passed: quality.timeBound },
    { key: 'abetStyle', label: 'ABET Style', passed: quality.abetStyle },
    { key: 'missionAligned', label: 'Mission Aligned', passed: Boolean(quality.missionAligned) },
  ];
}

export default function PeoGenerator({ hideContext = false, isEmbedded = false }: PeoGeneratorProps) {
  const programId = useActiveProgramId();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [peos, setPeos] = useState<any[]>([]);
  
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [peoCount, setPeoCount] = useState(4);
  const [generatedPeos, setGeneratedPeos] = useState<string[]>([]);
  const [generatedPeoQuality, setGeneratedPeoQuality] = useState<SmartAbetQuality[]>([]);
  
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Process Dates
  const [brainstormingDates, setBrainstormingDates] = useState<DateRange>({ start: '', end: '' });
  const [feedbackDates, setFeedbackDates] = useState<DateRange>({ start: '', end: '' });
  const [consolidationDates, setConsolidationDates] = useState<DateRange>({ start: '', end: '' });

  // UI State
  const [activeTab, setActiveTab] = useState<'config' | 'workspace'>('workspace');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Institution Details
        const instResponse = await fetch('/api/institution/details');
        if (instResponse.ok) {
          const instData = await instResponse.json();
          setInstitution(instData.institution);
          if (programId && instData.programs) {
             const currentProgram = instData.programs.find((p: any) => p.id === programId);
             if (currentProgram) {
                setProgram(currentProgram);
                setBrainstormingDates({
                    start: currentProgram.peo_brainstorming_start_date ? currentProgram.peo_brainstorming_start_date.split('T')[0] : '',
                    end: currentProgram.peo_brainstorming_end_date ? currentProgram.peo_brainstorming_end_date.split('T')[0] : ''
                });
                setFeedbackDates({
                    start: currentProgram.peo_feedback_start_date ? currentProgram.peo_feedback_start_date.split('T')[0] : '',
                    end: currentProgram.peo_feedback_end_date ? currentProgram.peo_feedback_end_date.split('T')[0] : ''
                });
                setConsolidationDates({
                    start: currentProgram.peo_consolidation_start_date ? currentProgram.peo_consolidation_start_date.split('T')[0] : '',
                    end: currentProgram.peo_consolidation_end_date ? currentProgram.peo_consolidation_end_date.split('T')[0] : ''
                });
             }
          }
        }

        // Fetch PEOs
        if (programId) {
            const peoResponse = await fetch(`/api/institution/peos?programId=${programId}`);
            if (peoResponse.ok) {
                const peoData = await peoResponse.json();
                setPeos(peoData.data || []);
            }
        }
      } catch (error) {
        console.error('Failed to fetch details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId]);

  const togglePriority = (item: string) => {
    if (selectedPriorities.includes(item)) {
      setSelectedPriorities(selectedPriorities.filter(i => i !== item));
    } else {
      setSelectedPriorities([...selectedPriorities, item]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPriorities.length) {
        // High-end UI custom alert would be better, but native alert for MVP speed
        alert('Please select at least one priority context.');
        return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate/peos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorities: selectedPriorities,
          count: peoCount,
          institutionContext: [
            `Institute Vision: ${institution?.vision || 'Not specified'}.`,
            `Institute Mission: ${institution?.mission || 'Not specified'}.`,
            `Program Vision: ${program?.program_vision || program?.vision || 'Not specified'}.`,
            `Program Mission: ${program?.program_mission || program?.mission || 'Not specified'}.`
          ].join(' '),
          programName: program?.program_name || 'Engineering Program'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const peoResults = Array.isArray(data.results) ? data.results as string[] : [];
        const qualityResults = Array.isArray(data.quality) ? data.quality as SmartAbetQuality[] : [];
        setGeneratedPeos(peoResults);
        setGeneratedPeoQuality(qualityResults);
      } else {
        setGeneratedPeos([]);
        setGeneratedPeoQuality([]);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedPeos([]);
      setGeneratedPeoQuality([]);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddPeo = (statement: string, index: number) => {
      setPeos([...peos, { id: `temp-${Date.now()}`, peo_statement: statement, peo_number: peos.length + 1 }]);
      setGeneratedPeos((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
      setGeneratedPeoQuality((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleDeletePeo = async (id: string) => {
      if (id.startsWith('temp')) {
          setPeos(peos.filter(p => p.id !== id));
      } else {
          // Optimistic UI update could be risky without robust undo, but we'll delete on server first
          try {
              await fetch(`/api/institution/peos?id=${id}`, { method: 'DELETE' });
              setPeos(peos.filter(p => p.id !== id));
          } catch (e) { console.error(e); }
      }
  };

  const handleUpdatePeo = (id: string, newStatement: string) => {
      setPeos(peos.map(p => p.id === id ? { ...p, peo_statement: newStatement } : p));
  };

  const handleSaveAll = async () => {
    if (!programId) return;
    setSaving(true);
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Validate Dates
    const dateRanges = [
        { name: 'brainstorming', data: brainstormingDates },
        { name: 'feedback', data: feedbackDates },
        { name: 'consolidation', data: consolidationDates }
    ];

    dateRanges.forEach(({ name, data }) => {
        if (data.start || data.end) {
             if (!data.start || !data.end) {
                 isValid = false;
                 newErrors[`${name}_dates`] = "Both start and end dates are required.";
             } else {
                const result = dateRangeSchema.safeParse({ startDate: data.start, endDate: data.end });
                if (!result.success) {
                    isValid = false;
                    newErrors[`${name}_dates`] = result.error.issues[0]?.message || "Invalid date range";
                }
             }
        }
    });

    // Validate PEOs
    peos.forEach((peo) => {
        const result = peoSchema.safeParse({ statement: peo.peo_statement });
        if (!result.success) {
            isValid = false;
            newErrors[`peo_${peo.id}`] = result.error.issues[0]?.message || "Invalid PEO";
        }
    });

    if (!isValid) {
        setErrors(newErrors);
        setSaving(false);
        alert("Please fix validation errors before saving.");
        return;
    }

    try {
        // Save Dates
        await fetch('/api/institution/program/peo-dates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                peo_brainstorming_start_date: brainstormingDates.start || null,
                peo_brainstorming_end_date: brainstormingDates.end || null,
                peo_feedback_start_date: feedbackDates.start || null,
                peo_feedback_end_date: feedbackDates.end || null,
                peo_consolidation_start_date: consolidationDates.start || null,
                peo_consolidation_end_date: consolidationDates.end || null,
            })
        });

        // Save PEOs
        await fetch('/api/institution/peos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                peos: peos.map((p, i) => ({ statement: p.peo_statement, number: i + 1 }))
            })
        });

        // Refetch to ensure IDs
        const peoResponse = await fetch(`/api/institution/peos?programId=${programId}`);
        if (peoResponse.ok) {
            const peoData = await peoResponse.json();
            setPeos(peoData.data);
            alert('PEOs and Timelines saved successfully!');
        } else {
            alert('PEOs saved, but failed to refresh list.');
        }

    } catch (error) {
        console.error('Save error:', error);
    } finally {
        setSaving(false);
    }
  };

  if (!programId) return <div className="p-12 text-center text-slate-400 font-light text-lg">Please select a program of study to begin.</div>;
  if (loading) return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <div className="size-12 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Loading Context...</p>
      </div>
  );

  return (
    <div className="space-y-8 pb-32">
        {/* --- 1. QUICK ACTION SHORTCUT BAR --- */}
        {/* Placed immediately below H1 (Layout handles H1) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
                onClick={() => setPeos([...peos, { id: `temp-new-${Date.now()}`, peo_statement: '', peo_number: peos.length + 1 }])}
                className="group flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Plus className="size-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Add PEO</span>
            </button>

            <button 
                onClick={() => document.getElementById('ai-generator')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg mb-2 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Sparkles className="size-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Generate</span>
            </button>

            <button 
                onClick={() => document.getElementById('process-dates')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg mb-2 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <Calendar className="size-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Timeline</span>
            </button>

             <button 
                onClick={handleSaveAll}
                disabled={saving}
                className="group flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Save All</span>
            </button>
        </div>

        {/* --- 2. MAIN CONTENT ZONE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: STRATEGY & AI */}
            <div className="lg:col-span-5 space-y-8">
                
                {/* Institutional Context */}
                {!hideContext && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-100 rounded-lg">
                             <Layers className="size-4 text-slate-600" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Institutional Anchor</h2>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="relative pl-4 border-l-2 border-slate-100">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Vision</h3>
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                "{institution?.vision || 'Vision not defined.'}"
                            </p>
                        </div>
                        <div className="relative pl-4 border-l-2 border-slate-100">
                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mission</h3>
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                "{institution?.mission || 'Mission not defined.'}"
                            </p>
                        </div>
                    </div>
                </div>
                )}

                {/* AI Generator */}
                <div id="ai-generator" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-8 -mt-8 opacity-50" />
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                             <Sparkles className="size-4" />
                        </div>
                         <h2 className="text-base font-bold text-slate-900">AI Architect</h2>
                    </div>

                    <div className="space-y-5 relative z-10">
                        <div>
                             <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Strategic Focus Areas</label>
                             <div className="flex flex-wrap gap-2">
                                {PEO_PRIORITIES.map(item => (
                                    <button
                                        key={item}
                                        onClick={() => togglePriority(item)}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all
                                            ${selectedPriorities.includes(item)
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                            }
                                        `}
                                    >
                                        {item}
                                    </button>
                                ))}
                             </div>
                        </div>

                        <div className="flex items-end gap-3 pt-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">No. of PEOs to be generated</label>
                                <select 
                                    value={peoCount}
                                    onChange={(e) => setPeoCount(Number(e.target.value))}
                                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold px-3 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                >
                                    {Array.from({ length: 20 }, (_, idx) => idx + 1).map((n) => (
                                      <option key={n} value={n}>
                                        {n} PEO{n === 1 ? '' : 's'}
                                      </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={generating || selectedPriorities.length === 0}
                                className="flex-1 h-10 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                            >
                                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                <span>Generate Drafts</span>
                            </button>
                        </div>
                    </div>

                    {/* AI Results */}
                    <AnimatePresence>
                        {generatedPeos.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-6 pt-6 border-t border-slate-100 space-y-3"
                            >
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Suggestions</h3>
                                {generatedPeos.map((peo, i) => {
                                    const quality = generatedPeoQuality[i];
                                    const criteria = quality ? getOrderedCriteria(quality) : [];
                                    const maxScore = (quality?.maxScore ?? criteria.length) || 7;
                                    const percentage = typeof quality?.percentage === 'number'
                                      ? quality.percentage
                                      : Math.round(((quality?.score || 0) / maxScore) * 100);
                                    const rating = quality?.rating || resolveQualityRating(percentage);

                                    return (
                                        <div 
                                            key={i} 
                                            className="group p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all relative"
                                            onClick={() => handleAddPeo(peo, i)}
                                        >
                                            <div className="mb-1 flex items-start justify-between gap-2 pr-8">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Draft {i + 1}</span>
                                                {quality && (
                                                    <span className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                                        {quality.score}/{maxScore} • {rating}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700 font-medium pr-8">{peo}</p>
                                            {quality && (
                                                <div className="mt-3 rounded-lg border border-indigo-100 bg-white px-2.5 py-2 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">SMART + ABET Parameter Score</span>
                                                        <span className="text-[11px] font-extrabold text-indigo-700">{percentage}%</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {criteria.map((criterion) => (
                                                            <div
                                                                key={`${criterion.key}-${i}`}
                                                                className={`rounded-md px-2 py-1 text-[10px] font-semibold border ${
                                                                    criterion.passed
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                                                                }`}
                                                                title={criterion.guidance || criterion.label}
                                                            >
                                                                {criterion.passed ? 'OK' : 'FIX'} {criterion.label}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {Array.isArray(quality.gaps) && quality.gaps.length > 0 && (
                                                        <p className="text-[10px] font-medium text-amber-700">
                                                            Improve: {quality.gaps.join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            <div className="absolute right-2 top-2 p-1.5 bg-white text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 shadow-sm transition-opacity">
                                                <Plus className="size-3.5" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* RIGHT COLUMN: EDITOR & TIMELINE */}
            <div className="lg:col-span-7 space-y-8">
                
                {/* Timeline Card */}
                <div id="process-dates" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-shadow">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                                <Clock className="size-4" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">Process Timeline</h2>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">Optional</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {/* Date items with consistent styling */}
                       <div className="space-y-2">
                           <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                               <div className="size-1.5 rounded-full bg-slate-300" /> Brainstorming
                           </label>
                           <div className="space-y-2">
                               <input type="date" value={brainstormingDates.start} onChange={e => setBrainstormingDates({...brainstormingDates, start: e.target.value})} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-600 ${errors.brainstorming_dates ? 'border-red-500' : 'border-slate-200'}`} />
                               <input type="date" value={brainstormingDates.end} onChange={e => setBrainstormingDates({...brainstormingDates, end: e.target.value})} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-600 ${errors.brainstorming_dates ? 'border-red-500' : 'border-slate-200'}`} />
                           </div>
                           {errors.brainstorming_dates && <p className="text-red-500 text-[10px] mt-1">{errors.brainstorming_dates}</p>}
                       </div>
                       <div className="space-y-2">
                           <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                               <div className="size-1.5 rounded-full bg-slate-300" /> Feedback
                           </label>
                           <div className="space-y-2">
                               <input type="date" value={feedbackDates.start} onChange={e => setFeedbackDates({...feedbackDates, start: e.target.value})} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-600 ${errors.feedback_dates ? 'border-red-500' : 'border-slate-200'}`} />
                               <input type="date" value={feedbackDates.end} onChange={e => setFeedbackDates({...feedbackDates, end: e.target.value})} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-600 ${errors.feedback_dates ? 'border-red-500' : 'border-slate-200'}`} />
                           </div>
                           {errors.feedback_dates && <p className="text-red-500 text-[10px] mt-1">{errors.feedback_dates}</p>}
                       </div>
                       <div className="space-y-2">
                           <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                               <div className="size-1.5 rounded-full bg-slate-300" /> Consolidation
                           </label>
                           <div className="space-y-2">
                               <input type="date" value={consolidationDates.start} onChange={e => setConsolidationDates({...consolidationDates, start: e.target.value})} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-600 ${errors.consolidation_dates ? 'border-red-500' : 'border-slate-200'}`} />
                               <input type="date" value={consolidationDates.end} onChange={e => setConsolidationDates({...consolidationDates, end: e.target.value})} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-600 ${errors.consolidation_dates ? 'border-red-500' : 'border-slate-200'}`} />
                           </div>
                           {errors.consolidation_dates && <p className="text-red-500 text-[10px] mt-1">{errors.consolidation_dates}</p>}
                       </div>
                    </div>
                </div>

                {/* Defined PEOs List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-1">Defined PEOs</h3>
                         <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{peos.length} Items</span>
                    </div>

                    <div className="grid gap-4">
                        {peos.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                <p className="text-slate-400 text-sm">No PEOs defined yet. Use the generator or add one manually.</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {peos.map((peo, index) => (
                                    <motion.div 
                                        key={peo.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="size-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm">
                                                    PEO{index + 1}
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 space-y-3">
                                                <textarea 
                                                    value={peo.peo_statement}
                                                    onChange={(e) => handleUpdatePeo(peo.id, e.target.value)}
                                                    className={`w-full min-h-[80px] text-base text-slate-800 font-medium bg-transparent p-2 focus:ring-0 resize-none placeholder:text-slate-300 ${errors[`peo_${peo.id}`] ? 'border border-red-500 rounded bg-red-50/10' : 'border-none'}`}
                                                    placeholder="Enter PEO statement..."
                                                />
                                                {errors[`peo_${peo.id}`] && <p className="text-red-500 text-xs mt-1">{errors[`peo_${peo.id}`]}</p>}
                                            </div>

                                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDeletePeo(peo.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete PEO"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                                <div className="p-2 cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400">
                                                    <MoreHorizontal className="size-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
