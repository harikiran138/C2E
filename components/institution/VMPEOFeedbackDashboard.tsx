'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CalendarRange, FileDown, RefreshCw } from 'lucide-react';
import { useInstitution } from '@/context/InstitutionContext';

type FeedbackCycle = 'brainstorming' | 'finalization';
type FeedbackCategory = '' | 'vision' | 'mission' | 'peo';

type ReportResponse = {
  program: {
    id: string;
    name: string;
    timelineStartAt: string | null;
    timelineEndAt: string | null;
    feedbackCycle: FeedbackCycle;
  };
  rows: Array<{
    submissionId: string;
    instituteName: string;
    stakeholderId: string;
    stakeholderName: string;
    category: 'vision' | 'mission' | 'peo';
    categoryLabel: string;
    rating: number;
    comment: string | null;
    date: string;
    feedbackCycle: FeedbackCycle;
  }>;
  summary: {
    totalEntries: number;
    totalSubmissions: number;
    averageVision: number | null;
    averageMission: number | null;
    visionApprovalPercentage: number;
    averagePeoScores: Array<{
      peoNumber: number;
      peoStatement: string;
      averageRating: number;
      totalResponses: number;
    }>;
  };
  commentsByPeo: Array<{
    peoNumber: number;
    peoStatement: string;
    averageRating: number;
    totalResponses: number;
    comments: Array<{
      stakeholderId: string;
      stakeholderName: string;
      rating: number;
      comment: string;
      date: string;
    }>;
  }>;
  availableStakeholders: Array<{ stakeholderId: string; stakeholderName: string }>;
};

function toDatetimeLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function VMPEOFeedbackDashboard() {
  const searchParams = useSearchParams();
  const { selectedProgram } = useInstitution();

  const programId = searchParams.get('programId') || selectedProgram?.id || '';

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineMessage, setTimelineMessage] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory>('');
  const [stakeholderFilter, setStakeholderFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  const [feedbackStartAt, setFeedbackStartAt] = useState('');
  const [feedbackEndAt, setFeedbackEndAt] = useState('');
  const [feedbackCycle, setFeedbackCycle] = useState<FeedbackCycle>('brainstorming');

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('programId', programId);
    if (categoryFilter) params.set('category', categoryFilter);
    if (stakeholderFilter.trim()) params.set('stakeholder', stakeholderFilter.trim());
    if (fromDateFilter) params.set('fromDate', fromDateFilter);
    if (toDateFilter) params.set('toDate', toDateFilter);
    return params.toString();
  }, [programId, categoryFilter, stakeholderFilter, fromDateFilter, toDateFilter]);

  const loadReport = async () => {
    if (!programId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('programId', programId);
      if (categoryFilter) params.set('category', categoryFilter);
      if (stakeholderFilter.trim()) params.set('stakeholder', stakeholderFilter.trim());
      if (fromDateFilter) params.set('fromDate', fromDateFilter);
      if (toDateFilter) params.set('toDate', toDateFilter);

      const response = await fetch(`/api/institution/feedback/vmpeo/report?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load report');
      }

      setReport(payload);
      setFeedbackStartAt(toDatetimeLocalInput(payload.program.timelineStartAt));
      setFeedbackEndAt(toDatetimeLocalInput(payload.program.timelineEndAt));
      setFeedbackCycle(payload.program.feedbackCycle || 'brainstorming');
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [programId]);

  const handleApplyFilters = async () => {
    await loadReport();
  };

  const handleResetFilters = async () => {
    setCategoryFilter('');
    setStakeholderFilter('');
    setFromDateFilter('');
    setToDateFilter('');

    if (!programId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/institution/feedback/vmpeo/report?programId=${programId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to reset filters');
      }
      setReport(payload);
      setFeedbackStartAt(toDatetimeLocalInput(payload.program.timelineStartAt));
      setFeedbackEndAt(toDatetimeLocalInput(payload.program.timelineEndAt));
      setFeedbackCycle(payload.program.feedbackCycle || 'brainstorming');
    } catch (err: any) {
      setError(err.message || 'Failed to reset filters');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTimeline = async () => {
    if (!programId) return;
    if (!feedbackStartAt || !feedbackEndAt) {
      setTimelineMessage('Feedback start and end datetime are required.');
      return;
    }

    setSavingTimeline(true);
    setTimelineMessage(null);
    try {
      const response = await fetch('/api/institution/feedback/vmpeo/timeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          feedbackStartAt: new Date(feedbackStartAt).toISOString(),
          feedbackEndAt: new Date(feedbackEndAt).toISOString(),
          feedbackCycle,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update timeline');
      }

      setTimelineMessage('Feedback timeline updated.');
      await loadReport();
    } catch (err: any) {
      setTimelineMessage(err.message || 'Failed to update timeline');
    } finally {
      setSavingTimeline(false);
    }
  };

  if (!programId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-medium text-amber-700">
        Select a program to configure and review Vision, Mission and PEO stakeholder feedback.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange className="size-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Feedback Timeline Control</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Feedback Start</span>
            <input
              type="datetime-local"
              value={feedbackStartAt}
              onChange={(event) => setFeedbackStartAt(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Feedback End</span>
            <input
              type="datetime-local"
              value={feedbackEndAt}
              onChange={(event) => setFeedbackEndAt(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Feedback Cycle</span>
            <select
              value={feedbackCycle}
              onChange={(event) => setFeedbackCycle(event.target.value as FeedbackCycle)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="brainstorming">Brainstorming</option>
              <option value="finalization">Finalization</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={handleSaveTimeline}
              disabled={savingTimeline}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingTimeline ? <Loader2 className="size-4 animate-spin" /> : 'Save Timeline'}
            </button>
          </div>
        </div>
        {timelineMessage && <p className="mt-3 text-sm font-medium text-slate-600">{timelineMessage}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Vision, Mission and PEO feedback</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/institution/feedback/vmpeo/export?${exportQuery}&format=excel`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="size-4" /> Export Excel
            </a>
            <a
              href={`/api/institution/feedback/vmpeo/export?${exportQuery}&format=pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="size-4" /> Export PDF
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Category</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as FeedbackCategory)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">All</option>
              <option value="vision">Vision</option>
              <option value="mission">Mission</option>
              <option value="peo">PEO</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Stakeholder</span>
            <input
              value={stakeholderFilter}
              onChange={(event) => setStakeholderFilter(event.target.value)}
              list="stakeholder-options"
              placeholder="Stakeholder ID"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
            />
            <datalist id="stakeholder-options">
              {(report?.availableStakeholders || []).map((item) => (
                <option key={item.stakeholderId} value={item.stakeholderId}>
                  {item.stakeholderName}
                </option>
              ))}
            </datalist>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">From</span>
            <input
              type="date"
              value={fromDateFilter}
              onChange={(event) => setFromDateFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">To</span>
            <input
              type="date"
              value={toDateFilter}
              onChange={(event) => setToDateFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilters}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              title="Reset filters"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <MetricCard label="Total Submissions" value={report?.summary.totalSubmissions ?? 0} />
            <MetricCard label="Total Entries" value={report?.summary.totalEntries ?? 0} />
            <MetricCard label="Avg Vision" value={report?.summary.averageVision ?? 'NA'} />
            <MetricCard label="Avg Mission" value={report?.summary.averageMission ?? 'NA'} />
            <MetricCard label="Vision Approval %" value={`${report?.summary.visionApprovalPercentage ?? 0}%`} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-slate-900">Consolidated Feedback Table</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                    <th className="border border-slate-200 px-3 py-2">Institute Name</th>
                    <th className="border border-slate-200 px-3 py-2">Stakeholder ID</th>
                    <th className="border border-slate-200 px-3 py-2">Category</th>
                    <th className="border border-slate-200 px-3 py-2">Rating</th>
                    <th className="border border-slate-200 px-3 py-2">Comment</th>
                    <th className="border border-slate-200 px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.rows || []).map((row) => (
                    <tr key={`${row.submissionId}-${row.categoryLabel}-${row.date}`} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2">{row.instituteName}</td>
                      <td className="border border-slate-200 px-3 py-2">{row.stakeholderId}</td>
                      <td className="border border-slate-200 px-3 py-2">{row.categoryLabel}</td>
                      <td className="border border-slate-200 px-3 py-2">{row.rating}</td>
                      <td className="max-w-md border border-slate-200 px-3 py-2">{row.comment || '-'}</td>
                      <td className="border border-slate-200 px-3 py-2">{new Date(row.date).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(report?.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="border border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                        No feedback records found for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-slate-900">Average Score Per PEO</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(report?.summary.averagePeoScores || []).map((peo) => (
                <div key={peo.peoNumber} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">PEO-{String(peo.peoNumber).padStart(2, '0')}</p>
                  <p className="mt-1 text-xs text-slate-600">{peo.peoStatement}</p>
                  <p className="mt-2 text-sm font-semibold text-indigo-700">
                    Avg: {peo.averageRating} / 5 ({peo.totalResponses} responses)
                  </p>
                </div>
              ))}
              {(report?.summary.averagePeoScores || []).length === 0 && (
                <p className="text-sm text-slate-500">No PEO average data available.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-slate-900">Comments Grouped by PEO Mapping</h3>
            <div className="space-y-4">
              {(report?.commentsByPeo || []).map((group) => (
                <div key={group.peoNumber} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    PEO-{String(group.peoNumber).padStart(2, '0')} • Avg {group.averageRating}/5
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{group.peoStatement}</p>
                  <div className="mt-3 space-y-2">
                    {group.comments.map((comment, idx) => (
                      <div key={`${comment.stakeholderId}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                        <p className="font-semibold text-slate-700">
                          {comment.stakeholderId} ({comment.rating}/5)
                        </p>
                        <p className="mt-1 text-slate-600">{comment.comment}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(comment.date).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(report?.commentsByPeo || []).length === 0 && (
                <p className="text-sm text-slate-500">No PEO comments available.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
