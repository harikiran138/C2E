'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles, Save, Check, RefreshCw } from 'lucide-react';
import { AI_API_URL } from '@/lib/api';
import PeoGenerator from '@/components/institution/process/PeoGenerator';

type VisionMissionPair = {
    vision: string;
    mission: string;
};

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

function mergeUniqueStatements(existing: string[], incoming: string[]) {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const item of [...existing, ...incoming]) {
        const normalized = String(item || '').replace(/\s+/g, ' ').trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(normalized);
        }
    }

    return merged;
}

function buildVisionMissionPairs(visions: string[], missions: string[]): VisionMissionPair[] {
    const pairCount = Math.min(visions.length, missions.length);
    const pairs: VisionMissionPair[] = [];

    for (let i = 0; i < pairCount; i += 1) {
        const vision = String(visions[i] || '').trim();
        const mission = String(missions[i] || '').trim();
        if (vision && mission) {
            pairs.push({ vision, mission });
        }
    }

    return pairs;
}

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

    // Final selections to be stored
    const [programVision, setProgramVision] = useState('');
    const [programMission, setProgramMission] = useState('');

    // Multi-option state
    const [visionOptions, setVisionOptions] = useState<string[]>([]);
    const [missionOptions, setMissionOptions] = useState<string[]>([]);
    const [visionGenerationHistory, setVisionGenerationHistory] = useState<string[]>([]);
    const [missionGenerationHistory, setMissionGenerationHistory] = useState<string[]>([]);
    const [visionMissionPairs, setVisionMissionPairs] = useState<VisionMissionPair[]>([]);
    const [visionGenerateCount, setVisionGenerateCount] = useState(3);
    const [missionGenerateCount, setMissionGenerateCount] = useState(3);

    const [generatingVision, setGeneratingVision] = useState(false);
    const [generatingMission, setGeneratingMission] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isAiGenerated, setIsAiGenerated] = useState(false);
    const canGenerateMission = Boolean(programVision || visionOptions.length > 0);

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
                            setProgramVision(currentProgram.program_vision || currentProgram.vision || '');
                            setProgramMission(currentProgram.program_mission || currentProgram.mission || '');
                            setIsAiGenerated(currentProgram.generated_by_ai || false);
                            const loadedVisionOptions = Array.isArray(currentProgram.vision_options) ? currentProgram.vision_options : [];
                            const loadedMissionOptions = Array.isArray(currentProgram.mission_options) ? currentProgram.mission_options : [];
                            setVisionOptions(loadedVisionOptions);
                            setMissionOptions(loadedMissionOptions);
                            setVisionMissionPairs(buildVisionMissionPairs(loadedVisionOptions, loadedMissionOptions));
                            setVisionGenerationHistory(loadedVisionOptions);
                            setMissionGenerationHistory(loadedMissionOptions);

                            // Load saved priorities from used inputs if available, else fallback to vision_priorities
                            if (currentProgram.vision_inputs_used) {
                                setSelectedVisionPriorities(currentProgram.vision_inputs_used);
                                const customV = currentProgram.vision_inputs_used.filter((p: string) => !VISION_PRIORITIES.includes(p));
                                setCustomVisionPriorities(customV);
                            } else if (currentProgram.vision_priorities) {
                                setSelectedVisionPriorities(currentProgram.vision_priorities);
                                const customV = currentProgram.vision_priorities.filter((p: string) => !VISION_PRIORITIES.includes(p));
                                setCustomVisionPriorities(customV);
                            }

                            if (currentProgram.mission_inputs_used) {
                                setSelectedMissionPriorities(currentProgram.mission_inputs_used);
                                const customM = currentProgram.mission_inputs_used.filter((p: string) => !MISSION_PRIORITIES.includes(p));
                                setCustomMissionPriorities(customM);
                            } else if (currentProgram.mission_priorities) {
                                setSelectedMissionPriorities(currentProgram.mission_priorities);
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

    const handleGenerateVision = async () => {
        if (!institution || !program) return;

        if (selectedVisionPriorities.length === 0) {
            alert("Please select at least one vision priority.");
            return;
        }

        setGeneratingVision(true);
        try {
            const excludedVisions = mergeUniqueStatements(visionGenerationHistory, visionOptions);
            const excludedMissions = mergeUniqueStatements(missionGenerationHistory, missionOptions);
            const missionInputsForCoupled = selectedMissionPriorities.length > 0
                ? selectedMissionPriorities
                : selectedVisionPriorities;
            const response = await fetch(`${AI_API_URL}/ai/generate-vision-mission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'both',
                    program_name: program.program_name,
                    institute_vision: institution.vision || '',
                    institute_mission: institution.mission || '',
                    vision_inputs: selectedVisionPriorities,
                    mission_inputs: missionInputsForCoupled,
                    vision_count: visionGenerateCount,
                    mission_count: visionGenerateCount,
                    selected_program_vision: programVision || visionOptions[0] || '',
                    exclude_visions: excludedVisions,
                    exclude_missions: excludedMissions
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const apiPairs: VisionMissionPair[] = Array.isArray(data.pairs)
                    ? data.pairs
                        .map((item: any) => ({
                            vision: String(item?.vision || '').trim(),
                            mission: String(item?.mission || '').trim()
                        }))
                        .filter((item: VisionMissionPair) => item.vision && item.mission)
                    : [];

                const newVisions = apiPairs.length > 0
                    ? apiPairs.map((item: VisionMissionPair) => item.vision)
                    : (data.visions && data.visions.length > 0 ? data.visions : (data.vision ? [data.vision] : []));
                const newMissions = apiPairs.length > 0
                    ? apiPairs.map((item: VisionMissionPair) => item.mission)
                    : (data.missions && data.missions.length > 0 ? data.missions : (data.mission ? [data.mission] : []));

                const computedPairs = apiPairs.length > 0
                    ? apiPairs
                    : buildVisionMissionPairs(newVisions, newMissions);

                setVisionOptions(newVisions);
                setMissionOptions(newMissions);
                setVisionMissionPairs(computedPairs);
                setVisionGenerationHistory((previous) => mergeUniqueStatements(previous, newVisions));
                setMissionGenerationHistory((previous) => mergeUniqueStatements(previous, newMissions));

                if (newVisions.length > 0) {
                    const selectedVision = programVision && newVisions.includes(programVision)
                        ? programVision
                        : newVisions[0];
                    setProgramVision(selectedVision);

                    const pairedMission = computedPairs.find((item) => item.vision === selectedVision)?.mission;
                    if (pairedMission) {
                        setProgramMission(pairedMission);
                    } else if (!programMission && newMissions.length > 0) {
                        setProgramMission(newMissions[0]);
                    }
                } else if (!programMission && newMissions.length > 0) {
                    setProgramMission(newMissions[0]);
                }

                setIsAiGenerated(true);
            } else {
                alert(`Generation failed. Please ensure the AI backend is running at ${AI_API_URL}.`);
            }
        } catch (error) {
            console.error('Generation error:', error);
            alert('Failed to connect to AI backend. Please ensure it is running.');
        } finally {
            setGeneratingVision(false);
        }
    };

    const handleGenerateMissionOnly = async () => {
        if (!institution || !program) return;

        if (!canGenerateMission) {
            alert('Please generate or select a program vision before generating mission statements.');
            return;
        }

        if (selectedMissionPriorities.length === 0) {
            alert("Please select at least one mission priority.");
            return;
        }

        setGeneratingMission(true);
        try {
            const excludedMissions = mergeUniqueStatements(missionGenerationHistory, missionOptions);
            const response = await fetch(`${AI_API_URL}/ai/generate-vision-mission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'mission',
                    program_name: program.program_name,
                    institute_vision: institution.vision || '',
                    institute_mission: institution.mission || '',
                    selected_program_vision: programVision || visionOptions[0] || '',
                    vision_inputs: selectedVisionPriorities,
                    mission_inputs: selectedMissionPriorities,
                    mission_count: missionGenerateCount,
                    exclude_missions: excludedMissions
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const newMissions = data.missions && data.missions.length > 0 ? data.missions : (data.mission ? [data.mission] : []);
                setMissionOptions(newMissions);
                setVisionMissionPairs([]);
                setMissionGenerationHistory((previous) => mergeUniqueStatements(previous, newMissions));
                // Auto-select first option if none selected
                if (!programMission && newMissions.length > 0) setProgramMission(newMissions[0]);

            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || 'Mission generation failed. Please review inputs and try again.');
            }
        } catch (error) {
            console.error('Mission generation error:', error);
            alert('Failed to connect to AI backend. Please ensure it is running.');
        } finally {
            setGeneratingMission(false);
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
                    program_vision: programVision,
                    program_mission: programMission,
                    vision_inputs_used: selectedVisionPriorities,
                    mission_inputs_used: selectedMissionPriorities,
                    generated_by_ai: isAiGenerated,
                    vision_options: visionOptions,
                    mission_options: missionOptions
                })
            });

            if (response.ok) {
                alert('Vision, Mission, and Priorities saved successfully to the database!');
            } else {
                alert('Failed to save.');
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    const OptionCard = ({
        text,
        isSelected,
        onSelect,
        onEdit
    }: {
        text: string;
        isSelected: boolean;
        onSelect: () => void;
        onEdit: (val: string) => void;
    }) => (
        <div className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
            <div className="flex gap-3">
                <button
                    onClick={onSelect}
                    className={`mt-1 size-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 text-transparent hover:border-slate-400'}`}
                >
                    <Check className="size-3" />
                </button>
                <div className="flex-1 space-y-2">
                    <textarea
                        value={text}
                        onChange={(e) => onEdit(e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-sm focus:ring-0 resize-none"
                        rows={text.length > 100 ? 4 : 2}
                    />
                </div>
            </div>
        </div>
    );

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
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="size-5 text-amber-500" /> Program Vision
                    </h3>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Select Focus Areas</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {VISION_PRIORITIES.map(item => (
                            <button
                                key={item}
                                onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                                className={`h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${selectedVisionPriorities.includes(item)
                                        ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-transparent shadow-[0_0_0_2px_rgba(168,85,247,0.4)] text-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className={`shrink-0 size-4 rounded-full border-2 flex items-center justify-center ${selectedVisionPriorities.includes(item)
                                        ? 'bg-purple-500 border-purple-500'
                                        : 'border-slate-300'
                                    }`}>
                                    {selectedVisionPriorities.includes(item) && <div className="size-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="line-clamp-2">{item}</span>
                            </button>
                        ))}

                        {/* Custom Vision Priorities */}
                        {customVisionPriorities.map(item => (
                            <div key={item} className="relative group">
                                <button
                                    onClick={() => togglePriority(item, selectedVisionPriorities, setSelectedVisionPriorities)}
                                    className={`w-full h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${selectedVisionPriorities.includes(item)
                                            ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-transparent shadow-[0_0_0_2px_rgba(168,85,247,0.4)] text-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`shrink-0 size-4 rounded-full border-2 flex items-center justify-center ${selectedVisionPriorities.includes(item)
                                            ? 'bg-purple-500 border-purple-500'
                                            : 'border-slate-300'
                                        }`}>
                                        {selectedVisionPriorities.includes(item) && <div className="size-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="line-clamp-2 pr-6">{item}</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCustomVisionPriorities(prev => prev.filter(p => p !== item));
                                        setSelectedVisionPriorities(prev => prev.filter(p => p !== item));
                                    }}
                                    className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>
                        ))}

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

                <div className="flex gap-4 items-end">
                    <div className="w-48">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">No. of Vision Statements to be generated</label>
                        <select
                            value={visionGenerateCount}
                            onChange={(e) => setVisionGenerateCount(Number(e.target.value))}
                            className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                        >
                            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((count) => (
                                <option key={`vision-count-${count}`} value={count}>
                                    {count}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleGenerateVision}
                        disabled={generatingVision || selectedVisionPriorities.length === 0}
                        className="flex-1 h-12 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                    >
                        {generatingVision ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
                        Generate Vision + Mission
                    </button>
                </div>

                {/* Vision Options List */}
                {visionOptions.length > 0 && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Pick a Vision Statement</label>
                        <div className="space-y-3">
                            {visionOptions.map((opt, idx) => (
                                <OptionCard
                                    key={idx}
                                    text={opt}
                                    isSelected={programVision === opt}
                                    onSelect={() => {
                                        setProgramVision(opt);
                                        const pairedMission = visionMissionPairs[idx]?.mission;
                                        if (pairedMission) setProgramMission(pairedMission);
                                    }}
                                    onEdit={(newVal) => {
                                        const newOpts = [...visionOptions];
                                        newOpts[idx] = newVal;
                                        setVisionOptions(newOpts);
                                        if (visionMissionPairs[idx]) {
                                            const updatedPairs = [...visionMissionPairs];
                                            updatedPairs[idx] = { ...updatedPairs[idx], vision: newVal };
                                            setVisionMissionPairs(updatedPairs);
                                        }
                                        if (programVision === opt) setProgramVision(newVal);
                                    }}
                                />
                            ))}
                        </div>
                        {isAiGenerated && <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"><Sparkles className="size-3" /> Enhanced by AI</div>}
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-200" />

            {/* MISSION SECTION */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="size-5 text-blue-500" /> Program Mission
                    </h3>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Select Focus Areas</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {MISSION_PRIORITIES.map(item => (
                            <button
                                key={item}
                                onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                                className={`h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${selectedMissionPriorities.includes(item)
                                        ? 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-transparent shadow-[0_0_0_2px_rgba(59,130,246,0.4)] text-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className={`shrink-0 size-4 rounded-full border-2 flex items-center justify-center ${selectedMissionPriorities.includes(item)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-slate-300'
                                    }`}>
                                    {selectedMissionPriorities.includes(item) && <div className="size-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="line-clamp-2">{item}</span>
                            </button>
                        ))}

                        {/* Custom Mission Priorities */}
                        {customMissionPriorities.map(item => (
                            <div key={item} className="relative group">
                                <button
                                    onClick={() => togglePriority(item, selectedMissionPriorities, setSelectedMissionPriorities)}
                                    className={`w-full h-[52px] px-4 rounded-xl text-xs font-semibold transition-all border-2 text-left flex items-center gap-2 ${selectedMissionPriorities.includes(item)
                                            ? 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-transparent shadow-[0_0_0_2px_rgba(59,130,246,0.4)] text-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`shrink-0 size-4 rounded-full border-2 flex items-center justify-center ${selectedMissionPriorities.includes(item)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-slate-300'
                                        }`}>
                                        {selectedMissionPriorities.includes(item) && <div className="size-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="line-clamp-2 pr-6">{item}</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCustomMissionPriorities(prev => prev.filter(p => p !== item));
                                        setSelectedMissionPriorities(prev => prev.filter(p => p !== item));
                                    }}
                                    className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>
                        ))}

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
                                className="h-full aspect-square rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-30 flex items-center justify-center text-xl font-bold transition-all"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="w-48">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">No. of Mission Statements to be generated</label>
                        <select
                            value={missionGenerateCount}
                            onChange={(e) => setMissionGenerateCount(Number(e.target.value))}
                            className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        >
                            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((count) => (
                                <option key={`mission-count-${count}`} value={count}>
                                    {count}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleGenerateMissionOnly}
                        disabled={generatingMission || !canGenerateMission || selectedMissionPriorities.length === 0}
                        className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                    >
                        {generatingMission ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
                        Generate Draft Mission
                    </button>
                </div>
                {!canGenerateMission && (
                    <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Generate or select a program vision first to enable mission generation.
                    </p>
                )}

                {/* Mission Options List */}
                {missionOptions.length > 0 && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Pick a Mission Statement</label>
                        <div className="space-y-3">
                            {missionOptions.map((opt, idx) => (
                                <OptionCard
                                    key={idx}
                                    text={opt}
                                    isSelected={programMission === opt}
                                    onSelect={() => {
                                        setProgramMission(opt);
                                        const pairedVision = visionMissionPairs[idx]?.vision;
                                        if (pairedVision) setProgramVision(pairedVision);
                                    }}
                                    onEdit={(newVal) => {
                                        const newOpts = [...missionOptions];
                                        newOpts[idx] = newVal;
                                        setMissionOptions(newOpts);
                                        if (visionMissionPairs[idx]) {
                                            const updatedPairs = [...visionMissionPairs];
                                            updatedPairs[idx] = { ...updatedPairs[idx], mission: newVal };
                                            setVisionMissionPairs(updatedPairs);
                                        }
                                        if (programMission === opt) setProgramMission(newVal);
                                    }}
                                />
                            ))}
                        </div>
                        {isAiGenerated && <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"><Sparkles className="size-3" /> Derived from Program Vision</div>}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={handleSave}
                    disabled={saving || (!programVision && !programMission)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                >
                    {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                    Save Choices
                </button>
            </div>

            <div className="h-px bg-slate-200 my-8" />

            {/* PEO SECTION - Merged from PeoGenerator */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="size-5 text-indigo-500" /> Program Educational Objectives (PEOs)
                    </h3>
                </div>
                {/* Render PeoGenerator with context hidden as it's already shown above */}
                <PeoGenerator hideContext={true} isEmbedded={true} />
            </div>

        </div>
    );
}
