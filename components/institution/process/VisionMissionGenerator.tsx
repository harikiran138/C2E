'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles, Save, Check, RefreshCw } from 'lucide-react';

const VISION_PRIORITIES = [
  'Global Engineering Excellence',
  'Future-ready engineers',
  'Innovation-driven education',
  'Technology with purpose',
  'Engineering for societal impact',
  'Internationally benchmarked',
  'Outcome-oriented education',
  'Professional engineering standards',
  'Globally competitive graduates',
  'Ethics and integrity',
  'Sustainable development',
  'Human-centric engineering',
  'Responsible innovation'
];

const MISSION_PRIORITIES = [
  'Outcome Based Education',
  'Experiential learning',
  'Strong theoretical foundation',
  'Practice-oriented curriculum',
  'Continuous academic improvement',
  'Industry-aligned curriculum',
  'Hands-on laboratories',
  'Internship-embedded learning',
  'Professional skill development',
  'Employability enhancement',
  'Research-led teaching',
  'Innovation and entrepreneurship',
  'Problem-based learning',
  'Interdisciplinary approach',
  'Critical thinking',
  'Problem solving',
  'Teamwork and leadership',
  'Effective communication',
  'Ethical engineering practice',
  'Sustainability consciousness',
  'Social responsibility',
  'Lifelong learning mindset'
];

export default function VisionMissionGenerator() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  
  const [selectedVisionPriorities, setSelectedVisionPriorities] = useState<string[]>([]);
  const [selectedMissionPriorities, setSelectedMissionPriorities] = useState<string[]>([]);
  
  const [visionCount, setVisionCount] = useState(3);
  const [missionCount, setMissionCount] = useState(3);
  
  const [generatedVisions, setGeneratedVisions] = useState<string[]>([]);
  const [generatedMissions, setGeneratedMissions] = useState<string[]>([]);
  
  const [selectedVision, setSelectedVision] = useState('');
  const [selectedMission, setSelectedMission] = useState('');
  
  const [generatingVision, setGeneratingVision] = useState(false);
  const [generatingMission, setGeneratingMission] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Institution Details
        const instResponse = await fetch('/api/institution/details');
        if (instResponse.ok) {
          const instData = await instResponse.json();
          setInstitution(instData.institution);
          // Also try to find the current program if programId is present
          if (programId && instData.programs) {
             const currentProgram = instData.programs.find((p: any) => p.id === programId);
             if (currentProgram) {
                setProgram(currentProgram);
                if (currentProgram.vision) setSelectedVision(currentProgram.vision);
                if (currentProgram.mission) setSelectedMission(currentProgram.mission);
             }
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

  const togglePriority = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleGenerate = async (type: 'vision' | 'mission') => {
    if (!institution) return;
    
    const isVision = type === 'vision';
    const setGenerating = isVision ? setGeneratingVision : setGeneratingMission;
    const setGenerated = isVision ? setGeneratedVisions : setGeneratedMissions;
    const priorities = isVision ? selectedVisionPriorities : selectedMissionPriorities;
    const count = isVision ? visionCount : missionCount;
    const sourceText = isVision ? institution.vision : institution.mission;

    if (priorities.length === 0) {
        alert(`Please select at least one priority for ${type}.`);
        return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate/vision-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          priorities,
          count,
          institutionContext: sourceText,
          programName: program?.program_name || 'Engineering Program'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGenerated(data.results);
      } else {
        const err = await response.json();
        alert(`Generation failed: ${err.error}`);
        // Mock fallback for demo if API fails/no key
        // setGenerated([
        //     `Mock Generated ${type} 1 based on ${priorities.join(', ')}`,
        //     `Mock Generated ${type} 2 focusing on excellence`,
        //     `Mock Generated ${type} 3 with student focus`
        // ]);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!programId) return;
    setSaving(true);
    try {
        const response = await fetch('/api/institution/program/update-vm', { // We'll create this or use specific endpoint
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                vision: selectedVision,
                mission: selectedMission
            })
        });
        
        if (response.ok) {
            alert('Vision and Mission saved successfully!');
        } else {
            alert('Failed to save.');
        }
    } catch (error) {
        console.error('Save error:', error);
    } finally {
        setSaving(false);
    }
  };

  if (!programId) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Sparkles className="size-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Program Selected</h3>
            <p className="text-slate-500 max-w-md mx-auto">Please select a program from the dashboard to begin formulating its Vision and Mission.</p>
        </div>
     );
  }

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-indigo-600 size-10 mb-4" />
            <p className="text-sm font-medium text-slate-500 animate-pulse">Loading program details...</p>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 space-y-10">
      
      {/* 1. Header Section */}
      <div className="space-y-2">
         <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
             <span className="hover:text-slate-900 cursor-pointer transition-colors">Process</span>
             <span>/</span>
             <span className="text-indigo-600">Vision & Mission</span>
         </div>
         <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
            Define the core identity and future direction of the program.
         </p>
      </div>

      {/* 2. Institute Context Cards (Glass/Premium look) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="group relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white/50 p-8 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="size-24 text-indigo-600" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                        <Sparkles className="size-5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600">Institute Vision</h4>
                </div>
                <blockquote className="text-base font-medium text-slate-800 leading-relaxed italic border-l-4 border-indigo-200 pl-4 py-1">
                    "{institution?.vision || 'Not defined'}"
                </blockquote>
            </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white/50 p-8 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Check className="size-24 text-emerald-600" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                        <Check className="size-5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600">Institute Mission</h4>
                </div>
                 <blockquote className="text-base font-medium text-slate-800 leading-relaxed italic border-l-4 border-emerald-200 pl-4 py-1">
                    "{institution?.mission || 'Not defined'}"
                </blockquote>
            </div>
        </div>
      </div>

      {/* 3. Program Vision Section - Productivity Card */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                 <div className="size-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                     <Sparkles className="size-6" />
                 </div>
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">Program Vision</h2>
                     <p className="text-sm text-slate-500">Where do you see this program in the future?</p>
                 </div>
             </div>
             
             {/* Controls */}
             <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Variations</span>
                 <select 
                     value={visionCount}
                     onChange={(e) => setVisionCount(Number(e.target.value))}
                     className="bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500/20 py-1.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                 >
                     {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
             </div>
         </div>

         <div className="p-6 md:p-8 space-y-8">
             {/* Priorities Matrix */}
             <div className="space-y-4">
                 <div className="flex items-center justify-between">
                     <label className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                         <span className="size-2 rounded-full bg-amber-500" />
                         Select Key Priorities
                     </label>
                     <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                         {selectedVisionPriorities.length} selected
                     </span>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                     {VISION_PRIORITIES.map(item => {
                         const isSelected = selectedVisionPriorities.includes(item);
                         return (
                             <button
                                 key={item}
                                 onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                                 className={`
                                     group relative w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200
                                     flex items-start gap-3
                                     ${isSelected 
                                         ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 ring-2 ring-slate-900 ring-offset-2' 
                                         : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-400 hover:shadow-md hover:text-slate-900'
                                     }
                                 `}
                             >
                                 <div className={`mt-0.5 size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                     isSelected ? 'border-transparent bg-amber-500 text-slate-900' : 'border-slate-300 group-hover:border-amber-400'
                                 }`}>
                                     {isSelected && <Check className="size-3" />}
                                 </div>
                                 <span className="leading-snug">{item}</span>
                             </button>
                         );
                     })}
                 </div>
             </div>

             {/* Action Bar */}
             <div className="flex justify-center py-4">
                 <button
                     onClick={() => handleGenerate('vision')}
                     disabled={generatingVision || selectedVisionPriorities.length === 0}
                     className="
                         group relative overflow-hidden rounded-full bg-slate-900 text-white px-8 py-3 font-bold text-sm 
                         shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
                     "
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                     <div className="flex items-center gap-2">
                         {generatingVision ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-400" />}
                         <span>{generatedVisions.length > 0 ? 'Regenerate Draft Visions' : 'Generate Draft Visions'}</span>
                     </div>
                 </button>
             </div>

             {/* Results & Selection */}
             {(generatedVisions.length > 0 || selectedVision) && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="space-y-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">AI Suggestions</h4>
                         <div className="space-y-3">
                             {generatedVisions.map((v, i) => (
                                 <div 
                                     key={i}
                                     onClick={() => setSelectedVision(v)}
                                     className={`
                                         group p-5 rounded-2xl border cursor-pointer transition-all duration-200
                                         ${selectedVision === v 
                                             ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500 shadow-md' 
                                             : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                         }
                                     `}
                                 >
                                     <div className="flex items-start gap-4">
                                         <div className={`mt-1 size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                             selectedVision === v ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 group-hover:border-slate-400'
                                         }`}>
                                             {selectedVision === v && <Check className="size-3" />}
                                         </div>
                                         <p className="text-sm text-slate-700 leading-relaxed">{v}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     <div className="space-y-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Final Editor</h4>
                         <div className="h-full bg-slate-50 rounded-2xl border border-slate-200 p-1">
                             <textarea 
                                 value={selectedVision}
                                 onChange={(e) => setSelectedVision(e.target.value)}
                                 className="w-full h-full min-h-[200px] bg-white border border-slate-200 rounded-xl p-6 text-base text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none shadow-sm"
                                 placeholder="Select a generated vision from the left, or write your own here..."
                             />
                         </div>
                     </div>
                 </div>
             )}
         </div>
      </section>


      {/* 4. Program Mission Section - Productivity Card */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                 <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                     <RefreshCw className="size-6" /> {/* Using RefreshCw as 'Process' icon substitute */}
                 </div>
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">Program Mission</h2>
                     <p className="text-sm text-slate-500">How will you achieve this vision?</p>
                 </div>
             </div>
             
             {/* Controls */}
             <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Variations</span>
                 <select 
                     value={missionCount}
                     onChange={(e) => setMissionCount(Number(e.target.value))}
                     className="bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 py-1.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                 >
                     {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
             </div>
         </div>

         <div className="p-6 md:p-8 space-y-8">
             {/* Priorities Matrix */}
             <div className="space-y-4">
                 <div className="flex items-center justify-between">
                     <label className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                         <span className="size-2 rounded-full bg-blue-500" />
                         Select Key Priorities
                     </label>
                     <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                         {selectedMissionPriorities.length} selected
                     </span>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                     {MISSION_PRIORITIES.map(item => {
                         const isSelected = selectedMissionPriorities.includes(item);
                         return (
                             <button
                                 key={item}
                                 onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                                 className={`
                                     group relative w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200
                                     flex items-start gap-3
                                     ${isSelected 
                                         ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 ring-2 ring-slate-900 ring-offset-2' 
                                         : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:shadow-md hover:text-slate-900'
                                     }
                                 `}
                             >
                                 <div className={`mt-0.5 size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                     isSelected ? 'border-transparent bg-blue-500 text-white' : 'border-slate-300 group-hover:border-blue-400'
                                 }`}>
                                     {isSelected && <Check className="size-3" />}
                                 </div>
                                 <span className="leading-snug">{item}</span>
                             </button>
                         );
                     })}
                 </div>
             </div>

             {/* Action Bar */}
             <div className="flex justify-center py-4">
                 <button
                     onClick={() => handleGenerate('mission')}
                     disabled={generatingMission || selectedMissionPriorities.length === 0}
                     className="
                         group relative overflow-hidden rounded-full bg-slate-900 text-white px-8 py-3 font-bold text-sm 
                         shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
                     "
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                     <div className="flex items-center gap-2">
                         {generatingMission ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-blue-400" />}
                         <span>{generatedMissions.length > 0 ? 'Regenerate Draft Missions' : 'Generate Draft Missions'}</span>
                     </div>
                 </button>
             </div>

             {/* Results & Selection */}
             {(generatedMissions.length > 0 || selectedMission) && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="space-y-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">AI Suggestions</h4>
                         <div className="space-y-3">
                             {generatedMissions.map((m, i) => (
                                 <div 
                                     key={i}
                                     onClick={() => setSelectedMission(m)}
                                     className={`
                                         group p-5 rounded-2xl border cursor-pointer transition-all duration-200
                                         ${selectedMission === m 
                                             ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-md' 
                                             : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                         }
                                     `}
                                 >
                                     <div className="flex items-start gap-4">
                                         <div className={`mt-1 size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                             selectedMission === m ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 group-hover:border-slate-400'
                                         }`}>
                                             {selectedMission === m && <Check className="size-3" />}
                                         </div>
                                         <p className="text-sm text-slate-700 leading-relaxed">{m}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     <div className="space-y-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Final Editor</h4>
                         <div className="h-full bg-slate-50 rounded-2xl border border-slate-200 p-1">
                             <textarea 
                                 value={selectedMission}
                                 onChange={(e) => setSelectedMission(e.target.value)}
                                 className="w-full h-full min-h-[200px] bg-white border border-slate-200 rounded-xl p-6 text-base text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none shadow-sm"
                                 placeholder="Select a generated mission from the left, or write your own here..."
                             />
                         </div>
                     </div>
                 </div>
             )}
         </div>
      </section>

      {/* 5. Sticky Footer / Bottom Action */}
      <div className="sticky bottom-4 z-50 flex justify-end">
         <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 p-2 rounded-2xl shadow-2xl shadow-slate-200/50 flex gap-4">
            <button 
                onClick={handleSave}
                disabled={saving || (!selectedVision && !selectedMission)}
                className="
                    flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg 
                    hover:bg-black hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none
                    transition-all duration-200
                "
            >
                {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                <span>Save Vision & Mission</span>
            </button>
         </div>
      </div>

    </div>
  );
}
