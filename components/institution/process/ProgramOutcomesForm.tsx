"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Save, Sparkles, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PO_PRIORITIES = [
  "Technical Excellence",
  "Professional Ethics",
  "Social & Environmental Impact",
  "Modern Tool Usage",
  "Teamwork & Leadership",
  "Lifelong Learning Skills",
  "Complex Problem Solving",
  "Project Management",
];

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
    title: "The Engineer and The World",
    description:
      "Analyze and evaluate societal and environmental aspects while solving complex engineering problems for its impact on sustainability, economy, health, safety, legal framework, culture, and environment.",
  },
  {
    code: "PO7",
    title: "Ethics",
    description:
      "Apply ethical principles and commit to professional ethics, human values, diversity and inclusion; adhere to national & international laws.",
  },
  {
    code: "PO8",
    title: "Individual and Collaborative Team Work",
    description:
      "Function effectively as an individual, and as a member or leader in diverse teams and multidisciplinary settings, with focus on inclusivity.",
  },
  {
    code: "PO9",
    title: "Communication",
    description:
      "Communicate effectively on complex engineering activities with the engineering community and society at large — including comprehension and written reports, presentations, and clear instructions.",
  },
  {
    code: "PO10",
    title: "Project Management and Finance",
    description:
      "Demonstrate knowledge and understanding of engineering and management principles and apply these to one’s own work as a member and leader in a team to manage projects in multidisciplinary environments.",
  },
  {
    code: "PO11",
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
    title: "Design / Development of Solutions",
    description:
      "Design solutions for complex engineering problems and design system components or processes that meet specified needs with appropriate consideration for public health and safety, cultural, societal, and environmental considerations.",
  },
  {
    code: "PO4",
    title: "Conduct Investigations of Complex Problems",
    description:
      "Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of information to provide valid conclusions.",
  },
  {
    code: "PO5",
    title: "Modern Tool Usage",
    description:
      "Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools (including prediction and modeling) to complex engineering activities, with an understanding of the limitations.",
  },
  {
    code: "PO6",
    title: "The Engineer and Society",
    description:
      "Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal, and cultural issues and the consequent responsibilities relevant to professional engineering practice.",
  },
  {
    code: "PO7",
    title: "Environment and Sustainability",
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
    title: "Individual and Team Work",
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
    title: "Project Management and Finance",
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

export default function ProgramOutcomesForm() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tier, setTier] = useState<"TIER_1" | "TIER_2" | null>(null);
  const [currentPOs, setCurrentPOs] = useState<any[]>([]);
  const [program, setProgram] = useState<any>(null);

  // AI Generator State
  const [generating, setGenerating] = useState(false);
  const [poCount, setPoCount] = useState(3);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [generatedPOs, setGeneratedPOs] = useState<any[]>([]);
  const [generatedQuality, setGeneratedQuality] = useState<any[]>([]);

  useEffect(() => {
    if (!programId) return;
    const fetchProg = async () => {
      const resp = await fetch(`/api/institution/programs/${programId}`);
      if (resp.ok) {
        const d = await resp.json();
        setProgram(d.data);
      }
    };
    fetchProg();
  }, [programId]);

  useEffect(() => {
    // Reset state when programId changes
    setTier(null);
    setCurrentPOs([]);

    if (!programId) return;
    const fetchPOs = async () => {
      try {
        const response = await fetch(
          `/api/institution/program-outcomes?programId=${programId}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.tier) {
            setTier(data.tier);
            // If DB has POs, use them, else load static based on tier
            if (data.data && data.data.length > 0) {
              setCurrentPOs(data.data);
            } else {
              setCurrentPOs(data.tier === "TIER_1" ? TIER_1_POS : TIER_2_POS);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch POs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, [programId]);

  const togglePriority = (p: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(p) ? prev.filter((i) => i !== p) : [...prev, p],
    );
  };

  const handleGeneratePOs = async () => {
    if (!program || selectedPriorities.length === 0) return;
    setGenerating(true);
    setGeneratedPOs([]);

    try {
      const response = await fetch("/api/generate/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programName: program.name,
          institutionName: program.institution_name || "Institution",
          priorities: selectedPriorities,
          count: poCount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPOs(data.pos || []);
        setGeneratedQuality(data.ranked || []);
      }
    } catch (error) {
      console.error("AI PO Generation Error:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddGeneratedPO = (newPO: any) => {
    // Add to currentPOs with correct code
    const nextNum = currentPOs.length + 1;
    const addedPO = {
      ...newPO,
      code: `PO${nextNum}`,
      id: `temp-${Date.now()}`
    };
    setCurrentPOs([...currentPOs, addedPO]);
  };

  const handleDeletePO = (index: number) => {
    const updated = currentPOs.filter((_, i) => i !== index);
    // Re-code remaining POs
    const reCoded = updated.map((po, i) => ({
      ...po,
      code: `PO${i + 1}`
    }));
    setCurrentPOs(reCoded);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all outcomes?")) {
      setCurrentPOs([]);
    }
  };

  const handleTierChange = (selectedTier: "TIER_1" | "TIER_2") => {
    setTier(selectedTier);
    setCurrentPOs(selectedTier === "TIER_1" ? TIER_1_POS : TIER_2_POS);
  };

  const handleSave = async () => {
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
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary size-8" />
      </div>
    );
  if (!programId)
    return (
      <div className="p-8 text-center text-slate-500">
        Please select a program first.
      </div>
    );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Select Accreditation Tier
        </h3>
        <div className="flex flex-col sm:flex-row gap-6">
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all flex-1 ${tier === "TIER_1" ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white border-slate-200 hover:border-slate-300"}`}
          >
            <input
              type="radio"
              name="tier"
              value="TIER_1"
              checked={tier === "TIER_1"}
              onChange={() => handleTierChange("TIER_1")}
              className="text-indigo-600 focus:ring-indigo-500 size-4"
            />
            <div>
              <span className="block font-bold text-slate-900">Tier I</span>
              <span className="text-xs text-slate-500">
                Includes SDGs and Washington Accord Attributes
              </span>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all flex-1 ${tier === "TIER_2" ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white border-slate-200 hover:border-slate-300"}`}
          >
            <input
              type="radio"
              name="tier"
              value="TIER_2"
              checked={tier === "TIER_2"}
              onChange={() => handleTierChange("TIER_2")}
              className="text-indigo-600 focus:ring-indigo-500 size-4"
            />
            <div>
              <span className="block font-bold text-slate-900">Tier II</span>
              <span className="text-xs text-slate-500">
                Standard Program Outcomes
              </span>
            </div>
          </label>
        </div>
      </div>

      {tier && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* AI Generator Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-8 -mt-8 opacity-50" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles className="size-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">AI Architect</h2>
            </div>

            <div className="space-y-5 relative z-10">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">
                  Outcome Focus Areas
                </label>
                <div className="flex flex-wrap gap-2">
                  {PO_PRIORITIES.map((item) => (
                    <button
                      key={item}
                      onClick={() => togglePriority(item)}
                      className={`
                        px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all
                        ${selectedPriorities.includes(item)
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                          : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                        }
                      `}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-3 pt-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">
                    No. of Outcomes
                  </label>
                  <select
                    value={poCount}
                    onChange={(e) => setPoCount(Number(e.target.value))}
                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold px-3 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} Outcome{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGeneratePOs}
                  disabled={generating || selectedPriorities.length === 0}
                  className="flex-[2] h-10 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                >
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  <span>Generate Suggestions</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {generatedPOs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 pt-6 border-t border-slate-100 space-y-4"
                >
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Suggested Outcomes</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {generatedPOs.map((po, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all relative"
                        onClick={() => handleAddGeneratedPO(po)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Draft {i + 1}</span>
                          <Plus className="size-4 text-indigo-400 group-hover:text-indigo-600" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">{po.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{po.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {tier === "TIER_1" && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-700">
                Tier I Reference Context
              </h4>
              <div className="grid grid-cols-1 gap-6">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <Image
                    src="/assets/po/image1.png"
                    alt="Tier I context image 1"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <Image
                    src="/assets/po/image2.png"
                    alt="Tier I context image 2"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <Image
                    src="/assets/po/image3.png"
                    alt="Tier I context image 3"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              Program Outcomes ({tier === "TIER_1" ? "Tier I" : "Tier II"})
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Trash2 className="size-4" />
                Clear All
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Outcomes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {currentPOs.map((po, index) => (
              <div
                key={index}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg text-sm h-fit shrink-0 border border-indigo-100">
                    {po.code || po.po_code}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">
                        {po.title || po.po_title}
                      </h4>
                      <button 
                        onClick={() => handleDeletePO(index)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete outcome"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed text-justify">
                      {po.description || po.po_description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
