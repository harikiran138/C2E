'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Sparkles, 
  Save, 
  Check, 
  Trash2, 
  Plus,
  Clock,
  Layers,
  Loader2,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  'Sustainable Development Goals',
  'Entrepreneurship',
  'Professional Practice',
  'Higher Education',
  'Leadership',
  'Ethics & Society',
  'Adaptability'
];

interface DateRange {
  start: string;
  end: string;
}

export default function PeoGenerator() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [peos, setPeos] = useState<any[]>([]);
  
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [customPriorities, setCustomPriorities] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState('');
  const [peoCount, setPeoCount] = useState(4);
  const [generatedPeos, setGeneratedPeos] = useState<string[]>([]);
  
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const addCustomPriority = () => {
    const trimmedPriority = newPriority.trim();
    if (trimmedPriority && !customPriorities.includes(trimmedPriority)) {
      setCustomPriorities([...customPriorities, trimmedPriority]);
      setNewPriority('');
    }
  };

  const allPriorities = [...PEO_PRIORITIES, ...customPriorities];

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
          institutionContext: `Vision: ${institution?.vision}. Mission: ${institution?.mission}`,
          programName: program?.program_name || 'Engineering Program'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPeos(data.results);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddPeo = (statement: string) => {
      setPeos([...peos, { id: `temp-${Date.now()}`, peo_statement: statement, peo_number: peos.length + 1 }]);
      setGeneratedPeos(generatedPeos.filter(p => p !== statement)); // Remove from suggestions
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

        {/* MAIN CONTENT */}
        <div className="space-y-8">
            
            {/* AI Generator Section */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Sparkles className="size-4" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">Formulate PEOs</h2>
                </div>

                <div className="space-y-6">
                    {/* Strategic Focus Areas - Matrix Layout */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Strategic Focus Areas</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {allPriorities.map(item => (
                                <button
                                    key={item}
                                    onClick={() => togglePriority(item)}
                                    className={`h-[52px] px-3 rounded-xl text-xs font-semibold border-2 transition-all flex items-center gap-2 ${
                                        selectedPriorities.includes(item)
                                        ? 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-indigo-400 shadow-[0_0_0_2px_rgba(99,102,241,0.4)]'
                                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm text-slate-600'
                                    }`}
                                >
                                    <div className={`shrink-0 size-4 rounded border-2 flex items-center justify-center ${
                                        selectedPriorities.includes(item)
                                        ? 'bg-indigo-500 border-indigo-500'
                                        : 'border-slate-300'
                                    }`}>
                                        {selectedPriorities.includes(item) && <Check className="size-3 text-white" strokeWidth={3} />}
                                    </div>
                                    <span className="line-clamp-2">{item}</span>
                                </button>
                            ))}
                            
                            {/* Add Custom Priority */}
                            <div className="h-[52px] flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addCustomPriority()}
                                    placeholder="Add custom..."
                                    className="flex-1 h-full px-3 text-xs border-2 border-dashed border-slate-300 rounded-xl focus:border-indigo-400 focus:outline-none"
                                />
                                <button
                                    onClick={addCustomPriority}
                                    disabled={!newPriority.trim()}
                                    className="h-full aspect-square rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold transition-all"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || selectedPriorities.length === 0}
                        className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Generate {peoCount} Draft PEOs
                    </button>
                    {/* AI Results */}
                    {generatedPeos.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {generatedPeos.map((peo, i) => (
                                <div 
                                    key={i} 
                                    className="group p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all relative"
                                    onClick={() => handleAddPeo(peo)}
                                >
                                    <p className="text-sm text-slate-700 font-medium pr-8">{peo}</p>
                                    <div className="absolute right-2 top-2 p-1.5 bg-white text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 shadow-sm transition-opacity">
                                        <Plus className="size-3.5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Defined PEOs List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-900">Defined PEOs</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded-full text-slate-600">{peos.length} Items</span>
                        <button 
                            onClick={() => setPeos([...peos, { id: `temp-new-${Date.now()}`, peo_statement: '', peo_number: peos.length + 1 }])}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold"
                        >
                            <Plus className="size-3.5" />
                            Add PEO
                        </button>
                    </div>
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
                                    className="group bg-slate-50 p-6 rounded-xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all"
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
                                                className="w-full min-h-[80px] text-sm text-slate-800 font-medium bg-white border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none placeholder:text-slate-300"
                                                placeholder="Enter PEO statement..."
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleDeletePeo(peo.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete PEO"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Save All Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save All PEOs
                </button>
            </div>
        </div>
    </div>
  );
}
