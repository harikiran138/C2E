"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  CheckCircle2,
  Target,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

function PeoPoMatrixContent() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(true);
  const [peos, setPeos] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string>>({}); // Key: "P-id_PO-code", Value: "1"|"2"|"3"|"-"
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!programId) return;

      try {
        setLoading(true);

        // Fetch all data concurrently
        const [detailsRes, peoRes, poRes] = await Promise.all([
          fetch(`/api/institution/details`),
          fetch(`/api/institution/peos?programId=${programId}`),
          fetch(`/api/institution/program-outcomes?programId=${programId}`),
        ]);

        // 1. Process Program Details (for Matrix)
        if (detailsRes.ok) {
          const data = await detailsRes.json();
          const currentProgram = data.programs.find(
            (p: any) => p.id === programId,
          );
          if (currentProgram?.peo_po_matrix) {
            setMatrix(currentProgram.peo_po_matrix);
          }
        }

        // 2. Process PEOs
        if (peoRes.ok) {
          const peoData = await peoRes.json();
          setPeos(peoData.data || []);
        }

        // 3. Process POs
        if (poRes.ok) {
          const poData = await poRes.json();
          setPos(poData.data || []);
        }
      } catch (error) {
        console.error("Failed to load PEO-PO data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId]);

  const handleCellChange = (peoId: string, poCode: string, value: string) => {
    if (isLocked) return;
    setMatrix((prev) => ({
      ...prev,
      [`${peoId}_${poCode}`]: value,
    }));
  };

  const handleAutoFill = async () => {
    if (isLocked || peos.length === 0 || pos.length === 0) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/generate/peo-po-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peos: peos.map((p) => p.peo_statement),
          pos: pos.map((p) => ({
            po_code: p.po_code,
            po_description: p.po_description,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMatrix: Record<string, string> = { ...matrix };
        data.matrix.forEach((row: string[], peoIdx: number) => {
          row.forEach((val: string, poIdx: number) => {
            if (peos[peoIdx] && pos[poIdx]) {
              newMatrix[`${peos[peoIdx].id}_${pos[poIdx].po_code}`] = val;
            }
          });
        });
        setMatrix(newMatrix);
      }
    } catch (e) {
      console.error(e);
      alert("AI generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/institution/program/peo-po-matrix", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          peo_po_matrix: matrix,
        }),
      });
      if (res.ok) alert("PEO-PO Mapping Matrix saved!");
      else throw new Error("Failed to save");
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="size-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">
          Initialising PEO-PO Mapping...
        </p>
      </div>
    );

  return (
    <div className="space-y-8 animate-element pb-20">
      {/* Header Card */}
      <div className="relative group rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="size-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Target className="size-7" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                PEO to PO Mapping
              </h2>
              <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
                Map PEOs to Program Outcomes
                <span className="inline-flex size-1.5 rounded-full bg-slate-300" />
                Essential for OBE Accreditation (NBA Annexure)
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
                <Edit2 className="size-3.5" /> Unlock Matrix
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 className="size-3" /> Enabled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Matrix Table Section */}
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                <th className="px-8 py-6 min-w-[300px]">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      PEOs / Outcomes
                    </span>
                  </div>
                </th>
                {pos.map((po, i) => (
                  <th
                    key={po.id}
                    className="px-4 py-6 text-center min-w-[80px] border-l border-slate-100/50"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help cursor-pointer">
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                              {po.po_code}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs p-3 rounded-xl border-indigo-100 shadow-xl"
                        >
                          <p className="text-xs font-semibold leading-relaxed text-slate-700">
                            {po.po_description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {peos.length === 0 ? (
                <tr>
                  <td colSpan={pos.length + 1} className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="size-10 text-slate-300 mb-3" />
                      <p className="text-slate-400 font-bold italic">
                        No PEOs found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                peos.map((peo, peoIdx) => (
                  <tr
                    key={peo.id}
                    className="hover:bg-slate-50/50 transition-colors group/row"
                  >
                    <td className="px-8 py-5">
                      <div className="flex gap-4">
                        <div className="size-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 group-hover/row:bg-indigo-50 group-hover/row:text-indigo-600 transition-colors">
                          PEO {peoIdx + 1}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 leading-relaxed pt-1.5 truncate max-w-[250px]">
                          {peo.peo_statement}
                        </p>
                      </div>
                    </td>
                    {pos.map((po) => (
                      <td
                        key={po.id}
                        className="px-2 py-5 border-l border-slate-50"
                      >
                        <div className="flex justify-center">
                          <select
                            disabled={isLocked}
                            value={matrix[`${peo.id}_${po.po_code}`] || "-"}
                            onChange={(e) =>
                              handleCellChange(
                                peo.id,
                                po.po_code,
                                e.target.value,
                              )
                            }
                            className={cn(
                              "w-14 h-9 text-center text-xs font-bold rounded-lg appearance-none cursor-pointer outline-none transition-all",
                              isLocked
                                ? "bg-slate-50 border-slate-100 text-slate-400"
                                : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500 hover:border-slate-300",
                            )}
                          >
                            <option value="-">-</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-200/60">
        <div className="flex items-center gap-3 shrink-0">
          <Info className="size-4 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Mapping Scale
          </span>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {[
            { l: "3", t: "High" },
            { l: "2", t: "Medium" },
            { l: "1", t: "Low" },
            { l: "-", t: "Not Mapped" },
          ].map((item) => (
            <div key={item.l} className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600">
                {item.l}
              </span>
              <span className="text-xs font-bold text-slate-600">{item.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-10">
        <button
          onClick={handleAutoFill}
          disabled={
            generating || peos.length === 0 || pos.length === 0 || isLocked
          }
          className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-bold text-sm disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate with AI
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-lg disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Mapping
        </button>
      </div>
    </div>
  );
}

export default function PeoPoMatrix() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">Loading...</div>
      }
    >
      <PeoPoMatrixContent />
    </Suspense>
  );
}
