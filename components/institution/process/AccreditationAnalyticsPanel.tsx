"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertCircle, Loader2, RefreshCcw, BarChart3 } from "lucide-react";

interface AnalyticsPayload {
  poAttainmentRadar: Array<{ po: string; attainment: number }>;
  coAttainmentBar: Array<{ co: string; attainment: number }>;
  stakeholderFeedbackGraph: Array<{ group: string; rating: number; submissions: number }>;
  curriculumCreditDistribution: Array<{ category: string; credits: number }>;
}

const CATEGORY_COLORS = [
  "#1d4ed8",
  "#0f766e",
  "#c2410c",
  "#4f46e5",
  "#047857",
  "#7c2d12",
  "#334155",
  "#a16207",
  "#6d28d9",
  "#4338ca",
];

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function AccreditationAnalyticsPanelContent() {
  const searchParams = useSearchParams();
  const programId = String(searchParams.get("programId") || "").trim();
  const versionId = String(searchParams.get("versionId") || "").trim();
  const curriculumId = String(searchParams.get("curriculumId") || "").trim();

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyData = useMemo(() => {
    if (!analytics) return false;
    return (
      analytics.poAttainmentRadar.length > 0 ||
      analytics.coAttainmentBar.length > 0 ||
      analytics.stakeholderFeedbackGraph.length > 0 ||
      analytics.curriculumCreditDistribution.length > 0
    );
  }, [analytics]);

  const fetchAnalytics = async () => {
    if (!programId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/curriculum/accreditation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          reportType: "NBA",
          versionId: versionId || undefined,
          curriculumId: curriculumId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load accreditation analytics");
      }

      setAnalytics(data.report?.analytics || null);
      setWarnings(Array.isArray(data.report?.warnings) ? data.report.warnings : []);
    } catch (err: any) {
      setError(err.message || "Unable to load analytics");
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, versionId, curriculumId]);

  if (!programId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Select a program to view accreditation analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">Accreditation Analytics</h3>
          <p className="text-sm text-slate-600">
            PO attainment, CO attainment, stakeholder feedback, and curriculum credit distribution.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4 text-indigo-600" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Data warnings</p>
          <ul className="mt-2 list-disc pl-5">
            {warnings.slice(0, 4).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && !error && !hasAnyData && (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-slate-500">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p>No analytics data found.</p>
          <p className="text-xs text-slate-400">
            Generate outcomes, attainment, and feedback records to populate these charts.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-slate-800">PO Attainment Radar Chart</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analytics?.poAttainmentRadar || []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="po" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                <Radar
                  dataKey="attainment"
                  name="Attainment"
                  stroke="#1d4ed8"
                  fill="#1d4ed8"
                  fillOpacity={0.35}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-slate-800">CO Attainment Bar Chart</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(analytics?.coAttainmentBar || []).slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="co" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attainment" fill="#0f766e" name="CO Attainment" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-slate-800">Stakeholder Feedback Graph</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.stakeholderFeedbackGraph || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" />
                <YAxis yAxisId="left" domain={[0, 5]} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="rating" fill="#c2410c" name="Avg Rating" />
                <Bar yAxisId="right" dataKey="submissions" fill="#334155" name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-slate-800">Curriculum Credit Distribution</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.curriculumCreditDistribution || []}
                  dataKey="credits"
                  nameKey="category"
                  outerRadius={96}
                  innerRadius={48}
                  label
                >
                  {(analytics?.curriculumCreditDistribution || []).map((entry, index) => (
                    <Cell key={`${entry.category}-${index}`} fill={getCategoryColor(index)} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccreditationAnalyticsPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading accreditation analytics...
        </div>
      }
    >
      <AccreditationAnalyticsPanelContent />
    </Suspense>
  );
}
