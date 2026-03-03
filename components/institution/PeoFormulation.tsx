"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

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
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const [generatedSets, setGeneratedSets] = useState<string[][]>([]);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);
  const [finalPeos, setFinalPeos] = useState<PeoData[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchPrograms = async () => {
      const sessionData = localStorage.getItem("inst_session");
      if (!sessionData) {
        router.push("/institution/login");
        return;
      }

      const session = JSON.parse(sessionData);
      const sessionUserId = session.id;

      const { data } = await supabase
        .from("programs")
        .select("id, name")
        .eq("institution_id", sessionUserId);
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
          "Maintain highest ethical standards in professional delivery.",
        ],
        [
          "Lead multidisciplinary teams with ethical responsibility and global awareness.",
          "Apply advanced computational methods to solve societal challenges.",
          "Foster sustainable development through green engineering practices.",
        ],
        [
          "Identify, formulate, and solve complex engineering problems.",
          "Communicate effectively with engineering community and society.",
          "Engage in lifelong learning and professional development.",
        ],
        [
          "Design solutions for complex engineering problems with safety considerations.",
          "Use research-based knowledge to provide valid conclusions.",
          "Create, select, and apply appropriate techniques and tools.",
        ],
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
      visionAlign: "",
      stakeholderAlign: "",
    }));
    setFinalPeos(peos);
  };

  const cleanPercentage = (val: string) => {
    if (val === "") return "";
    const num = parseInt(val);
    if (isNaN(num)) return "";
    if (num < 0) return "0";
    if (num > 100) return "100";
    return num.toString();
  };

  const updatePeoData = (
    id: number,
    field: "visionAlign" | "stakeholderAlign",
    value: string,
  ) => {
    const cleanValue = cleanPercentage(value);
    setFinalPeos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: cleanValue } : p)),
    );
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

      // Delete existing PEOs for this program to overwrite
      await supabase.from("peos").delete().eq("program_id", selectedProgramId);

      const { error } = await supabase.from("peos").insert(
        finalPeos.map((p, idx) => ({
          program_id: selectedProgramId,
          peo_code: `PEO-${(idx + 1).toString().padStart(2, "0")}`,
          statement: p.text,
        })),
      );

      if (error) throw error;
      alert(`PEOs ${isFinal ? "finalized" : "draft saved"} successfully!`);
    } catch (error: any) {
      console.error("Error saving PEOs:", error);
      alert("Error saving PEOs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              PEO Formulation
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Define Program Educational Objectives using AI assistance.
            </p>
          </div>
          <button
            onClick={() => router.push("/institution/dashboard")}
            className="text-sm font-semibold text-[#137fec] hover:underline"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Program Selection Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
            Select Program
          </label>
          <select
            value={selectedProgramId || ""}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none transition-all"
          >
            {programs.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Generator Section */}
        {generatedSets.length === 0 ? (
          <div className="bg-[#137fec]/5 rounded-2xl p-8 border border-[#137fec]/20 text-center">
            <div className="size-16 bg-[#137fec]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#137fec]">
              <span className="material-symbols-outlined text-3xl">
                auto_awesome
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              AI PEO Generator
            </h3>
            <p className="text-slate-500 max-w-lg mx-auto mb-6">
              Select a program to automatically generate suggested PEOs based on
              standard accreditation criteria.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center gap-2 mx-auto disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>{" "}
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">
                    auto_awesome
                  </span>{" "}
                  Generate Suggestions
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Generated Sets Selection */}
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Suggested PEO Sets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedSets.map((set, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSet(idx)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedSetIndex === idx ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200"}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className={`font-bold uppercase text-xs tracking-wider px-2 py-1 rounded ${selectedSetIndex === idx ? "bg-blue-100 text-[#137fec]" : "bg-slate-100 text-slate-500"}`}
                    >
                      Option {idx + 1}
                    </span>
                    {selectedSetIndex === idx && (
                      <span className="material-symbols-outlined text-[#137fec]">
                        check_circle
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {set.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600 dark:text-slate-300 flex gap-2"
                      >
                        <span className="text-[#137fec] font-bold">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Refinement & Finalization */}
            {selectedSetIndex !== null && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                  Refine & Finalize
                </h3>
                <div className="space-y-6">
                  {finalPeos.map((peo, idx) => (
                    <div
                      key={peo.id}
                      className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex gap-4">
                        <span className="font-bold text-[#137fec] whitespace-nowrap">
                          PEO {idx + 1}
                        </span>
                        <div className="space-y-4 w-full">
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {peo.text}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                                Vision Alignment (%)
                              </label>
                              <input
                                value={peo.visionAlign}
                                onChange={(e) =>
                                  updatePeoData(
                                    peo.id,
                                    "visionAlign",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-[#137fec]"
                                placeholder="0-100"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                                Stakeholder Alignment (%)
                              </label>
                              <input
                                value={peo.stakeholderAlign}
                                onChange={(e) =>
                                  updatePeoData(
                                    peo.id,
                                    "stakeholderAlign",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-[#137fec]"
                                placeholder="0-100"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleSave(false)}
                    className="px-6 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    className="flex-1 bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                  >
                    Finalize PEOs
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
