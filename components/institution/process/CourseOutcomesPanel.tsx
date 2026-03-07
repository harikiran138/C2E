"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Save,
  Loader2,
  Target,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Grid3x3,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  course_code: string;
  course_title: string;
  category_code: string;
  semester: number;
  credits: number;
}

interface CourseOutcome {
  co_code: string;
  statement: string;
  rbt_level: string;
  po_mapping: number[];
  pso_mapping: number[];
  strength: string;
}

type OutcomesMap = Record<string, CourseOutcome[]>;

const RBT_LEVELS = [
  "L1 Remembering",
  "L2 Understanding",
  "L3 Applying",
  "L4 Analyzing",
  "L5 Evaluating",
  "L6 Creating",
] as const;

const PO_COUNT = 12;
const PSO_COUNT = 3;

function strengthSymbol(str: string) {
  if (str === "3") return { sym: "●", cls: "text-indigo-700" };
  if (str === "2") return { sym: "◐", cls: "text-indigo-400" };
  return { sym: "○", cls: "text-slate-300" };
}

// ─── Main content (needs Suspense for useSearchParams) ────────────────────────

function CourseOutcomesPanelContent() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId") ?? "";
  const [programName, setProgramName] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "matrix">("courses");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!programId) return;
    let isMounted = true;

    fetch("/api/institution/me")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const programs = Array.isArray(data?.programs) ? data.programs : [];
        const selected = programs.find(
          (item: any) => String(item.id) === String(programId),
        );
        const resolvedProgram = String(selected?.program_name || "").trim();
        const resolvedDegree = String(selected?.degree || "").trim();
        if (resolvedProgram) {
          setProgramName(
            resolvedDegree &&
              !resolvedProgram.toLowerCase().startsWith(resolvedDegree.toLowerCase())
              ? `${resolvedDegree} ${resolvedProgram}`
              : resolvedProgram,
          );
        }
      })
      .catch(() => {
        // keep programName empty; backend will resolve it using programId
      });

    return () => {
      isMounted = false;
    };
  }, [programId]);

  // ── Fetch courses on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!programId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/curriculum/courses?programId=${programId}`);
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        const fetchedCourses: Course[] = data.courses ?? [];
        setCourses(fetchedCourses);
        // Initialise empty outcome slots for each course
        setOutcomes((prev) => {
          const next = { ...prev };
          fetchedCourses.forEach((c) => {
            if (!next[c.course_code]) next[c.course_code] = [];
          });
          return next;
        });
      } catch (err) {
        console.error(err);
        showToast("Failed to load courses", false);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [programId]);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── AI Generate COs ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!programId || courses.length === 0) {
      showToast("No courses to generate outcomes for", false);
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/curriculum/generate-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          programName: programName || undefined,
          courses: courses.map((c) => ({
            courseCode: c.course_code,
            courseTitle: c.course_title,
            category: c.category_code,
            semester: c.semester,
            credits: c.credits,
          })),
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const generated: { course_code: string; co_code: string; statement: string; rbt_level: string; po_mapping: number[]; pso_mapping: number[]; strength: string }[] = data.outcomes ?? [];

      setOutcomes((prev) => {
        const next: OutcomesMap = { ...prev };
        generated.forEach((o) => {
          if (!next[o.course_code]) next[o.course_code] = [];
          const existing = next[o.course_code].findIndex((x) => x.co_code === o.co_code);
          const co: CourseOutcome = {
            co_code: o.co_code,
            statement: o.statement,
            rbt_level: o.rbt_level,
            po_mapping: o.po_mapping,
            pso_mapping: o.pso_mapping,
            strength: o.strength,
          };
          if (existing >= 0) next[o.course_code][existing] = co;
          else next[o.course_code].push(co);
        });
        // Sort COs by code within each course
        Object.keys(next).forEach((code) => {
          next[code] = next[code].sort((a, b) => a.co_code.localeCompare(b.co_code));
        });
        return next;
      });

      showToast("Course Outcomes generated successfully", true);
    } catch (err) {
      console.error(err);
      showToast("Failed to generate outcomes", false);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save Outcomes ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!programId) return;
    setIsSaving(true);
    try {
      const allCourseOutcomes = courses.flatMap((c) =>
        (outcomes[c.course_code] ?? []).map((co, idx) => ({
          courseCode: c.course_code,
          courseTitle: c.course_title,
          category: c.category_code,
          semester: c.semester,
          credits: c.credits,
          co_code: co.co_code,
          statement: co.statement,
          rbt_level: co.rbt_level,
          po_mapping: co.po_mapping,
          pso_mapping: co.pso_mapping,
          strength: co.strength,
        }))
      );

      const res = await fetch("/api/curriculum/generate-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          programName: programName || undefined,
          courses: courses.map((c) => ({
            courseCode: c.course_code,
            courseTitle: c.course_title,
            category: c.category_code,
            semester: c.semester,
            credits: c.credits,
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("Outcomes saved successfully", true);
    } catch (err) {
      console.error(err);
      showToast("Failed to save outcomes", false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Local edit handlers ───────────────────────────────────────────────────
  const updateCO = (courseCode: string, coIdx: number, field: keyof CourseOutcome, value: any) => {
    setOutcomes((prev) => {
      const next = { ...prev };
      const cos = [...(next[courseCode] ?? [])];
      cos[coIdx] = { ...cos[coIdx], [field]: value };
      next[courseCode] = cos;
      return next;
    });
  };

  const togglePO = (courseCode: string, coIdx: number, poNum: number) => {
    setOutcomes((prev) => {
      const next = { ...prev };
      const cos = [...(next[courseCode] ?? [])];
      const co = { ...cos[coIdx] };
      const current = co.po_mapping ?? [];
      co.po_mapping = current.includes(poNum)
        ? current.filter((n) => n !== poNum)
        : [...current, poNum].sort((a, b) => a - b);
      cos[coIdx] = co;
      next[courseCode] = cos;
      return next;
    });
  };

  const togglePSO = (courseCode: string, coIdx: number, psoNum: number) => {
    setOutcomes((prev) => {
      const next = { ...prev };
      const cos = [...(next[courseCode] ?? [])];
      const co = { ...cos[coIdx] };
      const current = co.pso_mapping ?? [];
      co.pso_mapping = current.includes(psoNum)
        ? current.filter((n) => n !== psoNum)
        : [...current, psoNum].sort((a, b) => a - b);
      cos[coIdx] = co;
      next[courseCode] = cos;
      return next;
    });
  };

  // ── CO-PO Matrix data ─────────────────────────────────────────────────────
  // For each course × PO, find the strongest CO mapping
  const matrixCell = (courseCode: string, poNum: number): string => {
    const cos = outcomes[courseCode] ?? [];
    let max = 0;
    cos.forEach((co) => {
      if ((co.po_mapping ?? []).includes(poNum)) {
        const str = parseInt(co.strength ?? "0", 10);
        if (str > max) max = str;
      }
    });
    return max > 0 ? String(max) : "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${
            toast.ok ? "bg-emerald-600" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start pr-2">
        <div>
          <h3 className="text-xl font-semibold">Course Outcomes (CO)</h3>
          <p className="text-sm text-slate-600">
            Define and refine measurable outcomes for each course in the curriculum.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || courses.length === 0}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600" />
            )}
            {isGenerating ? "Generating..." : "AI Generate COs"}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || courses.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Outcomes"}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["courses", "matrix"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === tab
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "courses" ? (
              <BookOpen className="w-4 h-4" />
            ) : (
              <Grid3x3 className="w-4 h-4" />
            )}
            {tab === "courses" ? "Course Outcomes" : "CO-PO Matrix"}
          </button>
        ))}
      </div>

      {/* Tab: Course Outcomes */}
      {activeTab === "courses" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm text-slate-500">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Target className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700">No courses found</p>
              <p className="text-sm text-slate-500 mt-1">
                Generate curriculum first to define Course Outcomes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {courses.map((course) => {
                const isExpanded = expandedCourse === course.course_code;
                const cos = outcomes[course.course_code] ?? [];
                return (
                  <div key={course.course_code}>
                    {/* Accordion header */}
                    <button
                      onClick={() =>
                        setExpandedCourse(isExpanded ? null : course.course_code)
                      }
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {course.course_code}
                        </span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {course.course_title}
                        </span>
                        <span className="text-xs text-slate-400">
                          Sem {course.semester} · {course.credits} cr · {course.category_code}
                        </span>
                        {cos.length > 0 && (
                          <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                            {cos.length} COs
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Expanded CO table */}
                    {isExpanded && (
                      <div className="px-6 pb-6">
                        {cos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 bg-slate-50/40 rounded-xl border border-dashed border-slate-200 text-center">
                            <AlertCircle className="w-6 h-6 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500 italic">
                              No COs defined yet. Click "AI Generate COs" to auto-generate.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600">
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-b border-slate-200 w-16">CO</th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-b border-slate-200 min-w-[260px]">Statement</th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-b border-slate-200 w-32">RBT Level</th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-b border-slate-200">PO Mapping (1–12)</th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-b border-slate-200">PSO (1–3)</th>
                                  <th className="px-3 py-2.5 text-center text-xs font-semibold border-b border-slate-200 w-20">Strength</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {cos.map((co, coIdx) => (
                                  <tr key={co.co_code} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-3 py-2.5">
                                      <span className="text-xs font-bold text-indigo-600">{co.co_code}</span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <textarea
                                        rows={2}
                                        value={co.statement}
                                        onChange={(e) =>
                                          updateCO(course.course_code, coIdx, "statement", e.target.value)
                                        }
                                        className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <select
                                        value={co.rbt_level}
                                        onChange={(e) =>
                                          updateCO(course.course_code, coIdx, "rbt_level", e.target.value)
                                        }
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent w-full"
                                      >
                                        {RBT_LEVELS.map((l) => (
                                          <option key={l} value={l}>{l}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="flex flex-wrap gap-1">
                                        {Array.from({ length: PO_COUNT }, (_, i) => i + 1).map((n) => (
                                          <label key={n} className="flex items-center gap-0.5 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={(co.po_mapping ?? []).includes(n)}
                                              onChange={() => togglePO(course.course_code, coIdx, n)}
                                              className="accent-indigo-600 w-3 h-3"
                                            />
                                            <span className="text-[10px] text-slate-500">{n}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="flex flex-wrap gap-1">
                                        {Array.from({ length: PSO_COUNT }, (_, i) => i + 1).map((n) => (
                                          <label key={n} className="flex items-center gap-0.5 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={(co.pso_mapping ?? []).includes(n)}
                                              onChange={() => togglePSO(course.course_code, coIdx, n)}
                                              className="accent-indigo-600 w-3 h-3"
                                            />
                                            <span className="text-[10px] text-slate-500">{n}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <select
                                        value={co.strength}
                                        onChange={(e) =>
                                          updateCO(course.course_code, coIdx, "strength", e.target.value)
                                        }
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent w-14 text-center"
                                      >
                                        <option value="1">1 Low</option>
                                        <option value="2">2 Med</option>
                                        <option value="3">3 High</option>
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: CO-PO Matrix */}
      {activeTab === "matrix" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Grid3x3 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700">No matrix data</p>
              <p className="text-sm text-slate-500 mt-1">Generate curriculum and COs first.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 border-b border-slate-200 min-w-[200px]">
                        Course
                      </th>
                      {Array.from({ length: PO_COUNT }, (_, i) => i + 1).map((n) => (
                        <th key={n} className="px-2 py-3 text-center text-xs font-semibold text-slate-600 border-b border-slate-200 w-10">
                          PO{n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.map((course) => (
                      <tr key={course.course_code} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-xs font-bold text-indigo-600">{course.course_code}</span>
                            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{course.course_title}</p>
                          </div>
                        </td>
                        {Array.from({ length: PO_COUNT }, (_, i) => i + 1).map((poNum) => {
                          const val = matrixCell(course.course_code, poNum);
                          const { sym, cls } = val
                            ? strengthSymbol(val)
                            : { sym: "", cls: "" };
                          return (
                            <td key={poNum} className="px-2 py-3 text-center">
                              <span
                                className={`text-lg leading-none font-bold ${cls}`}
                                title={val ? `Strength: ${val}` : "No mapping"}
                              >
                                {sym || <span className="text-slate-100">·</span>}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-6 px-6 py-3 border-t border-slate-100 bg-slate-50/60">
                <span className="text-xs text-slate-500 font-semibold">Legend:</span>
                {[
                  { sym: "●", cls: "text-indigo-700", label: "Strong (3)" },
                  { sym: "◐", cls: "text-indigo-400", label: "Medium (2)" },
                  { sym: "○", cls: "text-slate-400", label: "Weak (1)" },
                ].map(({ sym, cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`text-base font-bold ${cls}`}>{sym}</span>
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseOutcomesPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading Course Outcomes...</p>
        </div>
      }
    >
      <CourseOutcomesPanelContent />
    </Suspense>
  );
}
