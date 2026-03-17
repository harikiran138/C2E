"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Save,
  Loader2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Star,
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackResponse {
  id: string;
  stakeholder_id: string;
  rating: number;
  comments: string;
  submitted_at: string;
  member_name: string;
  category: string;
  organization: string;
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

interface FeedbackData {
  programId: string;
  programName: string;
  feedbackStartAt: string | null;
  feedbackEndAt: string | null;
  feedbackStatus: "pending" | "open" | "closed" | "completed";
  isOpen: boolean;
  responses: FeedbackResponse[];
  checklist: ChecklistItem[];
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-3.5 h-3.5",
            n <= value ? "fill-amber-400 text-amber-400" : "text-slate-200",
          )}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status, isOpen }: { status: string; isOpen: boolean }) {
  if (isOpen)
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Open for Feedback
      </span>
    );
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    );
  if (status === "closed")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <XCircle className="w-3 h-3" /> Closed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

export default function CurriculumFeedbackPanel() {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");

  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async () => {
    if (!programId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/institution/feedback/curriculum?programId=${programId}`,
      );
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load feedback data");
        return;
      }
      const json: FeedbackData = await res.json();
      setData(json);
      if (json.feedbackStartAt)
        setStartDate(json.feedbackStartAt.slice(0, 10));
      if (json.feedbackEndAt)
        setEndDate(json.feedbackEndAt.slice(0, 10));
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetTimeline = async () => {
    if (!programId || !startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be after start date");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/institution/feedback/curriculum", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          feedbackStartAt: startDate,
          feedbackEndAt: endDate,
          feedbackStatus: "open",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save timeline");
        return;
      }
      setSuccess("Feedback timeline saved — stakeholders can now submit responses.");
      await fetchData();
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const handleComplete = async () => {
    if (!programId) return;
    try {
      setCompleting(true);
      setError(null);
      const res = await fetch("/api/institution/feedback/curriculum", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, feedbackStatus: "completed" }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to complete phase");
        return;
      }
      setSuccess("Feedback phase marked as completed.");
      await fetchData();
    } finally {
      setCompleting(false);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!programId) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
        Please select a program to manage curriculum feedback.
      </div>
    );
  }

  const avgRating =
    data && data.responses.length > 0
      ? data.responses.reduce((s, r) => s + r.rating, 0) / data.responses.length
      : null;

  const checklistDone = data ? data.checklist.filter((c) => c.done).length : 0;
  const checklistTotal = data ? data.checklist.length : 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Float Feedback on Curriculum
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Set the feedback window so stakeholders can review and rate the curriculum.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <StatusBadge status={data.feedbackStatus} isOpen={data.isOpen} />
          )}
          <button
            onClick={fetchData}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Timeline Setter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">
              Feedback Window (Float to Stakeholders)
            </h4>
            <p className="text-xs text-slate-500">
              Stakeholders can submit feedback only within this window.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSetTimeline}
            disabled={saving || !startDate || !endDate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Float to Stakeholders
          </button>
          <button
            onClick={handleComplete}
            disabled={completing || data?.feedbackStatus === "completed"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {completing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Complete Feedback Phase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stakeholder Responses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-slate-900">Stakeholder Responses</h4>
            </div>
            {data && data.responses.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5" />
                {data.responses.length} response
                {data.responses.length !== 1 ? "s" : ""}
                {avgRating !== null && (
                  <span className="ml-1 font-semibold text-amber-600">
                    · Avg {avgRating.toFixed(1)}/5
                  </span>
                )}
              </div>
            )}
          </div>

          {data && data.responses.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {data.responses.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {r.member_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.category} · {r.organization}
                      </p>
                    </div>
                    <StarRating value={r.rating} />
                  </div>
                  {r.comments && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      "{r.comments}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {new Date(r.submitted_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500 italic">
                {data?.isOpen
                  ? "No responses yet — feedback window is open."
                  : "Float the feedback window to begin collecting responses."}
              </p>
            </div>
          )}
        </div>

        {/* Compliance Checklist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="font-semibold text-slate-900">OBE Compliance Checklist</h4>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {checklistDone}/{checklistTotal} Done
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
            />
          </div>

          <div className="space-y-2.5">
            {(data?.checklist || []).map((item) => (
              <div
                key={item.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                  item.done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-500",
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                {item.label}
              </div>
            ))}
          </div>

          {checklistDone < checklistTotal && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Complete all prerequisite steps before finalising the curriculum.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
