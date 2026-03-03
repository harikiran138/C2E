"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
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
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import PeoPoMatrix from "./PeoPoMatrix";

const TIER_1_POS = [
  {
    code: "PO1",
    title: "Engineering Knowledge",
    description:
      "Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.",
  },
  {
    code: "PO2",
    title: "Problem Analysis",
    description:
      "Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences and engineering sciences.",
  },
  {
    code: "PO3",
    title: "Design/Development of Solutions",
    description:
      "Design solutions for complex engineering problems and design system components or processes that meet specified needs with appropriate societal, health, safety, cultural, and environmental considerations.",
  },
  {
    code: "PO4",
    title: "Conduct Investigations of Complex Problems",
    description:
      "Use research-based knowledge and research methods including design of experiments, analysis & interpretation of data, and synthesis to arrive at valid conclusions.",
  },
  {
    code: "PO5",
    title: "Engineering Tool Usage",
    description:
      "Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools (including prediction and modelling) to complex engineering activities with an understanding of limitations.",
  },
  {
    code: "PO6",
    title: "Engineer & Society",
    description:
      "Analyze and evaluate societal and environmental aspects while solving complex engineering problems for its impact on sustainability, economy, health, safety, legal framework, culture, and environment.",
  },
  {
    code: "PO7",
    title: "Environment & Sustainability",
    description:
      "Understand the impact of professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for, sustainable development.",
  },
  {
    code: "PO8",
    title: "Ethics",
    description:
      "Apply ethical principles and commit to professional ethics, human values, diversity and inclusion; adhere to national & international laws.",
  },
  {
    code: "PO9",
    title: "Individual & Team Work",
    description:
      "Function effectively as an individual, and as a member or leader in diverse teams and multidisciplinary settings, with focus on inclusivity.",
  },
  {
    code: "PO10",
    title: "Communication",
    description:
      "Communicate effectively on complex engineering activities with the engineering community and society at large — including comprehension and written reports, presentations, and clear instructions.",
  },
  {
    code: "PO11",
    title: "Project Management & Finance",
    description:
      "Demonstrate knowledge and understanding of engineering and management principles and apply these to one’s own work as a member and leader in a team to manage projects in multidisciplinary environments.",
  },
  {
    code: "PO12",
    title: "Life-Long Learning",
    description:
      "Recognize the need for, and ability to engage in, independent and lifelong learning in the context of technological change, adaptability and continued relevance.",
  },
];

const TIER_2_POS = [
  {
    code: "PO1",
    title: "Engineering Knowledge",
    description:
      "Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.",
  },
  {
    code: "PO2",
    title: "Problem Analysis",
    description:
      "Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.",
  },
  {
    code: "PO3",
    title: "Design/Development of Solutions",
    description:
      "Design solutions for complex engineering problems and design system components or processes that meet specified needs with appropriate consideration for public health and safety, cultural, societal, and environmental considerations.",
  },
  {
    code: "PO4",
    title: "Conduct Investigations",
    description:
      "Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of information to provide valid conclusions.",
  },
  {
    code: "PO5",
    title: "Engineering Tool Usage",
    description:
      "Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools (including prediction and modeling) to complex engineering activities, with an understanding of the limitations.",
  },
  {
    code: "PO6",
    title: "Engineer & Society",
    description:
      "Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal, and cultural issues and the consequent responsibilities relevant to professional engineering practice.",
  },
  {
    code: "PO7",
    title: "Environment & Sustainability",
    description:
      "Understand the impact of professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for, sustainable development.",
  },
  {
    code: "PO8",
    title: "Ethics",
    description:
      "Apply ethical principles and commit to professional ethics and responsibilities and norms of engineering practice.",
  },
  {
    code: "PO9",
    title: "Individual & Team Work",
    description:
      "Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.",
  },
  {
    code: "PO10",
    title: "Communication",
    description:
      "Communicate effectively on complex engineering activities with the engineering community and with society at large, such as being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.",
  },
  {
    code: "PO11",
    title: "Project Management & Finance",
    description:
      "Demonstrate knowledge and understanding of engineering and management principles and apply these to one’s own work, as a member and leader in a team, to manage projects and in multidisciplinary environments.",
  },
  {
    code: "PO12",
    title: "Life-Long Learning",
    description:
      "Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.",
  },
];

function UnifiedOutcomesMatrixContent() {
  const searchParams = useSearchParams();
  const programId = searchParams?.get("programId");

  const [loading, setLoading] = useState(true);
  const [missionStatements, setMissionStatements] = useState<string[]>([]);
  const [peos, setPeos] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string>>({});
  const [institution, setInstitution] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [generatingMatrix, setGeneratingMatrix] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Program Outcomes State
  const [tier, setTier] = useState<"TIER_1" | "TIER_2" | null>(null);
  const [currentPOs, setCurrentPOs] = useState<any[]>([]);
  const [showMatrix, setShowMatrix] = useState(false);
  const [showPOs, setShowPOs] = useState(false);
  const [showPeoPoMapping, setShowPeoPoMapping] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!programId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching unified data for program:", programId);

        // Fetch Program Details (for Mission & Matrix & POs)
        const progResponse = await fetch(`/api/institution/details`);
        if (!progResponse.ok)
          throw new Error(`Details API error: ${progResponse.status}`);

        const data = await progResponse.json();
        const currentProgram = data.programs?.find(
          (p: any) => String(p.id) === String(programId),
        );

        if (currentProgram) {
          const missionText = currentProgram.mission || "";
          const missions = missionText
            .split(/(?=\d+\.)|(?=\n-)/)
            .filter((m: string) => m.trim().length > 5)
            .map((m: string) => m.replace(/^\d+\.|^-/, "").trim());
          setMissionStatements(
            missions.length > 0 ? missions : missionText ? [missionText] : [],
          );

          if (currentProgram.consistency_matrix) {
            setMatrix(currentProgram.consistency_matrix || {});
          }
        }
        setInstitution(data.institution || {});

        // Fetch PEOs
        const peoResponse = await fetch(
          `/api/institution/peos?programId=${programId}`,
        );
        if (peoResponse.ok) {
          const peoData = await peoResponse.json();
          setPeos(peoData.data || []);
        }

        // Fetch Program Outcomes
        const poResponse = await fetch(
          `/api/institution/program-outcomes?programId=${programId}`,
        );
        if (poResponse.ok) {
          const poData = await poResponse.json();
          if (poData.tier) {
            setTier(poData.tier);
            if (poData.data && poData.data.length > 0) {
              setCurrentPOs(poData.data);
            } else {
              setCurrentPOs(poData.tier === "TIER_1" ? TIER_1_POS : TIER_2_POS);
            }
            setShowPOs(true);
          }
        }
      } catch (error: any) {
        console.error("UnifiedOutcomesMatrix Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId]);

  const handleCellChange = (mIndex: number, pId: string, value: string) => {
    if (isLocked) return;
    setMatrix((prev) => ({
      ...prev,
      [`${mIndex}_${pId}`]: value,
    }));
  };

  const handleAutoFillMatrix = async () => {
    if (isLocked) return;
    setGeneratingMatrix(true);
    try {
      const response = await fetch("/api/generate/consistency-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missions: missionStatements,
          peos: peos.map((p) => p.peo_statement),
        }),
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
      alert("Auto-fill failed.");
    } finally {
      setGeneratingMatrix(false);
    }
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      await fetch("/api/institution/program/consistency-matrix", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          consistency_matrix: matrix,
        }),
      });
      alert("Consistency Matrix saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleTierChange = (selectedTier: "TIER_1" | "TIER_2") => {
    setTier(selectedTier);
    setCurrentPOs(selectedTier === "TIER_1" ? TIER_1_POS : TIER_2_POS);
  };

  const handleSavePOs = async () => {
    if (!programId || !tier) return;
    setSaving(true);
    try {
      const response = await fetch("/api/institution/program-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          tier: tier,
          pos: currentPOs,
        }),
      });

      if (response.ok) {
        alert("Program Outcomes saved successfully!");
      } else {
        alert("Failed to save POs.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving POs.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="size-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Initialising Section...</p>
      </div>
    );

  if (!programId)
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
        <div className="size-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm ring-8 ring-slate-100/50">
          <Lock className="size-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Program Not Selected
        </h3>
        <p className="text-slate-500 max-w-sm mt-2 font-medium">
          Please select a program from the dashboard to continue.
        </p>
      </div>
    );

  return (
    <TooltipProvider>
      <div className="space-y-12 animate-element pb-20 max-w-6xl mx-auto">
        {/* 1. Consistency Matrix Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Grid className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Consistency Matrix of Mission & PEOs
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Map Mission of the program to Program Educational Objectives
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              {showMatrix ? "Hide Matrix" : "Generate Consistency Matrix"}
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  showMatrix && "rotate-90",
                )}
              />
            </button>
          </div>

          {showMatrix && (
            <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                      <th className="px-8 py-6 min-w-[350px]">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Mission of the program
                          </span>
                        </div>
                      </th>
                      {peos.map((peo, i) => (
                        <th
                          key={peo.id || i}
                          className="px-6 py-6 text-center min-w-[100px] border-l border-slate-100/50"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                                  PEO {i + 1}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs p-3">
                              <p className="text-xs font-semibold">
                                {peo.peo_statement}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {missionStatements.map((mission, mIdx) => (
                      <tr
                        key={mIdx}
                        className="hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="flex gap-4">
                            <div className="size-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                              M{mIdx + 1}
                            </div>
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                              {mission}
                            </p>
                          </div>
                        </td>
                        {peos.map((peo) => (
                          <td
                            key={peo.id}
                            className="px-4 py-5 border-l border-slate-50"
                          >
                            <div className="flex justify-center">
                              <select
                                disabled={isLocked}
                                value={matrix[`${mIdx}_${peo.id}`] || "-"}
                                onChange={(e) =>
                                  handleCellChange(mIdx, peo.id, e.target.value)
                                }
                                className={cn(
                                  "w-14 h-9 text-center text-xs font-bold rounded-lg border outline-none transition-all",
                                  isLocked
                                    ? "bg-slate-50 border-slate-100 text-slate-400"
                                    : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500",
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
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-6">
                  {[
                    { l: "3", t: "High" },
                    { l: "2", t: "Medium" },
                    { l: "1", t: "Low" },
                    { l: "-", t: "N/A" },
                  ].map((item) => (
                    <div key={item.l} className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-600">
                        {item.l}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {item.t}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAutoFillMatrix}
                    disabled={generatingMatrix || isLocked}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-bold text-xs disabled:opacity-50"
                  >
                    {generatingMatrix ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    AI Auto-Fill
                  </button>
                  <button
                    onClick={handleSaveMatrix}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-xs"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Matrix
                  </button>
                  <button
                    onClick={() => setIsLocked(!isLocked)}
                    className={cn(
                      "size-9 flex items-center justify-center rounded-xl transition-all",
                      isLocked
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-white border border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600",
                    )}
                  >
                    {isLocked ? (
                      <Lock className="size-4" />
                    ) : (
                      <Edit2 className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Program Outcomes Section */}
        <section className="space-y-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <ListChecks className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Generate Program Outcomes
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Define measurable outcomes for the selected accreditation tier
                </p>
              </div>
            </div>
            {!showPOs && (
              <button
                onClick={() => setShowPOs(true)}
                className="px-6 py-2.5 bg-emerald-600 rounded-xl text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
              >
                Generate Program Outcomes
              </button>
            )}
          </div>

          {showPOs && (
            <div className="space-y-8">
              {/* Tier Selection */}
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60">
                <div className="flex flex-col sm:flex-row gap-6">
                  <label
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all flex-1 shadow-sm",
                      tier === "TIER_1"
                        ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-50"
                        : "bg-white border-slate-200 hover:border-indigo-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="TIER_1"
                      checked={tier === "TIER_1"}
                      onChange={() => handleTierChange("TIER_1")}
                      className="hidden"
                    />
                    <div
                      className={cn(
                        "size-6 rounded-full border-2 flex items-center justify-center",
                        tier === "TIER_1" ? "border-white" : "border-slate-300",
                      )}
                    >
                      {tier === "TIER_1" && (
                        <div className="size-3 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span
                        className={cn(
                          "block font-bold text-base",
                          tier === "TIER_1" ? "text-white" : "text-slate-900",
                        )}
                      >
                        Tier I
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold opacity-80",
                          tier === "TIER_1"
                            ? "text-indigo-50"
                            : "text-slate-500",
                        )}
                      >
                        Include SDGs and Washington Accord (WK)
                      </span>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all flex-1 shadow-sm",
                      tier === "TIER_2"
                        ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-50"
                        : "bg-white border-slate-200 hover:border-indigo-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="TIER_2"
                      checked={tier === "TIER_2"}
                      onChange={() => handleTierChange("TIER_2")}
                      className="hidden"
                    />
                    <div
                      className={cn(
                        "size-6 rounded-full border-2 flex items-center justify-center",
                        tier === "TIER_2" ? "border-white" : "border-slate-300",
                      )}
                    >
                      {tier === "TIER_2" && (
                        <div className="size-3 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span
                        className={cn(
                          "block font-bold text-base",
                          tier === "TIER_2" ? "text-white" : "text-slate-900",
                        )}
                      >
                        Tier II
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold opacity-80",
                          tier === "TIER_2"
                            ? "text-indigo-50"
                            : "text-slate-500",
                        )}
                      >
                        Standard Program Outcomes
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Content Display */}
              {tier && (
                <div className="space-y-10">
                  {tier === "TIER_1" && (
                    <div className="space-y-12 py-4">
                      <div className="flex flex-col items-center gap-12">
                        <div className="w-full relative aspect-[16/9] max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                          <Image
                            src="/assets/po/image1.png"
                            alt="PO Context 1"
                            fill
                            className="object-contain bg-white"
                            priority
                          />
                        </div>
                        <div className="w-full relative aspect-[16/9] max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                          <Image
                            src="/assets/po/image2.png"
                            alt="PO Context 2"
                            fill
                            className="object-contain bg-white"
                          />
                        </div>
                        <div className="w-full relative aspect-[16/9] max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                          <Image
                            src="/assets/po/image3.png"
                            alt="PO Context 3"
                            fill
                            className="object-contain bg-white"
                          />
                        </div>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        Program Outcomes{" "}
                        <span className="text-indigo-600">PO1 – PO12</span>
                      </h3>
                      <button
                        onClick={handleSavePOs}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Finalise & Save POs
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {currentPOs.map((po, index) => (
                        <div
                          key={index}
                          className="group p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
                        >
                          <div className="flex gap-6">
                            <div className="relative">
                              <div className="size-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                {po.code || po.po_code}
                              </div>
                              <div className="absolute -bottom-1 -right-1 size-4 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <CheckCircle2 className="size-3 text-emerald-500" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-extrabold text-slate-900 text-base tracking-tight">
                                {po.title || po.po_title}
                              </h4>
                              <p className="text-sm font-medium text-slate-500 leading-relaxed text-justify max-w-4xl">
                                {po.description || po.po_description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. PEO to PO Mapping Section */}
        <section className="space-y-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <Target className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  PEO to PO Mapping Matrix
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Map Program Educational Objectives to Outcomes
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPeoPoMapping(!showPeoPoMapping)}
              className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              {showPeoPoMapping ? "Hide Mapping" : "Show PEO-PO Mapping"}
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  showPeoPoMapping && "rotate-90",
                )}
              />
            </button>
          </div>

          {showPeoPoMapping && <PeoPoMatrix />}
        </section>
      </div>
    </TooltipProvider>
  );
}

export default function UnifiedOutcomesMatrix() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="size-10 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500 font-medium">Initialising Section...</p>
        </div>
      }
    >
      <UnifiedOutcomesMatrixContent />
    </Suspense>
  );
}
