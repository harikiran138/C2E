"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  BookOpen, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Info
} from "lucide-react";
import { CategoryCode, CATEGORY_CODES } from "@/lib/curriculum/engine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  semester: number;
  category: CategoryCode;
  courseCode: string;
  courseTitle: string;
  credits: number;
  tHours: number;
  tuHours: number;
  llHours: number;
  twHours: number;
  totalHours: number;
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function DevelopCurriculumPanel() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId") ?? "";
  const versionId = searchParams.get("versionId") ?? "";
  const curriculumId = searchParams.get("curriculumId") ?? "";

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Fetch courses on mount ──────────────────────────────────────────────
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

        const res = await fetch(`/api/curriculum/courses?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        
        // Map backend courses (snake_case) to frontend Course (camelCase)
        const fetched: Course[] = (data.courses ?? []).map((c: any) => ({
          semester: c.semester,
          category: c.category_code as CategoryCode,
          courseCode: c.course_code,
          courseTitle: c.course_title,
          credits: c.credits,
          tHours: c.t_hours ?? 0,
          tuHours: c.tu_hours ?? 0,
          llHours: c.ll_hours ?? 0,
          twHours: c.tw_hours ?? 0,
          totalHours: c.total_hours ?? 0,
        }));
        
        // If no courses found, provide initial empty rows
        if (fetched.length === 0) {
          setCourses([{
            semester: 1,
            category: "PC",
            courseCode: "",
            courseTitle: "",
            credits: 4,
            tHours: 3,
            tuHours: 1,
            llHours: 0,
            twHours: 0,
            totalHours: 4,
          }]);
        } else {
          setCourses(fetched);
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to load courses", false);
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

  const updateCourse = (index: number, field: keyof Course, value: any) => {
    setCourses(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      
      // Auto-calculate total hours if any component changes
      if (['tHours', 'tuHours', 'llHours', 'twHours'].includes(field as string)) {
        next[index].totalHours = 
          Number(next[index].tHours || 0) + 
          Number(next[index].tuHours || 0) + 
          Number(next[index].llHours || 0) + 
          Number(next[index].twHours || 0);
      }
      
      return next;
    });
  };

  const addRow = () => {
    const lastSemester = courses.length > 0 ? courses[courses.length - 1].semester : 1;
    setCourses([...courses, {
      semester: lastSemester,
      category: "PC",
      courseCode: "",
      courseTitle: "",
      credits: 3,
      tHours: 3,
      tuHours: 0,
      llHours: 0,
      twHours: 0,
      totalHours: 3,
    }]);
  };

  const removeRow = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (courses.length === 0) return;
    
    // Basic validation
    const invalid = courses.some(c => !c.courseCode.trim() || !c.courseTitle.trim());
    if (invalid) {
      showToast("Please fill all Course Codes and Titles", false);
      return;
    }

    setIsSaving(true);
    try {
      // Group courses by semester for the API structure
      const semestersMap: Record<number, any> = {};
      courses.forEach(c => {
        if (!semestersMap[c.semester]) {
          semestersMap[c.semester] = {
            semester: c.semester,
            level: "Professional Core", // Default level
            totalCredits: 0,
            courses: []
          };
        }
        semestersMap[c.semester].courses.push(c);
        semestersMap[c.semester].totalCredits += Number(c.credits);
      });

      const semestersArray = Object.values(semestersMap).sort((a, b) => a.semester - b.semester);
      const totalCreditsValue = semestersArray.reduce((acc, s) => acc + s.totalCredits, 0);

      const payload = {
        programId,
        curriculumId: curriculumId || null,
        versionId: versionId || null,
        strictAcademicFlow: false,
        curriculum: {
          programName: "Updated Program", // Will be inferred by backend if possible
          totalCredits: totalCreditsValue,
          semesterCount: semestersArray.length,
          mode: "AICTE_MODEL",
          generatedAt: new Date().toISOString(),
          categorySummary: [], // Backend handles summary if needed
          semesters: semestersArray
        }
      };

      const res = await fetch("/api/curriculum/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save curriculum");
      }

      showToast("Curriculum saved successfully", true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save curriculum", false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

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
          <h3 className="text-xl font-semibold">Develop Curriculum</h3>
          <p className="text-sm text-slate-600">
            Define the academic roadmap by adding and configuring courses for each semester.
          </p>
        </div>
        <div className="flex gap-2">
           <button
            onClick={() => {/* Mock export */}}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Template
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Curriculum"}
          </button>
        </div>
      </div>

      {/* Quick Actions / Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
          <Info className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Curriculum Management</h4>
          <p className="text-xs text-blue-700 mt-0.5">
            You can directly edit the table below. Use the "Add Course" button to insert new rows. 
            All changes are verified against OBE standards upon saving.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 text-left w-20">Sem</th>
                <th className="px-4 py-3 text-left w-32">Code</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left w-40">Category</th>
                <th className="px-4 py-3 text-center w-24">Credits</th>
                <th className="px-4 py-3 text-center w-16">T</th>
                <th className="px-4 py-3 text-center w-16">TU</th>
                <th className="px-4 py-3 text-center w-16">LL</th>
                <th className="px-4 py-3 text-center w-16">Total H</th>
                <th className="px-4 py-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-slate-500">Loading curriculum...</p>
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No courses defined yet. Click "Add Course" to begin.
                  </td>
                </tr>
              ) : (
                courses.map((course, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2">
                      <input 
                        type="number"
                        min="1"
                        max="8"
                        value={course.semester}
                        onChange={(e) => updateCourse(idx, 'semester', parseInt(e.target.value) || 1)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 font-semibold text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        placeholder="CS101"
                        value={course.courseCode}
                        onChange={(e) => updateCourse(idx, 'courseCode', e.target.value.toUpperCase())}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 font-mono text-xs uppercase"
                      />
                    </td>
                    <td className="px-4 py-2">
                       <input 
                        placeholder="Course Title"
                        value={course.courseTitle}
                        onChange={(e) => updateCourse(idx, 'courseTitle', e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 text-slate-800"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={course.category}
                        onChange={(e) => updateCourse(idx, 'category', e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 text-xs"
                      >
                        {CATEGORY_CODES.map(cat => (
                          <option key={cat} value={cat}>{cat} - {CATEGORY_LABELS[cat]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input 
                        type="number"
                        value={course.credits}
                        onChange={(e) => updateCourse(idx, 'credits', parseInt(e.target.value) || 0)}
                        className="w-12 mx-auto text-center bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 font-bold"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input 
                        type="number"
                        value={course.tHours}
                        onChange={(e) => updateCourse(idx, 'tHours', parseInt(e.target.value) || 0)}
                        className="w-10 mx-auto text-center bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input 
                        type="number"
                        value={course.tuHours}
                        onChange={(e) => updateCourse(idx, 'tuHours', parseInt(e.target.value) || 0)}
                        className="w-10 mx-auto text-center bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input 
                        type="number"
                        value={course.llHours}
                        onChange={(e) => updateCourse(idx, 'llHours', parseInt(e.target.value) || 0)}
                        className="w-10 mx-auto text-center bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-slate-700">
                      {course.totalHours}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        onClick={() => removeRow(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer / Add Row */}
        {!isLoading && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={addRow}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Course Row
            </button>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span>Total Credits: <span className="text-slate-900 font-bold">{courses.reduce((acc, c) => acc + Number(c.credits || 0), 0)}</span></span>
              <span>Total Hours: <span className="text-slate-900 font-bold">{courses.reduce((acc, c) => acc + Number(c.totalHours || 0), 0)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
             <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
             <h4 className="font-bold text-slate-900">Excel Assisted Input</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Download our curriculum template, fill it in Excel, and upload it here to bulk-import your entire course structure. 
            This is recommended for initial setup.
          </p>
          <button className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-all">
            <Download className="w-3 h-3" />
            Download Template
          </button>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
             <AlertCircle className="w-5 h-5 text-amber-500" />
             <h4 className="font-bold text-slate-900">Validation Rules</h4>
          </div>
          <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
            <li>Total credits for a 4-year B.Tech program must be exactly 160.</li>
            <li>Basic Science (BS) courses must primarily be in Semester 1 & 2.</li>
            <li>Capstone Projects (PR) are strictly mapping to Semester 7 & 8.</li>
            <li>Each semester should ideally maintain 20-22 credits.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
