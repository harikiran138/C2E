'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles, Save, Check, RefreshCw, Bookmark, BookmarkCheck } from 'lucide-react';

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
  
  const [customVisionPriorities, setCustomVisionPriorities] = useState<string[]>([]);
  const [customMissionPriorities, setCustomMissionPriorities] = useState<string[]>([]);
  const [newVisionPriority, setNewVisionPriority] = useState('');
  const [newMissionPriority, setNewMissionPriority] = useState('');
  
  const [savedVisions, setSavedVisions] = useState<string[]>([]);
  const [savedMissions, setSavedMissions] = useState<string[]>([]);
  
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
                
                // Load saved priorities
                if (currentProgram.vision_priorities && Array.isArray(currentProgram.vision_priorities)) {
                    setSelectedVisionPriorities(currentProgram.vision_priorities);
                    // Add any that aren't in standard list to custom list
                    const customV = currentProgram.vision_priorities.filter((p: string) => !VISION_PRIORITIES.includes(p));
                    setCustomVisionPriorities(customV);
                }
                
                if (currentProgram.mission_priorities && Array.isArray(currentProgram.mission_priorities)) {
                    setSelectedMissionPriorities(currentProgram.mission_priorities);
                    // Add any that aren't in standard list to custom list
                    const customM = currentProgram.mission_priorities.filter((p: string) => !MISSION_PRIORITIES.includes(p));
                    setCustomMissionPriorities(customM);
                }
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

  const addCustomPriority = (type: 'vision' | 'mission') => {
    const isVision = type === 'vision';
    const newPriority = isVision ? newVisionPriority.trim() : newMissionPriority.trim();
    const customList = isVision ? customVisionPriorities : customMissionPriorities;
    const setCustomList = isVision ? setCustomVisionPriorities : setCustomMissionPriorities;
    const setNewPriority = isVision ? setNewVisionPriority : setNewMissionPriority;
    
    // Auto-select logic
    const selectedList = isVision ? selectedVisionPriorities : selectedMissionPriorities;
    const setSelectedList = isVision ? setSelectedVisionPriorities : setSelectedMissionPriorities;

    if (newPriority && !customList.includes(newPriority)) {
      setCustomList([...customList, newPriority]);
      setSelectedList([...selectedList, newPriority]); // Auto-select
      setNewPriority('');
    }
  };

  const toggleSavedOutput = (output: string, type: 'vision' | 'mission') => {
    const isVision = type === 'vision';
    const savedList = isVision ? savedVisions : savedMissions;
    const setSavedList = isVision ? setSavedVisions : setSavedMissions;

    if (savedList.includes(output)) {
      setSavedList(savedList.filter(item => item !== output));
    } else {
      setSavedList([...savedList, output]);
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
        const response = await fetch('/api/institution/program/update-vm', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program_id: programId,
                vision: selectedVision,
                mission: selectedMission,
                vision_priorities: selectedVisionPriorities,
                mission_priorities: selectedMissionPriorities
            })
        });
        
        if (response.ok) {
            alert('Vision, Mission, and Priorities saved successfully!');
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
     return <div className="p-8 text-center text-slate-500">Please select a program first.</div>;
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary size-8" /></div>;
  }

  const allVisionPriorities = [...VISION_PRIORITIES, ...customVisionPriorities];
  const allMissionPriorities = [...MISSION_PRIORITIES, ...customMissionPriorities];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* Header with Institution Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Institute Vision</h4>
            <p className="text-sm font-medium text-slate-700 italic">"{institution?.vision || 'Not defined'}"</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Institute Mission</h4>
            <p className="text-sm font-medium text-slate-700 italic">"{institution?.mission || 'Not defined'}"</p>
        </div>
      </div>

      <div className="h-px bg-slate-200" />
      
      {/* VISION SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" /> Program Vision
            </h3>
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Generate</span>
                <select 
                    value={visionCount}
                    onChange={(e) => setVisionCount(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 text-sm py-1.5 px-3 font-medium cursor-pointer"
                >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
        </div>

            <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Select Priorities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {VISION_PRIORITIES.map(item => (
                    <button
                        key={item}
                        onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                        className={`h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${
                            selectedVisionPriorities.includes(item)
                            ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-transparent shadow-[0_0_0_2px_rgba(168,85,247,0.4)] text-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                        <div className={`shrink-0 size-4 rounded border-2 flex items-center justify-center ${
                            selectedVisionPriorities.includes(item)
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-slate-300'
                        }`}>
                            {selectedVisionPriorities.includes(item) && <Check className="size-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="line-clamp-2">{item}</span>
                    </button>
                ))}

                {/* Custom Priorities with Delete Option */}
                {customVisionPriorities.map(item => (
                     <div key={item} className="relative group">
                        <button
                            onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                            className={`w-full h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${
                                selectedVisionPriorities.includes(item)
                                ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-transparent shadow-[0_0_0_2px_rgba(168,85,247,0.4)] text-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                        >
                            <div className={`shrink-0 size-4 rounded border-2 flex items-center justify-center ${
                                selectedVisionPriorities.includes(item)
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-slate-300'
                            }`}>
                                {selectedVisionPriorities.includes(item) && <Check className="size-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className="line-clamp-2 pr-6">{item}</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCustomVisionPriorities(prev => prev.filter(p => p !== item));
                                if (selectedVisionPriorities.includes(item)) {
                                    setSelectedVisionPriorities(prev => prev.filter(p => p !== item));
                                }
                            }}
                            className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove custom priority"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                     </div>
                ))}
                
                {/* Add Custom Priority Button */}
                <div className="h-[52px] flex items-center gap-2">
                    <input
                        type="text"
                        value={newVisionPriority}
                        onChange={(e) => setNewVisionPriority(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomPriority('vision')}
                        placeholder="Add custom..."
                        className="flex-1 h-full px-3 text-xs border-2 border-dashed border-slate-300 rounded-xl focus:border-purple-400 focus:outline-none"
                    />
                    <button
                        onClick={() => addCustomPriority('vision')}
                        disabled={!newVisionPriority.trim()}
                        className="h-full aspect-square rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold transition-all"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>

        <button
            onClick={() => handleGenerate('vision')}
            disabled={generatingVision}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
            {generatingVision ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Generate Draft Vision
        </button>

        {generatedVisions.length > 0 && (
            <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {generatedVisions.map((v, i) => (
                    <div 
                        key={i}
                        className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                            selectedVision === v 
                            ? 'border-purple-400 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 ring-1 ring-purple-400'
                            : 'border-slate-200 bg-white'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <button
                                onClick={() => setSelectedVision(v)}
                                className="flex-1 flex items-start gap-3 text-left"
                            >
                                <div className={`mt-0.5 size-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    selectedVision === v ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300'
                                }`}>
                                    {selectedVision === v && <Check className="size-3" />}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{v}</p>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSavedOutput(v, 'vision');
                                }}
                                className={`shrink-0 p-2 rounded-lg transition-all ${
                                    savedVisions.includes(v)
                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                                }`}
                                title={savedVisions.includes(v) ? 'Saved' : 'Save for later'}
                            >
                                {savedVisions.includes(v) ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        <div className="space-y-3">
            {savedVisions.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <label className="block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                        <BookmarkCheck className="size-3" />
                        Saved Visions ({savedVisions.length})
                    </label>
                    <div className="space-y-2">
                        {savedVisions.map((sv, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg">
                                <span className="text-amber-600 font-bold shrink-0">{idx + 1}.</span>
                                <p className="flex-1 leading-relaxed">{sv}</p>
                                <button
                                    onClick={() => setSelectedVision(sv)}
                                    className="shrink-0 text-purple-600 hover:text-purple-700 font-semibold"
                                >
                                    Use
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Final Selected Vision</label>
                <textarea 
                    value={selectedVision}
                    onChange={(e) => setSelectedVision(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    rows={3}
                    placeholder="Select a generated vision or type here..."
                />
            </div>
        </div>
      </div>

      <div className="h-px bg-slate-200" />

      {/* MISSION SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="size-5 text-blue-500" /> Program Mission
            </h3>
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Generate</span>
                <select 
                    value={missionCount}
                    onChange={(e) => setMissionCount(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 text-sm py-1.5 px-3 font-medium cursor-pointer"
                >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
        </div>

        <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Select Priorities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MISSION_PRIORITIES.map(item => (
                    <button
                        key={item}
                        onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                        className={`h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${
                            selectedMissionPriorities.includes(item)
                            ? 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-transparent shadow-[0_0_0_2px_rgba(59,130,246,0.4)] text-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                        <div className={`shrink-0 size-4 rounded border-2 flex items-center justify-center ${
                            selectedMissionPriorities.includes(item)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-slate-300'
                        }`}>
                            {selectedMissionPriorities.includes(item) && <Check className="size-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="line-clamp-2">{item}</span>
                    </button>
                ))}

                {/* Custom Priorities with Delete */}
                {customMissionPriorities.map(item => (
                     <div key={item} className="relative group">
                        <button
                            onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                            className={`w-full h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${
                                selectedMissionPriorities.includes(item)
                                ? 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-transparent shadow-[0_0_0_2px_rgba(59,130,246,0.4)] text-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                        >
                            <div className={`shrink-0 size-4 rounded border-2 flex items-center justify-center ${
                                selectedMissionPriorities.includes(item)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-slate-300'
                            }`}>
                                {selectedMissionPriorities.includes(item) && <Check className="size-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className="line-clamp-2 pr-6">{item}</span>
                        </button>
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCustomMissionPriorities(prev => prev.filter(p => p !== item));
                                if (selectedMissionPriorities.includes(item)) {
                                    setSelectedMissionPriorities(prev => prev.filter(p => p !== item));
                                }
                            }}
                            className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove custom priority"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                     </div>
                ))}
                
                {/* Add Custom Priority Button */}
                <div className="h-[52px] flex items-center gap-2">
                    <input
                        type="text"
                        value={newMissionPriority}
                        onChange={(e) => setNewMissionPriority(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomPriority('mission')}
                        placeholder="Add custom..."
                        className="flex-1 h-full px-3 text-xs border-2 border-dashed border-slate-300 rounded-xl focus:border-blue-400 focus:outline-none"
                    />
                    <button
                        onClick={() => addCustomPriority('mission')}
                        disabled={!newMissionPriority.trim()}
                        className="h-full aspect-square rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold transition-all"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>

        <button
            onClick={() => handleGenerate('mission')}
            disabled={generatingMission}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
            {generatingMission ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Generate Draft Mission
        </button>

        {generatedMissions.length > 0 && (
            <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {generatedMissions.map((m, i) => (
                    <div 
                        key={i}
                        className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                            selectedMission === m 
                            ? 'border-blue-400 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 ring-1 ring-blue-400'
                            : 'border-slate-200 bg-white'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <button
                                onClick={() => setSelectedMission(m)}
                                className="flex-1 flex items-start gap-3 text-left"
                            >
                                <div className={`mt-0.5 size-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    selectedMission === m ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'
                                }`}>
                                    {selectedMission === m && <Check className="size-3" />}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{m}</p>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSavedOutput(m, 'mission');
                                }}
                                className={`shrink-0 p-2 rounded-lg transition-all ${
                                    savedMissions.includes(m)
                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                                }`}
                                title={savedMissions.includes(m) ? 'Saved' : 'Save for later'}
                            >
                                {savedMissions.includes(m) ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        <div className="space-y-3">
            {savedMissions.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <label className="block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                        <BookmarkCheck className="size-3" />
                        Saved Missions ({savedMissions.length})
                    </label>
                    <div className="space-y-2">
                        {savedMissions.map((sm, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg">
                                <span className="text-amber-600 font-bold shrink-0">{idx + 1}.</span>
                                <p className="flex-1 leading-relaxed">{sm}</p>
                                <button
                                    onClick={() => setSelectedMission(sm)}
                                    className="shrink-0 text-blue-600 hover:text-blue-700 font-semibold"
                                >
                                    Use
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Final Selected Mission</label>
                <textarea 
                    value={selectedMission}
                    onChange={(e) => setSelectedMission(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    rows={3}
                    placeholder="Select a generated mission or type here..."
                />
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button 
            onClick={handleSave}
            disabled={saving || (!selectedVision && !selectedMission)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
        >
            {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            Save Vision & Mission
        </button>
      </div>

    </div>
  );
}
