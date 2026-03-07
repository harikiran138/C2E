"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, RefreshCcw, BarChart2, BookOpen, Layers, GraduationCap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  course_code: string;
  course_title: string;
  category_code: string;
  semester: number;
  credits: number;
}

interface CategoryData {
  category: string;
  credits: number;
  courses: number;
}

interface SemesterRow {
  semester: string;
  total: number;
  [category: string]: number | string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  BS: "#3b82f6",   // blue
  ES: "#0ea5e9",   // sky
  HSS: "#22c55e",  // green
  PC: "#6366f1",   // indigo
  PE: "#a855f7",   // purple
  OE: "#06b6d4",   // cyan
  AE: "#f97316",   // orange
  SE: "#84cc16",   // lime
  PR: "#f43f5e",   // rose
  MC: "#94a3b8",   // slate
};

const DEFAULT_COLOR = "#94a3b8";

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded-xl" />
    </div>
  );
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${name}`}
    </text>
  );
};

// ─── Main Content ─────────────────────────────────────────────────────────────

function CurriculumVisualizationPanelContent() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId") ?? "";

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchCourses = async () => {
    if (!programId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/curriculum/courses?programId=${programId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCourses(data.courses ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  // ── Computed data ─────────────────────────────────────────────────────────

  // 1. Category Distribution
  const categoryData: CategoryData[] = (() => {
    const map = new Map<string, { credits: number; courses: number }>();
    courses.forEach((c) => {
      const cat = c.category_code || "Unknown";
      const prev = map.get(cat) ?? { credits: 0, courses: 0 };
      map.set(cat, {
        credits: prev.credits + (c.credits || 0),
        courses: prev.courses + 1,
      });
    });
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.credits - a.credits);
  })();

  // 2. Credits per Semester (simple)
  const semesterTotals = (() => {
    const map = new Map<number, number>();
    courses.forEach((c) => {
      map.set(c.semester, (map.get(c.semester) ?? 0) + (c.credits || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([sem, total]) => ({ semester: `Sem ${sem}`, total }));
  })();

  // 3. Stacked category breakdown per semester
  const allCategories = Array.from(new Set(courses.map((c) => c.category_code))).sort();
  const semesterStackedData: SemesterRow[] = (() => {
    const semMap = new Map<number, Record<string, number>>();
    courses.forEach((c) => {
      const existing = semMap.get(c.semester) ?? {};
      existing[c.category_code] = (existing[c.category_code] ?? 0) + (c.credits || 0);
      semMap.set(c.semester, existing);
    });
    return Array.from(semMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([sem, cats]) => {
        const row: SemesterRow = { semester: `Sem ${sem}`, total: 0 };
        let total = 0;
        allCategories.forEach((cat) => {
          row[cat] = cats[cat] ?? 0;
          total += cats[cat] ?? 0;
        });
        row.total = total;
        return row;
      });
  })();

  // 4. Summary stats
  const totalCourses = courses.length;
  const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
  const semesters = new Set(courses.map((c) => c.semester)).size;
  const avgCreditsPerSemester = semesters > 0 ? Math.round((totalCredits / semesters) * 10) / 10 : 0;

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (hasFetched && courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start pr-2">
          <div>
            <h3 className="text-xl font-semibold">Curriculum Visualization</h3>
            <p className="text-sm text-slate-600">
              Visual analysis of curriculum structure, credit distribution, and category breakdown.
            </p>
          </div>
          <button
            onClick={fetchCourses}
            disabled={isLoading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4 text-indigo-600" />
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-16 shadow-sm flex flex-col items-center text-center">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <BarChart2 className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-700">No data to visualize</p>
          <p className="text-sm text-slate-500 mt-1">
            Generate curriculum first to view visualizations.
          </p>
        </div>
      </div>
    );
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start pr-2">
          <div>
            <h3 className="text-xl font-semibold">Curriculum Visualization</h3>
            <p className="text-sm text-slate-600">Loading visualization data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start pr-2">
        <div>
          <h3 className="text-xl font-semibold">Curriculum Visualization</h3>
          <p className="text-sm text-slate-600">
            Visual analysis of curriculum structure, credit distribution, and category breakdown.
          </p>
        </div>
        <button
          onClick={fetchCourses}
          disabled={isLoading}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <RefreshCcw className="w-4 h-4 text-indigo-600" />
          )}
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Courses", value: totalCourses, icon: BookOpen, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-100" },
          { label: "Total Credits", value: totalCredits, icon: Layers, color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100" },
          { label: "Semesters", value: semesters, icon: GraduationCap, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-100" },
          { label: "Avg Credits/Sem", value: avgCreditsPerSemester, icon: BarChart2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`${bg} ${border} border rounded-2xl p-5 flex items-center gap-4 shadow-sm`}>
            <div className={`p-2.5 bg-white rounded-xl shadow-sm border ${border}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2×2 Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Category Distribution (Donut Pie) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">Category Distribution</h4>
          </div>
          {categoryData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No data
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    dataKey="credits"
                    nameKey="category"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category] ?? DEFAULT_COLOR}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={
                      ((val: number | string, name: string) => [
                        `${val ?? 0} credits`,
                        name,
                      ]) as any
                    }
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                {categoryData.map((d) => (
                  <div key={d.category} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[d.category] ?? DEFAULT_COLOR }}
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      {d.category} ({d.credits}cr)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Chart 2: Credits per Semester (Simple Bar) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-50 rounded-lg">
              <BarChart2 className="w-4 h-4 text-sky-600" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">Credits per Semester</h4>
          </div>
          {semesterTotals.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={semesterTotals} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="semester"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={
                    ((val: number | string) => [
                      `${val ?? 0} credits`,
                      "Total",
                    ]) as any
                  }
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 3: Stacked Category Breakdown per Semester */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">Category Breakdown per Semester</h4>
          </div>
          {semesterStackedData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={semesterStackedData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="semester"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                {allCategories.map((cat) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={CATEGORY_COLORS[cat] ?? DEFAULT_COLOR}
                    maxBarSize={50}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 4: Category Credit Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">Category Credit Summary</h4>
          </div>
          {categoryData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No data
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[230px] pr-1">
              {categoryData.map((d) => {
                const pct = totalCredits > 0 ? Math.round((d.credits / totalCredits) * 100) : 0;
                const color = CATEGORY_COLORS[d.category] ?? DEFAULT_COLOR;
                return (
                  <div key={d.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-semibold text-slate-700">{d.category}</span>
                        <span className="text-xs text-slate-400">({d.courses} courses)</span>
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        {d.credits} cr · {pct}%
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CurriculumVisualizationPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-slate-500 text-sm">Loading Visualization...</p>
        </div>
      }
    >
      <CurriculumVisualizationPanelContent />
    </Suspense>
  );
}
