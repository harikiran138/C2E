"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Save,
  Loader2,
  BookOpen,
  AlertCircle,
  BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  course_code: string;
  course_title: string;
  category_code: string;
  semester: number;
  credits: number;
}

interface OBEMapping {
  isOBECore: boolean;
  categoryOverride?: string;
}

type OBEMappingsMap = Record<string, OBEMapping>;

const CATEGORY_OPTIONS = [
  "BS",
  "ES",
  "HSS",
  "PC",
  "PE",
  "OE",
  "AE",
  "SE",
  "PR",
  "MC",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  BS: "Basic Science",
  ES: "Engineering Science",
  HSS: "Humanities & Social Sci",
  PC: "Professional Core",
  PE: "Professional Elective",
  OE: "Open Elective",
  AE: "Audit Elective",
  SE: "Skill Enhancement",
  PR: "Project / Practical",
  MC: "Mandatory Course",
};

const CATEGORY_COLORS: Record<string, string> = {
  BS: "bg-blue-50 text-blue-700 border-blue-100",
  ES: "bg-sky-50 text-sky-700 border-sky-100",
  HSS: "bg-green-50 text-green-700 border-green-100",
  PC: "bg-indigo-50 text-indigo-700 border-indigo-100",
  PE: "bg-purple-50 text-purple-700 border-purple-100",
  OE: "bg-cyan-50 text-cyan-700 border-cyan-100",
  AE: "bg-orange-50 text-orange-700 border-orange-100",
  SE: "bg-lime-50 text-lime-700 border-lime-100",
  PR: "bg-rose-50 text-rose-700 border-rose-100",
  MC: "bg-slate-50 text-slate-600 border-slate-200",
};

type FilterMode = "all" | "mapped" | "unmapped";

// ─── Toggle Switch Component ──────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function IdentifyOBECoursesPanelContent() {
  const searchParams = useSearchParams();
  const programId = (searchParams.get("programId") || "").replace(/^undefined$|^null$/i, "");
  const versionId = (searchParams.get("versionId") || "").replace(/^undefined$|^null$/i, "");
  const curriculumId = (searchParams.get("curriculumId") || "").replace(/^undefined$|^null$/i, "");

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [obeMappings, setObeMappings] = useState<OBEMappingsMap>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Fetch courses & mappings on mount ──────────────────────────────────────
  useEffect(() => {
    if (!programId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ programId });
        if (curriculumId) {
          params.set("curriculumId", curriculumId);
        } else if (versionId) {
          params.set("versionId", versionId);
        }

        // Fetch courses
        const resCourses = await fetch(`/api/curriculum/courses?${params.toString()}`);
        if (!resCourses.ok) throw new Error("Failed to fetch courses");
        const dataCourses = await resCourses.json();
        const fetched: Course[] = dataCourses.courses ?? [];
        setCourses(fetched);

        // Fetch existing mappings
        const resMappings = await fetch(`/api/curriculum/obe-mappings?${params.toString()}`);
        let existingMap: OBEMappingsMap = {};
        if (resMappings.ok) {
          const mappingData = await resMappings.json();
          (mappingData.mappings || []).forEach((m: any) => {
            existingMap[m.course_code] = {
              isOBECore: m.is_obe_core,
              categoryOverride: m.category_override || undefined,
            };
          });
        }

        // Merge defaults if no mapping exists
        const finalizedMap: OBEMappingsMap = {};
        fetched.forEach((c) => {
          if (existingMap[c.course_code]) {
            finalizedMap[c.course_code] = existingMap[c.course_code];
          } else {
            finalizedMap[c.course_code] = {
              isOBECore: ["PC", "PR", "ES"].includes(c.category_code),
              categoryOverride: undefined,
            };
          }
        });
        setObeMappings(finalizedMap);
      } catch (err) {
        console.error(err);
        showToast("Failed to load data", false);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [curriculumId, programId, versionId]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleOBECore = (courseCode: string, val: boolean) => {
    setObeMappings((prev) => ({
      ...prev,
      [courseCode]: { ...(prev[courseCode] ?? {}), isOBECore: val },
    }));
  };

  const setCategoryOverride = (courseCode: string, val: string) => {
    setObeMappings((prev) => ({
      ...prev,
      [courseCode]: {
        ...(prev[courseCode] ?? {}),
        categoryOverride: val || undefined,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/curriculum/obe-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          curriculumId: curriculumId || null,
          mappings: obeMappings,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save mappings");
      }

      showToast("OBE mappings saved successfully", true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save mappings", false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Filtered courses ────────────────────────────────────────────────────
  const filteredCourses = courses.filter((c) => {
    if (filter === "mapped") return obeMappings[c.course_code]?.isOBECore === true;
    if (filter === "unmapped") return !obeMappings[c.course_code]?.isOBECore;
    return true;
  });

  const obeMappedCount = courses.filter((c) => obeMappings[c.course_code]?.isOBECore).length;
  const unmappedCount = courses.length - obeMappedCount;

  const effectiveCategory = (course: Course) =>
    obeMappings[course.course_code]?.categoryOverride ?? course.category_code;

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
          <h3 className="text-xl font-semibold">Identify OBE Courses</h3>
          <p className="text-sm text-slate-600">
            Map existing curriculum courses to the Outcome-Based Education framework.
          </p>
        </div>
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
          {isSaving ? "Saving..." : "Save Mappings"}
        </button>
      </div>

      {/* Stats Bar */}
      {courses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Courses", value: courses.length, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
            { label: "OBE Mapped", value: obeMappedCount, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-100" },
            { label: "Unmapped", value: unmappedCount, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className={`${bg} ${border} border rounded-xl p-4 flex items-center gap-3`}>
              <BarChart2 className={`w-5 h-5 ${color} opacity-60`} />
              <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["all", "mapped", "unmapped"] as FilterMode[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              filter === f
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f === "all" ? "All" : f === "mapped" ? "OBE Mapped" : "Unmapped"}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-slate-900">Course Identification Matrix</h4>
          {courses.length > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              Showing {filteredCourses.length} of {courses.length} courses
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm text-slate-500">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700">No courses found</p>
            <p className="text-sm text-slate-500 mt-1">
              Please generate or upload a curriculum first.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-left text-xs font-semibold border-b border-slate-200">Course Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold border-b border-slate-200">Course Title</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold border-b border-slate-200">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold border-b border-slate-200">Semester</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold border-b border-slate-200">Credits</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold border-b border-slate-200">Is OBE Core</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold border-b border-slate-200">Category Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic text-sm">
                      No courses match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => {
                    const mapping = obeMappings[course.course_code] ?? { isOBECore: false };
                    const effectiveCat = effectiveCategory(course);
                    const badgeClass = CATEGORY_COLORS[effectiveCat] ?? "bg-slate-50 text-slate-600 border-slate-200";
                    return (
                      <tr
                        key={course.course_code}
                        className={`transition-colors ${
                          mapping.isOBECore
                            ? "bg-indigo-50/20 hover:bg-indigo-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                            {course.course_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-800 font-medium leading-tight">
                            {course.course_title}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${badgeClass}`}
                            title={CATEGORY_LABELS[effectiveCat] ?? effectiveCat}
                          >
                            {effectiveCat}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600 font-medium">
                          {course.semester}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600 font-medium">
                          {course.credits}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <ToggleSwitch
                              checked={mapping.isOBECore}
                              onChange={(val) => toggleOBECore(course.course_code, val)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={mapping.categoryOverride ?? ""}
                            onChange={(e) =>
                              setCategoryOverride(course.course_code, e.target.value)
                            }
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent w-24"
                          >
                            <option value="">Default</option>
                            {CATEGORY_OPTIONS.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer legend */}
        {courses.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-xs text-slate-400 font-semibold">Categories:</span>
            {CATEGORY_OPTIONS.slice(0, 6).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${CATEGORY_COLORS[cat] ?? ""}`}
                >
                  {cat}
                </span>
                <span className="text-[10px] text-slate-500">{CATEGORY_LABELS[cat]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IdentifyOBECoursesPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading OBE Course Mapper...</p>
        </div>
      }
    >
      <IdentifyOBECoursesPanelContent />
    </Suspense>
  );
}
