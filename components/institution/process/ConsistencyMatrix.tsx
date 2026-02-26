'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Loader2,
    Save,
    Sparkles,
    AlertCircle,
    Lock,
    Edit2,
    Printer,
    Grid,
    Info,
    ChevronRight,
    Target,
    FileText,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function ConsistencyMatrixContent() {
    const searchParams = useSearchParams();
    const programId = searchParams.get('programId');

    const [loading, setLoading] = useState(true);
    const [missionStatements, setMissionStatements] = useState<string[]>([]);
    const [peos, setPeos] = useState<any[]>([]);
    const [matrix, setMatrix] = useState<Record<string, string>>({}); // Key: "M-index_P-id", Value: "1"|"2"|"3"|"-"
    const [institution, setInstitution] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!programId) return;

            try {
                setLoading(true);
                // Fetch Program Details (for Mission & Matrix)
                const progResponse = await fetch(`/api/institution/details`);
                if (progResponse.ok) {
                    const data = await progResponse.json();
                    const currentProgram = data.programs.find((p: any) => p.id === programId);
                    if (currentProgram) {
                        const missionText = currentProgram.mission || '';
                        const missions = missionText.split(/(?=\d+\.)|(?=\n-)/).filter((m: string) => m.trim().length > 5).map((m: string) => m.replace(/^\d+\.|^-/, '').trim());
                        setMissionStatements(missions.length > 0 ? missions : (missionText ? [missionText] : []));

                        if (currentProgram.consistency_matrix) {
                            setMatrix(currentProgram.consistency_matrix);
                        }
                    }
                    setInstitution(data.institution);
                }

                // Fetch PEOs
                const peoResponse = await fetch(`/api/institution/peos?programId=${programId}`);
                if (peoResponse.ok) {
                    const peoData = await peoResponse.json();
                    setPeos(peoData.data || []);
                }

            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [programId]);

    const handleCellChange = (mIndex: number, pId: string, value: string) => {
        if (isLocked) return;
        setMatrix(prev => ({
            ...prev,
            [`${mIndex}_${pId}`]: value
        }));
    };

    const handleAutoFill = async () => {
        if (isLocked) return;
        setGenerating(true);
        try {
            const response = await fetch('/api/generate/consistency-matrix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    missions: missionStatements,
                    peos: peos.map(p => p.peo_statement)
                })
            });

            if (response.ok) {
                const data = await response.json();
                const newMatrix: Record<string, string> = { ...matrix };
                data.matrix.forEach((row: string[], mIdx: number) => {
                    row.forEach((val: string, pIdx: number) => {
                        if (peos[pIdx]) {
                            newMatrix[`${mIdx}_${peos[pIdx].id}`] = val;
                        }
                    });
                });
                setMatrix(newMatrix);
            }
        } catch (e) {
            console.error(e);
            alert('Auto-fill failed.');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/institution/program/consistency-matrix', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    program_id: programId,
                    consistency_matrix: matrix
                })
            });
            alert('Consistency Matrix saved!');
        } catch (e) {
            console.error(e);
            alert('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const content = `
      <html>
        <head>
          <title>Consistency Matrix - Mission vs PEOs</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; }
            h1 { text-align: center; color: #000; margin-bottom: 5px; text-transform: uppercase; font-size: 16pt; }
            h2 { text-align: center; color: #444; margin-top: 0; font-size: 12pt; margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; }
            th, td { border: 1px solid #000; padding: 10px; text-align: left; vertical-align: middle; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            .mission-col { width: 45%; }
            .peo-col { text-align: center; width: 8%; }
            .legend { margin-top: 30px; border-top: 1px solid #000; padding-top: 10px; font-size: 9pt; }
            .header-info { margin-bottom: 20px; font-size: 10pt; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Consistency Matrix</h1>
          <h2>Mission of the program vs Program Educational Objectives (PEOs)</h2>
          
          <div class="header-info">Date: ${new Date().toLocaleDateString()}</div>
          
          <table>
            <thead>
              <tr>
                <th class="mission-col">Mission Statements / PEOs</th>
                ${peos.map((_, i) => `<th class="peo-col">PEO ${i + 1}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${missionStatements.map((m, mIdx) => `
                <tr>
                  <td class="mission-col"><strong>M${mIdx + 1}:</strong> ${m}</td>
                  ${peos.map(peo => {
            const val = matrix[`${mIdx}_${peo.id}`] || '-';
            return `<td class="peo-col">${val}</td>`;
        }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="legend">
            <strong>Correlation Level:</strong> 1 - Slight (Low), 2 - Moderate (Medium), 3 - Substantial (High), "-" - No Correlation
          </div>
        </body>
      </html>
    `;
        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Loader2 className="size-10 animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-500 font-medium">Initialising Consistency Matrix...</p>
        </div>
    );

    if (!programId) return (
        <div className="flex flex-col items-center justify-center p-20 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="size-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm ring-8 ring-slate-100/50">
                <Lock className="size-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Program Not Selected</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">Please select a program from the dashboard to generate the Consistency Matrix.</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-element pb-20">

            {/* Header Card */}
            <div className="relative group rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="size-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Grid className="size-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Consistency Matrix</h2>
                            <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
                                Map Mission of the program to PEOs
                                <span className="inline-flex size-1.5 rounded-full bg-slate-300" />
                                Correlation mapping for institutional alignment
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isLocked ? (
                            <button
                                type="button"
                                onClick={() => setIsLocked(false)}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all uppercase tracking-wide"
                            >
                                <Edit2 className="size-3.5" /> Unlock to Edit
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                                <CheckCircle2 className="size-3" /> Live Editing
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Institute Mission Context */}
            {institution?.mission && (
                <div className="bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 border border-indigo-100/50 rounded-[2rem] p-8 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <Target className="size-32 -mr-12 -mt-12 text-indigo-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                                <Target className="size-4" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">Institutional Vision & Mission</h4>
                        </div>
                        <div className="max-w-4xl">
                            <p className="text-base font-bold text-slate-800 leading-relaxed italic">
                                "{institution.mission}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Matrix Table Section */}
            <div className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                                <th className="px-8 py-6 min-w-[350px]">
                                    <div className="flex items-center gap-2">
                                        <FileText className="size-4 text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mission of the program</span>
                                    </div>
                                </th>
                                {peos.map((peo, i) => (
                                    <th key={peo.id} className="px-6 py-6 text-center min-w-[120px] border-l border-slate-100/50">
                                        <div className="group/peo cursor-help relative inline-block">
                                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">PEO {i + 1}</div>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="size-2 rounded-full bg-indigo-500/20" />
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Mapped</span>
                                            </div>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="absolute inset-0 z-10" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-xs p-3 rounded-xl border-indigo-100 shadow-xl">
                                                        <p className="text-xs font-semibold leading-relaxed text-slate-700">{peo.peo_statement}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {missionStatements.length === 0 ? (
                                <tr>
                                    <td colSpan={peos.length + 1} className="py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <AlertCircle className="size-10 text-slate-300 mb-3" />
                                            <p className="text-slate-400 font-bold italic">No mission components found to map.</p>
                                            <p className="text-xs text-slate-400 mt-1">Please define the program mission in Step 6 first.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                missionStatements.map((mission, mIdx) => (
                                    <tr key={mIdx} className="hover:bg-slate-50/50 transition-colors group/row">
                                        <td className="px-8 py-5">
                                            <div className="flex gap-4">
                                                <div className="size-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 group-hover/row:bg-indigo-50 group-hover/row:text-indigo-600 transition-colors">
                                                    M{mIdx + 1}
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700 leading-relaxed pt-1.5">{mission}</p>
                                            </div>
                                        </td>
                                        {peos.map((peo) => (
                                            <td key={peo.id} className="px-6 py-5 border-l border-slate-50">
                                                <div className="flex justify-center">
                                                    <div className="relative group/select">
                                                        <select
                                                            disabled={isLocked}
                                                            value={matrix[`${mIdx}_${peo.id}`] || '-'}
                                                            onChange={(e) => handleCellChange(mIdx, peo.id, e.target.value)}
                                                            className={cn(
                                                                "w-16 h-10 text-center text-sm font-bold rounded-xl appearance-none cursor-pointer outline-none transition-all shadow-sm",
                                                                isLocked ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 active:scale-95"
                                                            )}
                                                        >
                                                            <option value="-">-</option>
                                                            <option value="1">1</option>
                                                            <option value="2">2</option>
                                                            <option value="3">3</option>
                                                        </select>
                                                        {!isLocked && (
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/select:opacity-100 transition-opacity">
                                                                <Info className="size-3 text-indigo-400 mr-2" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Info/Legend */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-200/60">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <AlertCircle className="size-4 text-indigo-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Legend</span>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                    {[
                        { l: '3', t: 'Substantial (High)' },
                        { l: '2', t: 'Moderate (Medium)' },
                        { l: '1', t: 'Slight (Low)' },
                        { l: '-', t: 'No Correlation' }
                    ].map(item => (
                        <div key={item.l} className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-600 w-4">{item.l}</span>
                            <span className="text-xs font-bold text-slate-600">{item.t}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] px-8 py-5 shadow-2xl flex items-center gap-6 ring-1 ring-slate-900/5 min-w-[600px] justify-between">
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6 mr-2">
                    <div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1.5">Correlation Progress</h5>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(Object.keys(matrix).filter(k => matrix[k] !== '-').length / (missionStatements.length * peos.length || 1) * 100, 100)}%` }}
                                    className="h-full bg-indigo-600 rounded-full"
                                />
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600">{Math.round(Object.keys(matrix).filter(k => matrix[k] !== '-').length / (missionStatements.length * peos.length || 1) * 100)}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleAutoFill}
                                    disabled={generating || peos.length === 0 || isLocked}
                                    className="group flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-[1.25rem] hover:bg-indigo-600 hover:text-white transition-all font-bold text-sm shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                    AI Fill
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-transparent">
                                <p className="text-xs font-bold">Use AI to suggest correlations based on content</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-[1.25rem] hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Save Matrix
                    </button>

                    <div className="h-8 w-px bg-slate-100 mx-1" />

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setIsLocked(!isLocked)}
                                    className={cn(
                                        "size-11 flex items-center justify-center rounded-full transition-all active:scale-90",
                                        isLocked ? "bg-red-50 text-red-600 border border-red-100" : "bg-white border border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600"
                                    )}
                                >
                                    {isLocked ? <Lock className="size-4" /> : <Edit2 className="size-4" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs font-bold">{isLocked ? 'Unlock Matrix' : 'Lock Consistency Matrix'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handlePrintPDF}
                                    className="size-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-90"
                                >
                                    <Printer className="size-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs font-bold">Print PDF Report</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}

export default function ConsistencyMatrix() {
    return (
        <Suspense fallback={
            <div className="flex flex-col justify-center items-center py-20">
                <Loader2 className="size-10 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-medium">Initialising Matrix...</p>
            </div>
        }>
            <ConsistencyMatrixContent />
        </Suspense>
    );
}
