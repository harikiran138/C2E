"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Download,
  FileText,
  Grid3x3,
  BarChart2,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types (mirrors accreditation-report/route.ts) ────────────────────────────

type ReportType = "NBA" | "NAAC" | "ABET";

interface CurriculumMatrixRow {
  courseCode: string;
  courseTitle: string;
  semester: number;
  category: string;
  credits: number;
}

interface COPOMatrixRow {
  courseCode: string;
  coCode: string;
  statement: string;
  poMapping: number[];
  psoMapping: number[];
}

interface CategoryDistributionEntry {
  category: string;
  credits: number;
  percentage: number;
}

interface CourseListEntry {
  semester: number;
  courseCode: string;
  courseTitle: string;
  credits: number;
  category: string;
}

interface AccreditationReport {
  reportType: ReportType;
  programId: string;
  generatedAt: string;
  curriculumMatrix: {
    headers: string[];
    rows: CurriculumMatrixRow[];
  };
  coPOMatrix: {
    headers: string[];
    rows: COPOMatrixRow[];
  };
  categoryDistribution: CategoryDistributionEntry[];
  courseList: CourseListEntry[];
}

// ─── Report type configs ──────────────────────────────────────────────────────

const REPORT_CONFIGS = [
  {
    type: "NBA" as ReportType,
    title: "NBA",
    subtitle: "National Board of Accreditation",
    description:
      "OBE-focused report with CO-PO mapping, attainment indices, and program exit survey data as per NBA criteria.",
    color: "indigo",
    bgSelected: "bg-indigo-600 text-white border-indigo-600",
    bgDefault: "bg-white hover:bg-indigo-50 text-slate-700 border-slate-200",
  },
  {
    type: "NAAC" as ReportType,
    title: "NAAC",
    subtitle: "National Assessment and Accreditation Council",
    description:
      "Quality-centric report covering curriculum design, learning outcomes, and academic performance indicators.",
    color: "sky",
    bgSelected: "bg-sky-600 text-white border-sky-600",
    bgDefault: "bg-white hover:bg-sky-50 text-slate-700 border-slate-200",
  },
  {
    type: "ABET" as ReportType,
    title: "ABET",
    subtitle: "Accreditation Board for Engineering and Technology",
    description:
      "Student outcomes and performance criteria report aligned with ABET Criterion 3 and program objectives.",
    color: "purple",
    bgSelected: "bg-purple-600 text-white border-purple-600",
    bgDefault: "bg-white hover:bg-purple-50 text-slate-700 border-slate-200",
  },
];

type ActiveTab = "matrix" | "coopo" | "distribution" | "courses";

const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: "matrix", label: "Curriculum Matrix", icon: Grid3x3 },
  { id: "coopo", label: "CO-PO Mapping", icon: FileText },
  { id: "distribution", label: "Category Distribution", icon: BarChart2 },
  { id: "courses", label: "Course List", icon: BookOpen },
];

// ─── CSV Download helper ──────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const csvContent = rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main content ─────────────────────────────────────────────────────────────

function AccreditationReportPanelContent() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId") ?? "";

  const [reportType, setReportType] = useState<ReportType>("NBA");
  const [report, setReport] = useState<AccreditationReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("matrix");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleGenerate = async () => {
    if (!programId) {
      showToast("No program selected", false);
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/curriculum/accreditation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, reportType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data.report);
      setActiveTab("matrix");
      showToast(`${reportType} report generated successfully`, true);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Unknown error");
      showToast("Failed to generate report", false);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── CSV Exports per tab ───────────────────────────────────────────────────

  const exportCurrentTab = () => {
    if (!report) return;
    const ts = new Date().toISOString().slice(0, 10);

    if (activeTab === "matrix") {
      const rows: string[][] = [
        ["Course Code", "Course Title", "Semester", "Category", "Credits"],
        ...report.curriculumMatrix.rows.map((r) => [
          r.courseCode,
          r.courseTitle,
          String(r.semester),
          r.category,
          String(r.credits),
        ]),
      ];
      downloadCSV(`${report.reportType}_curriculum_matrix_${ts}.csv`, rows);
    } else if (activeTab === "coopo") {
      const poHeaders = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`);
      const psoHeaders = Array.from({ length: 3 }, (_, i) => `PSO${i + 1}`);
      const rows: string[][] = [
        ["Course Code", "CO Code", "Statement", ...poHeaders, ...psoHeaders],
        ...report.coPOMatrix.rows.map((r) => [
          r.courseCode,
          r.coCode,
          r.statement,
          ...Array.from({ length: 12 }, (_, i) =>
            r.poMapping.includes(i + 1) ? "●" : ""
          ),
          ...Array.from({ length: 3 }, (_, i) =>
            r.psoMapping.includes(i + 1) ? "●" : ""
          ),
        ]),
      ];
      downloadCSV(`${report.reportType}_copo_mapping_${ts}.csv`, rows);
    } else if (activeTab === "distribution") {
      const rows: string[][] = [
        ["Category", "Credits", "Percentage (%)"],
        ...report.categoryDistribution.map((d) => [
          d.category,
          String(d.credits),
          String(d.percentage),
        ]),
      ];
      downloadCSV(`${report.reportType}_category_distribution_${ts}.csv`, rows);
    } else if (activeTab === "courses") {
      const rows: string[][] = [
        ["Semester", "Course Code", "Course Title", "Credits", "Category"],
        ...report.courseList.map((c) => [
          String(c.semester),
          c.courseCode,
          c.courseTitle,
          String(c.credits),
          c.category,
        ]),
      ];
      downloadCSV(`${report.reportType}_course_list_${ts}.csv`, rows);
    }
  };

  const downloadServerExport = async (format: "csv" | "excel" | "pdf") => {
    if (!programId) {
      showToast("No program selected", false);
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch("/api/curriculum/accreditation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          reportType,
          exportFormat: format,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to export ${format.toUpperCase()}`);
      }

      const blob = await res.blob();
      const extension = format === "excel" ? "xls" : format;
      const fileName = `${reportType.toLowerCase()}_accreditation_report.${extension}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      showToast(`${format.toUpperCase()} export downloaded`, true);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Export failed", false);
    } finally {
      setIsExporting(false);
    }
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
          <h3 className="text-xl font-semibold">Accreditation Report</h3>
          <p className="text-sm text-slate-600">
            Generate structured accreditation reports for NBA, NAAC, or ABET submission.
          </p>
        </div>
        {report && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Report Ready · {new Date(report.generatedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_CONFIGS.map((cfg) => {
          const isSelected = reportType === cfg.type;
          return (
            <button
              key={cfg.type}
              onClick={() => setReportType(cfg.type)}
              className={`border rounded-2xl p-5 text-left transition-all shadow-sm ${
                isSelected ? cfg.bgSelected : cfg.bgDefault
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">{cfg.title}</span>
                {isSelected && <CheckCircle2 className="w-5 h-5 opacity-80" />}
              </div>
              <p
                className={`text-xs font-semibold mb-1.5 ${
                  isSelected ? "opacity-80" : "text-slate-500"
                }`}
              >
                {cfg.subtitle}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  isSelected ? "opacity-75" : "text-slate-400"
                }`}
              >
                {cfg.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !programId}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? "Generating Report..." : `Generate ${reportType} Report`}
        </button>
        {!programId && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            No program selected
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Report generation failed</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state before generation */}
      {!report && !isGenerating && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-16 flex flex-col items-center text-center">
          <div className="p-4 bg-white border border-slate-200 rounded-full shadow-sm mb-4">
            <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-700">No report generated yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Select a report type above and click "Generate Report" to begin.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="rounded-2xl border border-slate-200 bg-white p-20 flex flex-col items-center text-center shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <p className="font-semibold text-slate-700">Generating {reportType} Report...</p>
          <p className="text-sm text-slate-500 mt-1">
            Compiling curriculum data, CO-PO mappings, and category analysis.
          </p>
        </div>
      )}

      {/* Report Tabs */}
      {report && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-4 pb-0">
            <div className="flex gap-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
                    activeTab === id
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-1 flex items-center gap-2">
              <button
                onClick={exportCurrentTab}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Tab CSV
              </button>
              {(["csv", "excel", "pdf"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => downloadServerExport(format)}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Curriculum Matrix */}
          {activeTab === "matrix" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    {["Course Code", "Course Title", "Semester", "Category", "Credits"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.curriculumMatrix.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic text-sm">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    report.curriculumMatrix.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                            {row.courseCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">{row.courseTitle}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{row.semester}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{row.credits}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: CO-PO Mapping */}
          {activeTab === "coopo" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 text-left text-xs font-semibold border-b border-slate-200 sticky left-0 bg-slate-50">Course</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold border-b border-slate-200">CO</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold border-b border-slate-200 min-w-[220px]">Statement</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="px-2 py-3 text-center text-xs font-semibold border-b border-slate-200 w-9">
                        PO{i + 1}
                      </th>
                    ))}
                    {Array.from({ length: 3 }, (_, i) => (
                      <th key={i} className="px-2 py-3 text-center text-xs font-semibold border-b border-slate-200 w-12">
                        PSO{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.coPOMatrix.rows.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="px-4 py-10 text-center text-slate-400 italic text-sm">
                        No CO-PO data found. Generate course outcomes first.
                      </td>
                    </tr>
                  ) : (
                    report.coPOMatrix.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 sticky left-0 bg-white border-r border-slate-100">
                          <span className="text-xs font-bold text-indigo-700">{row.courseCode}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-semibold text-slate-600">{row.coCode}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 leading-relaxed max-w-[240px]">
                          {row.statement}
                        </td>
                        {Array.from({ length: 12 }, (_, idx) => (
                          <td key={idx} className="px-2 py-2.5 text-center">
                            {row.poMapping.includes(idx + 1) ? (
                              <span className="text-indigo-600 font-bold text-base">●</span>
                            ) : (
                              <span className="text-slate-200 text-base">·</span>
                            )}
                          </td>
                        ))}
                        {Array.from({ length: 3 }, (_, idx) => (
                          <td key={idx} className="px-2 py-2.5 text-center">
                            {row.psoMapping.includes(idx + 1) ? (
                              <span className="text-purple-600 font-bold text-base">●</span>
                            ) : (
                              <span className="text-slate-200 text-base">·</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Category Distribution */}
          {activeTab === "distribution" && (
            <div className="p-6">
              {report.categoryDistribution.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 italic">No category distribution data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.categoryDistribution.map((d) => (
                    <div key={d.category} className="flex items-center gap-4">
                      <span className="w-12 text-xs font-bold text-slate-700 shrink-0">
                        {d.category}
                      </span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-lg transition-all duration-500 flex items-center pl-2"
                          style={{ width: `${Math.max(d.percentage, 2)}%` }}
                        >
                          {d.percentage >= 8 && (
                            <span className="text-[10px] font-bold text-white whitespace-nowrap">
                              {d.percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700">{d.credits} credits</span>
                        <span className="text-xs text-slate-400 ml-1">({d.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex items-center gap-4 border-t border-slate-200 pt-3 mt-4">
                    <span className="w-12 text-xs font-bold text-slate-900 shrink-0">Total</span>
                    <div className="flex-1" />
                    <div className="w-28 text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900">
                        {report.categoryDistribution.reduce((s, d) => s + d.credits, 0)} credits
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Course List */}
          {activeTab === "courses" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    {["Semester", "Course Code", "Course Title", "Credits", "Category"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.courseList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic text-sm">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      // Group by semester for visual separation
                      const grouped: Record<number, CourseListEntry[]> = {};
                      report.courseList.forEach((c) => {
                        if (!grouped[c.semester]) grouped[c.semester] = [];
                        grouped[c.semester].push(c);
                      });
                      return Object.entries(grouped)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .flatMap(([sem, courses]) => [
                          <tr key={`sem-${sem}`}>
                            <td
                              colSpan={5}
                              className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100"
                            >
                              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                                Semester {sem}
                              </span>
                            </td>
                          </tr>,
                          ...courses.map((course, i) => (
                            <tr key={`${sem}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-500">{course.semester}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                  {course.courseCode}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800 font-medium">{course.courseTitle}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-center">{course.credits}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {course.category}
                                </span>
                              </td>
                            </tr>
                          )),
                        ]);
                    })()
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccreditationReportPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading Accreditation Report...</p>
        </div>
      }
    >
      <AccreditationReportPanelContent />
    </Suspense>
  );
}
