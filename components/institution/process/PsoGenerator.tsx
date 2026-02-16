'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles, Save, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';

const LEAD_SOCIETIES = [
  'American Institute of Aeronautics and Astronautics',
  'American Society of Agricultural and Biological Engineers',
  'American Society of Civil Engineers',
  'American Institute of Chemical Engineers',
  'Biomedical Engineering Society',
  'Institute of Electrical and Electronics Engineers',
  'American Society for Engineering Education',
  'Institute of Industrial and Systems Engineers',
  'American Society of Mechanical Engineers',
  'American Academy of Environmental Engineers and Scientists',
  'Society for Fire Protection Engineers',
  'Society for Mining, Metallurgy, and Exploration',
  'Society of Manufacturing Engineers',
  'The Minerals, Metals & Materials Society',
  'American Ceramic Society',
  'Society of Naval Architects and Marine Engineers',
  'American Nuclear Society',
  'Society of Petroleum Engineers',
  'CSAB',
  'National Society of Professional Surveyors'
];

const CO_LEAD_SOCIETIES = [
  'Institute of Electrical and Electronics Engineers',
  'CSAB',
  'International Council on Systems Engineering',
  'American Society of Mechanical Engineers',
  'American Academy of Environmental Engineers and Scientists',
  'American Society of Agricultural and Biological Engineers',
  'American Society of Civil Engineers',
  'SAE International'
];

const COOPERATING_SOCIETIES = [
  'Institute of Electrical and Electronics Engineers',
  'CSAB',
  'International Society of Automation',
  'SAE International',
  'American Society of Heating, Refrigerating and Air-Conditioning Engineers',
  'American Society of Mechanical Engineers',
  'American Institute of Chemical Engineers',
  'American Ceramic Society',
  'The Minerals, Metals & Materials Society',
  'American Society of Civil Engineers'
];

export default function PsoGenerator() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [psos, setPsos] = useState<any[]>([]);
  
  const [selectedLeadSociety, setSelectedLeadSociety] = useState('');
  const [psoCount, setPsoCount] = useState(3);
  const [generatedPsos, setGeneratedPsos] = useState<string[]>([]);
  
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Program Details
        const instResponse = await fetch('/api/institution/details');
        if (instResponse.ok) {
          const instData = await instResponse.json();
          if (programId && instData.programs) {
             const currentProgram = instData.programs.find((p: any) => p.id === programId);
             if (currentProgram) {
                setProgram(currentProgram);
                if (currentProgram.lead_society) {
                    setSelectedLeadSociety(currentProgram.lead_society);
                }
             }
          }
        }

        // Fetch PSOs
        if (programId) {
            const psoResponse = await fetch(`/api/institution/psos?programId=${programId}`);
            if (psoResponse.ok) {
                const psoData = await psoResponse.json();
                setPsos(psoData.data);
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


  const handleGenerate = async () => {
    if (!selectedLeadSociety) {
        alert('Please select a Lead Society.');
        return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate/psos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadSociety: selectedLeadSociety,
          count: psoCount,
          programName: program?.program_name || 'Engineering Program'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPsos(data.results);
      } else {
        alert('Generation failed.');
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddPso = (statement: string) => {
      setPsos([...psos, { id: `temp-${Date.now()}`, pso_statement: statement, pso_number: psos.length + 1 }]);
  };

  const handleDeletePso = async (id: string) => {
      if (id.startsWith('temp')) {
          setPsos(psos.filter(p => p.id !== id));
      } else {
          try {
              await fetch(`/api/institution/psos?id=${id}`, { method: 'DELETE' });
              setPsos(psos.filter(p => p.id !== id));
          } catch (e) { console.error(e); }
      }
  };

  const handleSaveAll = async () => {
    if (!programId) return;
    setSaving(true);
    try {
        // Save Lead Society
        await fetch('/api/institution/program/lead-society', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                lead_society: selectedLeadSociety
            })
        });

        // Save PSOs (Bulk Sync)
        await fetch('/api/institution/psos', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                psos: psos.map((p, i) => ({ statement: p.pso_statement, number: i + 1 }))
            })
        });

        alert('PSOs saved successfully!');
        
        // Refresh to get real IDs
        const psoResponse = await fetch(`/api/institution/psos?programId=${programId}`);
        if (psoResponse.ok) {
            const psoData = await psoResponse.json();
            setPsos(psoData.data);
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
      
      {/* 1. Lead Society Selection */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900">1. Select your Lead Society</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* A. Lead Societies */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600">A. Lead Societies</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {LEAD_SOCIETIES.map(society => (
                        <label key={society} className="flex items-start gap-2 cursor-pointer group">
                             <input 
                                type="radio" 
                                name="leadSociety" 
                                value={society} 
                                checked={selectedLeadSociety === society}
                                onChange={() => setSelectedLeadSociety(society)}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500 size-4"
                             />
                             <span className="text-xs text-slate-700 group-hover:text-indigo-700 leading-tight">{society}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* B. Co-Lead Societies */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600">B. Co-Lead Societies</h4>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {CO_LEAD_SOCIETIES.map(society => (
                        <label key={society} className="flex items-start gap-2 cursor-pointer group">
                             <input 
                                type="radio" 
                                name="leadSociety" 
                                value={society} 
                                checked={selectedLeadSociety === society}
                                onChange={() => setSelectedLeadSociety(society)}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500 size-4"
                             />
                             <span className="text-xs text-slate-700 group-hover:text-indigo-700 leading-tight">{society}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* C. Cooperating Societies */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600">C. Cooperating Societies</h4>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {COOPERATING_SOCIETIES.map(society => (
                        <label key={society} className="flex items-start gap-2 cursor-pointer group">
                             <input 
                                type="radio" 
                                name="leadSociety" 
                                value={society} 
                                checked={selectedLeadSociety === society}
                                onChange={() => setSelectedLeadSociety(society)}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500 size-4"
                             />
                             <span className="text-xs text-slate-700 group-hover:text-indigo-700 leading-tight">{society}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* 2. Generation Control */}
      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">No. of PSOs:</span>
            <input 
                type="number"
                min={1}
                max={10}
                value={psoCount}
                onChange={(e) => setPsoCount(Number(e.target.value))}
                className="rounded-lg border border-slate-300 text-sm py-1.5 px-2 w-20"
            />
        </div>
        <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? 'Generating...' : 'Generate PSOs'}
        </button>
        {generatedPsos.length > 0 && (
             <button
                onClick={handleGenerate}
                disabled={generating}
                className="py-2 px-4 rounded-lg bg-white text-slate-700 border border-slate-300 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
                <RefreshCw className="size-4" />
                Regenerate
            </button>
        )}
      </div>

      {/* 3. Generated Results */}
      {generatedPsos.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-500">AI Generated Suggestions</h4>
              <div className="grid grid-cols-1 gap-3">
                  {generatedPsos.map((pso, i) => (
                      <div key={i} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex justify-between items-center gap-4 group hover:bg-indigo-50 transition-colors">
                          <p className="text-sm text-slate-800 flex-1">{pso}</p>
                          <button 
                            onClick={() => handleAddPso(pso)}
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

      {/* 4. Final PSO List */}
      <div className="space-y-4">
           <div className="flex items-center justify-between">
               <h3 className="text-lg font-bold text-slate-900">Program Specific Outcomes (PSOs)</h3>
               <button 
                onClick={handleSaveAll}
                disabled={saving || psos.length === 0}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
              >
                    {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                    Save PSOs
              </button>
           </div>
           
           <div className="space-y-3">
               {psos.length === 0 ? (
                   <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
                       No PSOs added yet. Select a Lead Society and generate outcomes.
                   </div>
               ) : (
                   psos.map((pso, index) => (
                       <div key={pso.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex gap-4 group hover:border-indigo-200 transition-colors">
                           <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-600 text-sm">
                               {index + 1}
                           </div>
                           <div className="flex-1">
                               <textarea 
                                   value={pso.pso_statement}
                                   onChange={(e) => {
                                       const newPsos = [...psos];
                                       newPsos[index].pso_statement = e.target.value;
                                       setPsos(newPsos);
                                   }}
                                   className="w-full text-sm text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-auto font-medium"
                                   rows={2}
                               />
                           </div>
                           <button 
                             onClick={() => handleDeletePso(pso.id)}
                             className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                           >
                               <Trash2 className="size-4" />
                           </button>
                       </div>
                   ))
               )}
           </div>
      </div>

    </div>
  );
}
