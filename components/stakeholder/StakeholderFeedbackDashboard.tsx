'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, CalendarClock, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContextResponse = {
  stakeholder: {
    stakeholderRefId: string;
    stakeholderId: string;
    stakeholderName: string;
    category: string;
    institutionName: string;
    programId: string;
    programName: string;
  };
  feedbackWindow: {
    startAt: string | null;
    endAt: string | null;
    cycle: 'brainstorming' | 'finalization';
    canSubmit: boolean;
    lockReason: string | null;
  };
  vision: string;
  mission: string;
  peos: Array<{ id: string; peoNumber: number; statement: string }>;
  latestSubmissionAt: string | null;
};

type PEOFeedbackState = Record<string, { rating: number; comment: string }>;

export default function StakeholderFeedbackDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [visionRating, setVisionRating] = useState(0);
  const [visionComment, setVisionComment] = useState('');
  const [missionRating, setMissionRating] = useState(0);
  const [missionComment, setMissionComment] = useState('');
  const [peoFeedback, setPeoFeedback] = useState<PEOFeedbackState>({});

  const loadContext = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stakeholder/context');
      if (response.status === 401) {
        router.push('/stakeholder/login');
        return;
      }
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load stakeholder context');
      }

      setContext(payload);

      const initialPEOState: PEOFeedbackState = {};
      payload.peos.forEach((peo: any) => {
        initialPEOState[peo.id] = { rating: 0, comment: '' };
      });
      setPeoFeedback(initialPEOState);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  const canSubmit = !!context?.feedbackWindow.canSubmit;

  const pendingFields = useMemo(() => {
    if (!context) return 0;
    let pending = 0;
    if (visionRating === 0) pending += 1;
    if (missionRating === 0) pending += 1;
    context.peos.forEach((peo) => {
      if (!peoFeedback[peo.id] || peoFeedback[peo.id].rating === 0) pending += 1;
    });
    return pending;
  }, [context, visionRating, missionRating, peoFeedback]);

  const handleSubmit = async () => {
    if (!context) return;

    if (pendingFields > 0) {
      setError('Please provide ratings for Vision, Mission and all PEOs.');
      return;
    }

    if (!canSubmit) {
      setError(context.feedbackWindow.lockReason || 'Feedback timeline is currently closed.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        vision: { rating: visionRating, comment: visionComment },
        mission: { rating: missionRating, comment: missionComment },
        peos: context.peos.map((peo) => ({
          peoId: peo.id,
          rating: peoFeedback[peo.id]?.rating || 0,
          comment: peoFeedback[peo.id]?.comment || '',
        })),
      };

      const response = await fetch('/api/stakeholder/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setSuccess(`Feedback submitted successfully (${new Date(result.submittedAt).toLocaleString()}).`);
      await loadContext();
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/stakeholder/logout', { method: 'POST' });
    router.push('/stakeholder/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="mx-auto mt-24 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600">
        {error || 'Failed to load stakeholder dashboard.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Stakeholder Feedback Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">
                {context.stakeholder.institutionName} | {context.stakeholder.programName}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {context.stakeholder.stakeholderId} • {context.stakeholder.category}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="size-4" /> Logout
            </button>
          </div>
        </header>

        <div
          className={cn(
            'rounded-2xl border p-4 text-sm',
            canSubmit ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
          )}
        >
          <div className="flex items-center gap-2 font-semibold">
            {canSubmit ? <ShieldCheck className="size-4" /> : <CalendarClock className="size-4" />}
            Feedback Cycle: {context.feedbackWindow.cycle}
          </div>
          <p className="mt-1">
            Window: {context.feedbackWindow.startAt ? new Date(context.feedbackWindow.startAt).toLocaleString() : 'Not set'} to{' '}
            {context.feedbackWindow.endAt ? new Date(context.feedbackWindow.endAt).toLocaleString() : 'Not set'}
          </p>
          {!canSubmit && context.feedbackWindow.lockReason && (
            <p className="mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="size-4" /> {context.feedbackWindow.lockReason}
            </p>
          )}
          {context.latestSubmissionAt && (
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Last submitted at: {new Date(context.latestSubmissionAt).toLocaleString()}
            </p>
          )}
        </div>

        <FeedbackSection
          title="Vision Feedback"
          statement={context.vision}
          rating={visionRating}
          comment={visionComment}
          onRating={setVisionRating}
          onComment={setVisionComment}
        />

        <FeedbackSection
          title="Mission Feedback"
          statement={context.mission}
          rating={missionRating}
          comment={missionComment}
          onRating={setMissionRating}
          onComment={setMissionComment}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">PEO Feedback</h2>
          <p className="mt-1 text-sm text-slate-500">Provide rating and comments for each Program Educational Objective.</p>

          <div className="mt-5 space-y-5">
            {context.peos.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                No PEOs are configured for this program yet.
              </div>
            )}

            {context.peos.map((peo) => (
              <div key={peo.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-800">
                  PEO-{String(peo.peoNumber).padStart(2, '0')}:
                </p>
                <p className="mt-1 text-sm text-slate-600">{peo.statement}</p>
                <div className="mt-3">
                  <RatingSelector value={peoFeedback[peo.id]?.rating || 0} onChange={(rating) => {
                    setPeoFeedback((prev) => ({
                      ...prev,
                      [peo.id]: { rating, comment: prev[peo.id]?.comment || '' },
                    }));
                  }} />
                </div>
                <textarea
                  value={peoFeedback[peo.id]?.comment || ''}
                  onChange={(event) => {
                    const comment = event.target.value;
                    setPeoFeedback((prev) => ({
                      ...prev,
                      [peo.id]: { rating: prev[peo.id]?.rating || 0, comment },
                    }));
                  }}
                  placeholder="Comment for this PEO..."
                  className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        <div className="pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit || context.peos.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
          {pendingFields > 0 && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Pending ratings: {pendingFields}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackSection({
  title,
  statement,
  rating,
  comment,
  onRating,
  onComment,
}: {
  title: string;
  statement: string;
  rating: number;
  comment: string;
  onRating: (value: number) => void;
  onComment: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{statement || 'Not configured'}</p>
      <div className="mt-4">
        <RatingSelector value={rating} onChange={onRating} />
      </div>
      <textarea
        value={comment}
        onChange={(event) => onComment(event.target.value)}
        placeholder="Write your comments..."
        className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
      />
    </section>
  );
}

function RatingSelector({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Rating:</span>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={cn(
            'flex size-9 items-center justify-center rounded-lg border text-sm font-bold transition',
            rating <= value
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
          )}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}
