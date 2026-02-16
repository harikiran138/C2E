'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles, Save, Calendar, Check, Play, RefreshCw, Trash2 } from 'lucide-react';

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

export default function PeoGenerator() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [peos, setPeos] = useState<any[]>([]);
  
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [peoCount, setPeoCount] = useState(4);
  const [generatedPeos, setGeneratedPeos] = useState<string[]>([]);
  
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Process Dates
  const [brainstormingDates, setBrainstormingDates] = useState({ start: '', end: '' });
  const [feedbackDates, setFeedbackDates] = useState({ start: '', end: '' });
  const [consolidationDates, setConsolidationDates] = useState({ start: '', end: '' });

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
                setPeos(peoData.data);
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
        alert('Please select at least one priority.');
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
      } else {
        alert('Generation failed.');
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddPeo = (statement: string) => {
      setPeos([...peos, { id: `temp-${Date.now()}`, peo_statement: statement, peo_number: peos.length + 1 }]);
  };

  const handleDeletePeo = async (id: string) => {
      if (id.startsWith('temp')) {
          setPeos(peos.filter(p => p.id !== id));
      } else {
          try {
              await fetch(`/api/institution/peos?id=${id}`, { method: 'DELETE' });
              setPeos(peos.filter(p => p.id !== id));
          } catch (e) { console.error(e); }
      }
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

        // Save PEOs (Only new tech - simple sync for now, deleting old and re-inserting is easiest for MVP 
        // but better to upsert. Here we'll just save the list via bulk API if we make one, 
        // or loop calls. Let's use a bulk save endpoint to be efficient).
        
        await fetch('/api/institution/peos', {
            method: 'POST', // Implies bulk save/sync
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                peos: peos.map((p, i) => ({ statement: p.peo_statement, number: i + 1 }))
            })
        });

        alert('PEOs and Process Dates saved successfully!');
        
        // Refresh to get real IDs
        const peoResponse = await fetch(`/api/institution/peos?programId=${programId}`);
        if (peoResponse.ok) {
            const peoData = await peoResponse.json();
            setPeos(peoData.data);
        }

    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save.');
    } finally {
        setSaving(false);
    }
  };

  if (!programId) {
     return <div className="p-8 text-center text-slate-500">Please select a program first.</div>;
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary size-8" /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* 1. Context Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Institute Vision</h4>
            <p className="text-xs text-slate-700">{institution?.vision || 'Not defined'}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Institute Mission</h4>
            <p className="text-xs text-slate-700">{institution?.mission || 'Not defined'}</p>
        </div>
      </div>

      <div className="h-px bg-slate-200" />

      {/* 2. Priority Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Select Priorities for PEOs</h3>
        <div className="flex flex-wrap gap-2">
            {PEO_PRIORITIES.map(item => (
                <button
                    key={item}
                    onClick={() => togglePriority(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        selectedPriorities.includes(item)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {item}
                </button>
            ))}
        </div>
      </div>

      {/* 3. Generation Control */}
      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">No. of PEOs:</span>
            <select 
                value={peoCount}
                onChange={(e) => setPeoCount(Number(e.target.value))}
                className="rounded-lg border border-slate-300 text-sm py-1.5 px-2"
            >
                {[...Array(20)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
            </select>
        </div>
        <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate Draft PEOs
        </button>
      </div>

      {/* 4. Generated Results */}
      {generatedPeos.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-500">AI Generated Suggestions</h4>
              <div className="grid grid-cols-1 gap-3">
                  {generatedPeos.map((peo, i) => (
                      <div key={i} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex justify-between items-center gap-4 group hover:bg-indigo-50 transition-colors">
                          <p className="text-sm text-slate-800 flex-1">{peo}</p>
                          <button 
                            onClick={() => handleAddPeo(peo)}
                            className="bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                             Add
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="h-px bg-slate-200" />

      {/* 5. Process Roadmap & Final List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Process Timeline */}
          <div className="lg:col-span-1 space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Process Timeline</h3>
              
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-8">
                  {/* Step 1 */}
                  <div className="relative">
                      <div className="absolute -left-[29px] top-1 rounded-full bg-slate-100 border-2 border-slate-300 p-1">
                          <span className="block size-2 rounded-full bg-slate-400"></span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Internal Brainstorming</h4>
                      <div className="mt-2 space-y-2">
                          <div>
                            <label className="text-xs text-slate-500 block">Start Date</label>
                            <input type="date" value={brainstormingDates.start} onChange={e => setBrainstormingDates({...brainstormingDates, start: e.target.value})} className="w-full text-xs border rounded p-1" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block">End Date</label>
                            <input type="date" value={brainstormingDates.end} onChange={e => setBrainstormingDates({...brainstormingDates, end: e.target.value})} className="w-full text-xs border rounded p-1" />
                          </div>
                      </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                      <div className="absolute -left-[29px] top-1 rounded-full bg-slate-100 border-2 border-slate-300 p-1">
                          <span className="block size-2 rounded-full bg-slate-400"></span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Stakeholder Feedback</h4>
                      <div className="mt-2 space-y-2">
                          <div>
                            <label className="text-xs text-slate-500 block">Start Date</label>
                            <input type="date" value={feedbackDates.start} onChange={e => setFeedbackDates({...feedbackDates, start: e.target.value})} className="w-full text-xs border rounded p-1" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block">End Date</label>
                            <input type="date" value={feedbackDates.end} onChange={e => setFeedbackDates({...feedbackDates, end: e.target.value})} className="w-full text-xs border rounded p-1" />
                          </div>
                      </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                      <div className="absolute -left-[29px] top-1 rounded-full bg-slate-100 border-2 border-slate-300 p-1">
                          <span className="block size-2 rounded-full bg-slate-400"></span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Consolidation</h4>
                      <div className="mt-2 space-y-2">
                          <div>
                            <label className="text-xs text-slate-500 block">Start Date</label>
                            <input type="date" value={consolidationDates.start} onChange={e => setConsolidationDates({...consolidationDates, start: e.target.value})} className="w-full text-xs border rounded p-1" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block">End Date</label>
                            <input type="date" value={consolidationDates.end} onChange={e => setConsolidationDates({...consolidationDates, end: e.target.value})} className="w-full text-xs border rounded p-1" />
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right: Final PEO List */}
          <div className="lg:col-span-2 space-y-4">
               <div className="flex items-center justify-between">
                   <h3 className="text-lg font-bold text-slate-900">Draft PEOs</h3>
                   <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{peos.length} Items</span>
               </div>
               
               <div className="space-y-3">
                   {peos.length === 0 ? (
                       <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
                           No PEOs added yet. Generate or add new ones.
                       </div>
                   ) : (
                       peos.map((peo, index) => (
                           <div key={peo.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex gap-4 group">
                               <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-600 text-sm">
                                   {index + 1}
                               </div>
                               <div className="flex-1">
                                   <textarea 
                                       value={peo.peo_statement}
                                       onChange={(e) => {
                                           const newPeos = [...peos];
                                           newPeos[index].peo_statement = e.target.value;
                                           setPeos(newPeos);
                                       }}
                                       className="w-full text-sm text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-auto"
                                       rows={2}
                                   />
                               </div>
                               <button 
                                 onClick={() => handleDeletePeo(peo.id)}
                                 className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                   <Trash2 className="size-4" />
                               </button>
                           </div>
                       ))
                   )}
               </div>

               <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                  >
                        {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                        Finalise Draft Version
                  </button>
               </div>
          </div>
      </div>

    </div>
  );
}
