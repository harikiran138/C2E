'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Sparkles, 
  Save, 
  Check, 
  RefreshCw, 
  Loader2, 
  Lightbulb, 
  Target, 
  ArrowRight,
  Quote,
  Zap,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- DESIGN TOKENS ---
// Typography: Inter (System)
// Colors: Slate (Neutral), Indigo (Vision), Emerald (Mission/Active)

const VISION_PRIORITIES = [
  'Global Engineering Excellence',
  'Future-ready Engineers',
  'Innovation-driven Education',
  'Technology with Purpose',
  'Societal Impact',
  'Internationally Benchmarked',
  'Outcome-oriented',
  'Professional Standards',
  'Globally Competitive',
  'Ethics & Integrity',
  'Sustainable Development',
  'Human-centric',
  'Responsible Innovation'
];

const MISSION_PRIORITIES = [
  'Outcome Based Education',
  'Experiential Learning',
  'Strong Theoretical Foundation',
  'Practice-oriented Curriculum',
  'Continuous Improvement',
  'Industry Alignment',
  'Hands-on Laboratories',
  'Internship-embedded',
  'Professional Skills',
  'Employability',
  'Research-led Teaching',
  'Innovation & Entrepreneurship',
  'Problem-based Learning',
  'Interdisciplinary Approach',
  'Critical Thinking',
  'Teamwork & Leadership',
  'Effective Communication',
  'Ethical Practice',
  'Sustainability',
  'Social Responsibility',
  'Lifelong Learning'
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
        const instResponse = await fetch('/api/institution/details');
        if (instResponse.ok) {
          const instData = await instResponse.json();
          setInstitution(instData.institution);
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
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!programId) return;
    setSaving(true);
    try {
        const response = await fetch('/api/institution/program/update-vm', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                vision: selectedVision,
                mission: selectedMission
            })
        });
        
        if (response.ok) {
            // alert('Saved!'); // Replaced with toast or silent success for premium feel
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
    <div className="min-h-screen bg-slate-50/50 pb-32">
        {/* --- HERO HEADER (Subtle to avoid duplication) --- */}
        <section className="relative px-8 pt-8 pb-10 lg:px-12">
            <div className="relative z-10 max-w-4xl">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-bold uppercase tracking-widest text-indigo-600 mb-6">
                    <span className="current-process">Strategic Direction</span>
                    <span className="w-px h-3 bg-indigo-200" />
                    <span>Core Identity</span>
                </div>
                {/* 
                   Replacing duplicate H1 with a strong subtitle asking the core question.
                   This follows Option A: Remove duplicate title, use subtitle.
                */}
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
                    Define the program's <span className="text-indigo-600">future direction</span>.
                </h2>
                <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
                    Formulate a visionary roadmap and mission statement that aligns with institutional goals and inspires excellence.
                </p>
            </div>
        </section>

        <div className="px-6 lg:px-12 space-y-12 max-w-[1600px] mx-auto">
            
            {/* --- INSTITUTIONAL CONTEXT RIBBON --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:border-indigo-100 transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-900" />
                    <div className="flex items-center gap-3 mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Quote className="size-4 text-slate-400" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Institute Vision</h4>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                        "{institution?.vision || 'Vision not defined.'}"
                    </p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:border-emerald-100 transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-900" />
                    <div className="flex items-center gap-3 mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Quote className="size-4 text-slate-400" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Institute Mission</h4>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                        "{institution?.mission || 'Mission not defined.'}"
                    </p>
                </div>
            </div>

            {/* --- VISION SECTION --- */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Left: Configuration */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                            <Lightbulb className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Program Vision</h3>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Aspiration & Future State</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                         <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Key Themes</label>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">Max 5 Rec.</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {VISION_PRIORITIES.map(item => (
                                <button
                                    key={item}
                                    onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border
                                        ${selectedVisionPriorities.includes(item)
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10' 
                                            : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-amber-200 hover:bg-white'
                                        }
                                    `}
                                >
                                    {item}
                                </button>
                            ))}
                         </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                         <div className="flex-1">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Variations</label>
                             <select 
                                value={visionCount}
                                onChange={(e) => setVisionCount(Number(e.target.value))}
                                className="w-full bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-900 p-2"
                             >
                                 {[1,2,3].map(n => <option key={n} value={n}>{n} Options</option>)}
                             </select>
                         </div>
                         <button 
                            onClick={() => handleGenerate('vision')}
                            disabled={generatingVision || selectedVisionPriorities.length === 0}
                            className="flex-1 h-[52px] rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                         >
                            {generatingVision ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-400" />}
                            <span>Generate</span>
                         </button>
                    </div>

                    {/* AI Results */}
                    <AnimatePresence>
                        {generatedVisions.length > 0 && (
                            <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 pl-1">Suggestions</h4>
                                {generatedVisions.map((v, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedVision(v)}
                                        className="p-4 rounded-xl bg-white border border-indigo-50 shadow-sm cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group relative"
                                    >
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{v}</p>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100">
                                             <ArrowRight className="size-4 text-amber-500" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Editor */}
                <div className="lg:col-span-7">
                    <div className="h-full bg-white rounded-3xl p-1 border border-slate-200 shadow-sm">
                        <textarea 
                            value={selectedVision}
                            onChange={(e) => setSelectedVision(e.target.value)}
                            className="w-full h-full min-h-[400px] rounded-[1.4rem] p-8 text-lg md:text-xl text-slate-800 font-medium leading-relaxed border-none focus:ring-0 resize-none placeholder:text-slate-300 bg-slate-50/50 focus:bg-white transition-colors"
                            placeholder="Select a generated vision or craft your own statement here..."
                        />
                    </div>
                </div>
            </section>

            <div className="w-full h-px bg-slate-200" />

            {/* --- MISSION SECTION --- */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Left: Configuration */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="size-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Target className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Program Mission</h3>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Methods & Approach</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                         <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Key Methods</label>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">Max 5 Rec.</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {MISSION_PRIORITIES.map(item => (
                                <button
                                    key={item}
                                    onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border
                                        ${selectedMissionPriorities.includes(item)
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10' 
                                            : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-emerald-200 hover:bg-white'
                                        }
                                    `}
                                >
                                    {item}
                                </button>
                            ))}
                         </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                         <div className="flex-1">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Variations</label>
                             <select 
                                value={missionCount}
                                onChange={(e) => setMissionCount(Number(e.target.value))}
                                className="w-full bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-900 p-2"
                             >
                                 {[1,2,3].map(n => <option key={n} value={n}>{n} Options</option>)}
                             </select>
                         </div>
                         <button 
                            onClick={() => handleGenerate('mission')}
                            disabled={generatingMission || selectedMissionPriorities.length === 0}
                            className="flex-1 h-[52px] rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                         >
                            {generatingMission ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-emerald-400" />}
                            <span>Generate</span>
                         </button>
                    </div>

                    {/* AI Results */}
                    <AnimatePresence>
                        {generatedMissions.length > 0 && (
                            <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 pl-1">Suggestions</h4>
                                {generatedMissions.map((m, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedMission(m)}
                                        className="p-4 rounded-xl bg-white border border-indigo-50 shadow-sm cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group relative"
                                    >
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{m}</p>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100">
                                             <ArrowRight className="size-4 text-emerald-500" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Editor */}
                <div className="lg:col-span-7">
                    <div className="h-full bg-white rounded-3xl p-1 border border-slate-200 shadow-sm">
                        <textarea 
                            value={selectedMission}
                            onChange={(e) => setSelectedMission(e.target.value)}
                            className="w-full h-full min-h-[400px] rounded-[1.4rem] p-8 text-lg md:text-xl text-slate-800 font-medium leading-relaxed border-none focus:ring-0 resize-none placeholder:text-slate-300 bg-slate-50/50 focus:bg-white transition-colors"
                            placeholder="Select a generated mission or craft your own statement here..."
                        />
                    </div>
                </div>
            </section>

             {/* 3. Actions Footer (Sticky) */}
            <div className="sticky bottom-6 z-20">
                <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-slate-900/20 text-white flex items-center justify-between border border-white/10">
                        <div className="flex items-center gap-3 px-2">
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold tracking-wide">Ready to Finalize</span>
                        </div>
                        <button 
                        onClick={handleSave}
                        disabled={saving || (!selectedVision && !selectedMission)}
                        className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg shadow-white/10 flex items-center gap-2 active:scale-95 disabled:opacity-70 disabled:scale-100"
                        >
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        <span>Save & Finalize Draft</span>
                        <ArrowRight className="size-4 opacity-50" />
                        </button>
                </div>
            </div>

        </div>
    </div>
  );
}
