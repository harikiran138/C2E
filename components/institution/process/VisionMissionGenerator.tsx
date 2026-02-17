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
     return <div className="p-8 text-center text-slate-500">Please select a program first.</div>;
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary size-8" /></div>;
  }

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
      <div className="space-y-6">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {VISION_PRIORITIES.map(item => (
                    <button
                        key={item}
                        onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left ${
                            selectedVisionPriorities.includes(item)
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {item}
                    </button>
                ))}
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
                        onClick={() => setSelectedVision(v)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                            selectedVision === v 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-slate-200 bg-white'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 size-5 rounded-full border flex items-center justify-center shrink-0 ${
                                selectedVision === v ? 'border-primary bg-primary text-white' : 'border-slate-300'
                            }`}>
                                {selectedVision === v && <Check className="size-3" />}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{v}</p>
                        </div>
                    </div>
                ))}
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

      <div className="h-px bg-slate-200" />

      {/* MISSION SECTION */}
      <div className="space-y-6">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MISSION_PRIORITIES.map(item => (
                    <button
                        key={item}
                        onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left ${
                            selectedMissionPriorities.includes(item)
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {item}
                    </button>
                ))}
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
                        onClick={() => setSelectedMission(m)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                            selectedMission === m 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-slate-200 bg-white'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 size-5 rounded-full border flex items-center justify-center shrink-0 ${
                                selectedMission === m ? 'border-primary bg-primary text-white' : 'border-slate-300'
                            }`}>
                                {selectedMission === m && <Check className="size-3" />}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{m}</p>
                        </div>
                    </div>
                ))}
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
