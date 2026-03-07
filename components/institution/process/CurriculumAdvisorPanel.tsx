"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WandSparkles,
  Loader2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Lightbulb,
  BarChart2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { saveCurriculumAdvisorSnapshot } from "@/lib/curriculum/advisor-integration";

const PROGRAM_TYPES = ["CS/IT", "ECE", "MECH", "CIVIL", "EEE", "Other"] as const;
const INDUSTRY_FOCUSES = [
  "IT",
  "Manufacturing",
  "Research",
  "Startup",
  "Government",
] as const;

type ProgramType = (typeof PROGRAM_TYPES)[number];
type IndustryFocus = (typeof INDUSTRY_FOCUSES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  BS: "Basic Sciences (BS)",
  ES: "Engineering Sciences (ES)",
  HSS: "Humanities & Social Sciences (HSS)",
  PC: "Professional Core (PC)",
  PE: "Professional Electives (PE)",
  OE: "Open Electives (OE)",
  MC: "Mandatory Courses (MC)",
  AE: "Ability Enhancement (AE)",
  SE: "Skill Enhancement (SE)",
  PR: "Project / Internship (PR)",
};

const CATEGORY_COLORS: Record<string, string> = {
  BS: "bg-blue-100 text-blue-800",
  ES: "bg-indigo-100 text-indigo-800",
  HSS: "bg-purple-100 text-purple-800",
  PC: "bg-green-100 text-green-800",
  PE: "bg-teal-100 text-teal-800",
  OE: "bg-orange-100 text-orange-800",
  MC: "bg-slate-100 text-slate-500",
  AE: "bg-pink-100 text-pink-800",
  SE: "bg-yellow-100 text-yellow-800",
  PR: "bg-red-100 text-red-800",
};

interface CategoryDistribution {
  BS: number;
  ES: number;
  HSS: number;
  PC: number;
  PE: number;
  OE: number;
  MC: number;
  AE: number;
  SE: number;
  PR: number;
}

interface AdvisorRecommendations {
  categoryDistribution: CategoryDistribution;
  recommendedElectives: string[];
  modernSubjects: Record<string, string[]>;
  advisorNotes: string;
  trendSnapshot?: {
    domain: string;
    generatedAt: string;
    coreTrendSkills: Array<{ topic: string; relevance: "high" | "medium" }>;
    suggestedElectives: string[];
    suggestedSkillModules: string[];
    sources: Array<{ name: string; note: string }>;
  };
}

export default function CurriculumAdvisorPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId") ?? "";

  // Wizard step: 1 = input, 2 = results
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  // Form state
  const [programType, setProgramType] = useState<ProgramType>("CS/IT");
  const [industryFocus, setIndustryFocus] = useState<IndustryFocus>("IT");
  const [specialization, setSpecialization] = useState("");
  const [totalCredits, setTotalCredits] = useState(160);
  const [semesterCount, setSemesterCount] = useState(8);

  // Results state
  const [recommendations, setRecommendations] = useState<AdvisorRecommendations | null>(null);
  const [editedDistribution, setEditedDistribution] = useState<CategoryDistribution | null>(null);
  const [selectedElectives, setSelectedElectives] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function handleGetRecommendations() {
    if (!specialization.trim()) {
      setError("Please enter a specialization before proceeding.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/curriculum/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programType,
          industryFocus,
          specialization: specialization.trim(),
          totalCredits,
          semesterCount,
        }),
      });

      const data = (await response.json()) as {
        recommendations?: AdvisorRecommendations;
        error?: string;
      };

      if (!response.ok || data.error) {
        setError(data.error ?? "Failed to get AI recommendations. Please try again.");
        return;
      }

      if (!data.recommendations) {
        setError("Unexpected empty response from AI advisor.");
        return;
      }

      setRecommendations(data.recommendations);
      setEditedDistribution({ ...data.recommendations.categoryDistribution });
      setSelectedElectives(new Set(data.recommendations.recommendedElectives));
      setWizardStep(2);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDistributionChange(category: keyof CategoryDistribution, value: number) {
    if (!editedDistribution) return;
    setEditedDistribution((prev) => ({
      ...prev!,
      [category]: Math.max(0, Math.min(100, value)),
    }));
  }

  function toggleElective(elective: string) {
    setSelectedElectives((prev) => {
      const next = new Set(prev);
      if (next.has(elective)) {
        next.delete(elective);
      } else {
        next.add(elective);
      }
      return next;
    });
  }

  function handleApplyCurriculum() {
    if (!programId) {
      setError("Please select a program before applying curriculum recommendations.");
      return;
    }
    if (!recommendations || !editedDistribution) {
      setError("No recommendations available to apply.");
      return;
    }

    saveCurriculumAdvisorSnapshot({
      programId,
      totalCredits,
      semesterCount,
      categoryDistribution: { ...editedDistribution },
      recommendedElectives: Array.from(selectedElectives),
      modernSubjects: recommendations.modernSubjects,
      advisorNotes: recommendations.advisorNotes,
      trendSnapshot: recommendations.trendSnapshot,
      createdAt: new Date().toISOString(),
    });

    showToast("Recommendations applied. Opening Curriculum Structure...");
    router.push(`/institution/process/process-12?programId=${programId}`);
  }

  const distributionSum = editedDistribution
    ? Object.values(editedDistribution).reduce((sum, v) => sum + (Number(v) || 0), 0)
    : 0;

  const distributionValid = Math.abs(distributionSum - 100) <= 1;

  return (
    <div className="space-y-6 relative">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center pr-2">
        <div>
          <h3 className="text-xl font-semibold">AI Curriculum Advisor</h3>
          <p className="text-sm text-slate-600">
            Get AI-powered curriculum distribution recommendations aligned with NEP 2020, AICTE
            guidelines, and industry trends.
          </p>
        </div>
        {wizardStep === 2 && recommendations && (
          <button
            onClick={handleApplyCurriculum}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply to Curriculum
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 text-sm">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition-colors ${
            wizardStep === 1
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            1
          </span>
          Program Details
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition-colors ${
            wizardStep === 2
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            2
          </span>
          AI Recommendations
        </div>
      </div>

      {/* Step 1: Input form */}
      {wizardStep === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-slate-900">Tell us about your program</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Program Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Program Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PROGRAM_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setProgramType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      programType === type
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-300 hover:border-indigo-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Industry Focus */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Industry Focus <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_FOCUSES.map((focus) => (
                  <button
                    key={focus}
                    onClick={() => setIndustryFocus(focus)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      industryFocus === focus
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-slate-700 border-slate-300 hover:border-teal-300"
                    }`}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>

            {/* Specialization */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Specialization / Focus Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g., Artificial Intelligence, Structural Engineering, VLSI Design..."
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Total Credits */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Total Credits
              </label>
              <input
                type="number"
                min={120}
                max={240}
                value={totalCredits}
                onChange={(e) =>
                  setTotalCredits(
                    Math.min(240, Math.max(120, parseInt(e.target.value, 10) || 160)),
                  )
                }
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-slate-500">Typical range: 120–200 credits</p>
            </div>

            {/* Semester Count */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Number of Semesters
              </label>
              <select
                value={semesterCount}
                onChange={(e) => setSemesterCount(parseInt(e.target.value, 10))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {[6, 7, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} Semesters
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleGetRecommendations}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  <WandSparkles className="w-4 h-4" />
                  Get AI Recommendations
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Results */}
      {wizardStep === 2 && recommendations && editedDistribution && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setWizardStep(1)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Program Details
          </button>

          {/* Category Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Recommended Category Distribution</h4>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  distributionValid
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Total: {distributionSum}%{!distributionValid && " (must be 100%)"}
              </span>
            </div>

            <p className="text-sm text-slate-500">
              Adjust the percentages below. Values are editable — customize to your institution's
              needs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(editedDistribution).map(([cat, pct]) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={pct}
                      onChange={(e) =>
                        handleDistributionChange(
                          cat as keyof CategoryDistribution,
                          parseInt(e.target.value, 10),
                        )
                      }
                      disabled={cat === "MC"}
                      className="flex-1 accent-indigo-600 disabled:opacity-40"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) =>
                        handleDistributionChange(
                          cat as keyof CategoryDistribution,
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                      disabled={cat === "MC"}
                      className="w-14 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Electives */}
          {recommendations.recommendedElectives.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Recommended Electives</h4>
                  <p className="text-xs text-slate-500">Click to toggle selection</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendations.recommendedElectives.map((elective) => (
                  <button
                    key={elective}
                    onClick={() => toggleElective(elective)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedElectives.has(elective)
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-slate-700 border-slate-300 hover:border-teal-300"
                    }`}
                  >
                    {selectedElectives.has(elective) && (
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    )}
                    {elective}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modern Subjects */}
          {Object.keys(recommendations.modernSubjects).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Modern Subjects by Category</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(recommendations.modernSubjects).map(([cat, subjects]) =>
                  subjects.length > 0 ? (
                    <div key={cat} className="space-y-2">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {cat}
                      </span>
                      <ul className="space-y-1">
                        {subjects.map((subject) => (
                          <li key={subject} className="text-sm text-slate-700 flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                            {subject}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* Advisor Notes */}
          {recommendations.advisorNotes && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <h4 className="font-semibold text-indigo-900 text-sm">Advisor Notes</h4>
              </div>
              <p className="text-sm text-indigo-800 leading-relaxed">
                {recommendations.advisorNotes}
              </p>
            </div>
          )}

          {/* Technology Trend Engine Snapshot */}
          {recommendations.trendSnapshot && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-700" />
                <h4 className="font-semibold text-emerald-900 text-sm">
                  TechnologyTrendEngine Snapshot ({recommendations.trendSnapshot.domain})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-800 mb-2">
                    High-Demand Skills
                  </p>
                  <ul className="space-y-1.5">
                    {recommendations.trendSnapshot.coreTrendSkills.map((skill) => (
                      <li key={skill.topic} className="text-sm text-emerald-900 flex items-start gap-2">
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            skill.relevance === "high"
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {skill.relevance.toUpperCase()}
                        </span>
                        <span>{skill.topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-emerald-800 mb-2">
                    Reference Sources
                  </p>
                  <ul className="space-y-1.5">
                    {recommendations.trendSnapshot.sources.map((source) => (
                      <li key={source.name} className="text-sm text-emerald-900">
                        <span className="font-semibold">{source.name}:</span> {source.note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Apply button at bottom */}
          <div className="flex justify-end">
            <button
              onClick={handleApplyCurriculum}
              disabled={!distributionValid}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply to Curriculum
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
