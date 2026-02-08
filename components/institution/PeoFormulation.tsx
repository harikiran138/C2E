'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Program {
  id: string;
  name: string;
}

interface PeoData {
  id: number;
  text: string;
  visionAlign: string;
  stakeholderAlign: string;
}

export default function PeoFormulation() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  
  const [generatedSets, setGeneratedSets] = useState<string[][]>([]);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);
  const [finalPeos, setFinalPeos] = useState<PeoData[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchPrograms = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/institution/login');
        return;
      }
      const { data } = await supabase.from('programs').select('id, name').eq('institution_id', user.id);
      if (data && data.length > 0) {
        setPrograms(data);
        setSelectedProgramId(data[0].id);
      }
    };
    fetchPrograms();
  }, []);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const sets = [
        [
          "Demonstrate technical leadership and innovation in engineering practices.",
          "Excel in multidisciplinary research environments.",
          "Maintain highest ethical standards in professional delivery."
        ],
        [
          "Lead multidisciplinary teams with ethical responsibility and global awareness.",
          "Apply advanced computational methods to solve societal challenges.",
          "Foster sustainable development through green engineering practices."
        ],
        [
          "Identify, formulate, and solve complex engineering problems.",
          "Communicate effectively with engineering community and society.",
          "Engage in lifelong learning and professional development."
        ],
        [
          "Design solutions for complex engineering problems with safety considerations.",
          "Use research-based knowledge to provide valid conclusions.",
          "Create, select, and apply appropriate techniques and tools."
        ]
      ];
      setGeneratedSets(sets);
      setLoading(false);
    }, 1500);
  };

  const handleSelectSet = (index: number) => {
    setSelectedSetIndex(index);
    const peos = generatedSets[index].map((text, i) => ({
      id: i + 1,
      text,
      visionAlign: '',
      stakeholderAlign: ''
    }));
    setFinalPeos(peos);
  };

  const cleanPercentage = (val: string) => {
    // allow empty string
    if (val === '') return '';
    // parse int, clamp 0-100
    const num = parseInt(val);
    if (isNaN(num)) return '';
    if (num < 0) return '0';
    if (num > 100) return '100';
    return num.toString();
  };

  const updatePeoData = (id: number, field: 'visionAlign' | 'stakeholderAlign', value: string) => {
    const cleanValue = cleanPercentage(value);
    setFinalPeos(prev => prev.map(p => p.id === id ? { ...p, [field]: cleanValue } : p));
  };

  const handleSave = async (isFinal: boolean) => {
    if (!selectedProgramId) {
       alert("Please select a program first.");
       return;
    }
    if (finalPeos.length === 0) {
       alert("Please generate and select a PEO set.");
       return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('peo_sets').insert({
        program_id: selectedProgramId,
        set_name: `Set ${selectedSetIndex! + 1}`,
        peos: finalPeos,
        is_final: isFinal,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      alert(`PEOs ${isFinal ? 'finalized' : 'draft saved'} successfully!`);
    } catch (error: any) {
      console.error('Error saving PEOs:', error);
      alert('Error saving PEOs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans min-h-screen text-slate-900 dark:text-slate-100">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
          <div className="text-[#137fec] cursor-pointer">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </div>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-6">PEO Formulation</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto pb-24">
        {/* Hero Section */}
        <section className="px-4 pt-6 pb-2">
          {programs.length > 0 && (
            <div className="mb-4">
               <select 
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
               >
                 {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
            </div>
          )}
          <h2 className="text-2xl font-extrabold tracking-tight mb-1">Formulate PEOs</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Define Program Educational Objectives using AI-assisted generation.</p>
        </section>

        {/* Primary Action Button */}
        {/* Primary Action Button */}
        <div className="px-4 py-4">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl h-14 bg-[#137fec] text-white gap-3 shadow-lg shadow-blue-500/20 hover:bg-[#137fec]/90 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            <span className="material-symbols-outlined">{loading ? 'hourglass_top' : 'auto_awesome'}</span>
            <span className="text-base font-bold">{loading ? 'Generating...' : 'Generate 4 sets of PEOs'}</span>
          </button>
        </div>

        {/* PEO Selection List */}
        {/* PEO Selection List */}
        {generatedSets.length > 0 && (
          <div className="flex flex-col gap-4 p-4">
            {generatedSets.map((set, setIdx) => (
              <label key={setIdx} className={`relative flex flex-col gap-3 rounded-xl border-2 ${selectedSetIndex === setIdx ? 'border-[#137fec] bg-blue-50/20 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} p-4 shadow-sm cursor-pointer transition-all`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider ${selectedSetIndex === setIdx ? 'bg-blue-500/10 text-[#137fec]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Set {setIdx + 1}</span>
                  <input 
                    checked={selectedSetIndex === setIdx}
                    onChange={() => handleSelectSet(setIdx)}
                    className="h-6 w-6 border-2 text-[#137fec] focus:ring-[#137fec]" 
                    name="peo-set" 
                    type="radio"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {set.map((peo, i) => (
                      <p key={i}>• {peo}</p>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Finalize Section */}
        {/* Finalize Section */}
        {selectedSetIndex !== null && (
        <section className="mt-8 px-4">
          <h2 className="text-2xl font-extrabold tracking-tight mb-4">Finalize PEOs</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Objective</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {finalPeos.map((peo, idx) => (
                <tr key={peo.id}>
                  <td className="p-4 align-top">
                    <span className="font-bold text-[#137fec]">PEO-{idx + 1}</span>
                  </td>
                  <td className="p-4 align-top">
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{peo.text}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Vision Alignment (%)</label>
                        <input 
                          value={peo.visionAlign}
                          onChange={(e) => updatePeoData(peo.id, 'visionAlign', e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] outline-none transition-all" 
                          placeholder="0-100" 
                          type="text"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Stakeholder (%)</label>
                        <input 
                          value={peo.stakeholderAlign}
                          onChange={(e) => updatePeoData(peo.id, 'stakeholderAlign', e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] outline-none transition-all" 
                          placeholder="0-100" 
                          type="text"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </main>

      {/* Bottom Submission Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-lg mx-auto flex gap-4">
          <button 
            onClick={() => handleSave(false)}
            className="flex-1 h-12 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-300"
          >
            Save Draft
          </button>
          <button 
            onClick={() => handleSave(true)}
            className="flex-[2] h-12 rounded-lg bg-[#137fec] text-white font-bold text-sm shadow-md"
          >
            Complete Formulation
          </button>
        </div>
      </div>
    </div>
  );
}
