"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogOut,
  CalendarClock,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckSquare,
  Settings,
  ArrowLeft,
  Star,
  Quote,
  Sparkles,
  MessageSquarePlus,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import StakeholderSurvey from "@/components/institution/StakeholderSurvey";
import StakeholderLayout from "./StakeholderLayout";
import { Badge } from "@/components/ui/badge";

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
    cycle: "brainstorming" | "finalization";
    canSubmit: boolean;
    lockReason: string | null;
  };
  vision: string;
  mission: string;
  peos: Array<{ id: string; peoNumber: number; statement: string }>;
  latestSubmissionAt: string | null;
  steps: Record<string, boolean>;
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
  const [visionComment, setVisionComment] = useState("");
  const [missionRating, setMissionRating] = useState(0);
  const [missionComment, setMissionComment] = useState("");
  const [peoFeedback, setPeoFeedback] = useState<PEOFeedbackState>({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [view, setView] = useState<"validation" | "consultation" | "settings">(
    "validation",
  );

  const loadContext = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stakeholder/context");
      if (response.status === 401) {
        router.push("/institution/login?type=stakeholder");
        return;
      }
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load stakeholder context");
      }

      setContext(payload);

      // Fetch existing feedback to pre-fill
      const feedbackResponse = await fetch("/api/stakeholder/feedback");
      if (feedbackResponse.ok) {
        const feedbackPayload = await feedbackResponse.json();
        if (feedbackPayload.data) {
          const { entries } = feedbackPayload.data;
          
          const visionEntry = entries.find((e: any) => e.category === "vision");
          if (visionEntry) {
            setVisionRating(visionEntry.rating);
            setVisionComment(visionEntry.comment || "");
          }

          const missionEntry = entries.find((e: any) => e.category === "mission");
          if (missionEntry) {
            setMissionRating(missionEntry.rating);
            setMissionComment(missionEntry.comment || "");
          }

          const initialPEOState: PEOFeedbackState = {};
          payload.peos.forEach((peo: any) => {
            const entry = entries.find((e: any) => e.peo_id === peo.id);
            initialPEOState[peo.id] = {
              rating: entry?.rating || 0,
              comment: entry?.comment || "",
            };
          });
          setPeoFeedback(initialPEOState);
        } else {
          const initialPEOState: PEOFeedbackState = {};
          payload.peos.forEach((peo: any) => {
            initialPEOState[peo.id] = { rating: 0, comment: "" };
          });
          setPeoFeedback(initialPEOState);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
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
      if (!peoFeedback[peo.id] || peoFeedback[peo.id].rating === 0)
        pending += 1;
    });
    return pending;
  }, [context, visionRating, missionRating, peoFeedback]);

  const handleSubmit = async () => {
    if (!context) return;

    if (pendingFields > 0) {
      setError("Please provide ratings for Vision, Mission and all PEOs.");
      return;
    }

    if (!canSubmit) {
      setError(
        context.feedbackWindow.lockReason ||
          "Feedback timeline is currently closed.",
      );
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
          comment: peoFeedback[peo.id]?.comment || "",
        })),
      };

      const response = await fetch("/api/stakeholder/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit feedback");
      }

      setSuccess(
        `Feedback submitted successfully (${new Date(result.submittedAt).toLocaleString()}).`,
      );
      await loadContext();
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.clear();
      sessionStorage.clear();
      router.push("/institution/login?type=stakeholder");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/institution/login?type=stakeholder");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage(
        "Fill current password, new password, and confirmation.",
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      const response = await fetch("/api/stakeholder/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (err: any) {
      setPasswordMessage(err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
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
        {error || "Failed to load stakeholder dashboard."}
      </div>
    );
  }

  return (
    <StakeholderLayout
      stakeholder={{
        stakeholderName: context.stakeholder.stakeholderName,
        category: context.stakeholder.category,
        institutionName: context.stakeholder.institutionName,
        programName: context.stakeholder.programName,
      }}
      onLogout={handleLogout}
      activeView={view}
      setActiveView={setView}
    >
      <div className="space-y-8 pb-20">
        {/* Header removed as it is now in StakeholderLayout */}

        {view === "settings" ? (
          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Settings className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Account Settings
                </h2>
                <p className="text-sm text-slate-500">
                   Manage your security credentials and profile.
                </p>
              </div>
            </div>
            
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex items-center gap-4">
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="inline-flex h-12 items-center rounded-2xl bg-slate-900 px-8 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60 shadow-lg shadow-slate-200 transition-all active:scale-95"
                >
                  {passwordLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Update Password
                </button>
                {passwordMessage && (
                  <p className={cn(
                    "text-sm font-bold",
                    passwordMessage.includes("success") ? "text-emerald-600" : "text-red-500"
                  )}>
                    {passwordMessage}
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : view === "consultation" ? (
          <div className="-mx-4 md:mx-0">
            <StakeholderSurvey
              programId={context.stakeholder.programId}
              programName={context.stakeholder.programName}
              onBack={() => setView("validation")}
            />
          </div>
        ) : view === "validation" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div
                  className={cn(
                    "rounded-[32px] border p-6 flex items-center gap-4 transition-all duration-500",
                    canSubmit
                      ? "border-emerald-100 bg-emerald-50/30 text-emerald-900 shadow-sm"
                      : "border-amber-100 bg-amber-50/30 text-amber-900 shadow-sm",
                  )}
                >
                  <div className={cn(
                    "size-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-3",
                    canSubmit ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-amber-500 text-white shadow-amber-200"
                  )}>
                    {canSubmit ? (
                      <ShieldCheck className="size-6" />
                    ) : (
                      <CalendarClock className="size-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-sm">Feedback Cycle: {context.feedbackWindow.cycle}</h3>
                       <Badge variant="outline" className={cn(
                         "text-[10px] uppercase tracking-widest px-2 py-0",
                         canSubmit ? "border-emerald-200 text-emerald-600" : "border-amber-200 text-amber-600"
                       )}>
                         {canSubmit ? "Active" : "Locked"}
                       </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Window:{" "}
                      {context.feedbackWindow.startAt
                        ? new Date(context.feedbackWindow.startAt).toLocaleString()
                        : "Not set"}{" "}
                      -{" "}
                      {context.feedbackWindow.endAt
                        ? new Date(context.feedbackWindow.endAt).toLocaleString()
                        : "Not set"}
                    </p>
                  </div>
                  {context.latestSubmissionAt && (
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Last Submitted</p>
                      <p className="text-xs font-black text-emerald-600">
                        {new Date(context.latestSubmissionAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <FeedbackSection
                    title="Vision Review"
                    statement={context.vision}
                    rating={visionRating}
                    comment={visionComment}
                    onRating={setVisionRating}
                    onComment={setVisionComment}
                    isVision={true}
                  />

                  <FeedbackSection
                    title="Mission Review"
                    statement={context.mission}
                    rating={missionRating}
                    comment={missionComment}
                    onRating={setMissionRating}
                    onComment={setMissionComment}
                    isVision={false}
                  />

                  <section className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                       <MessageSquarePlus className="size-24 text-slate-900" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <Star className="size-4" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[.25em] text-slate-400">Section 03</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900">PEO Evaluation</h2>
                        <p className="mt-2 text-slate-500 max-w-lg">
                          Review and rate each Program Educational Objective based on its relevance and clarity.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {context.peos.length === 0 && (
                        <div className="rounded-[24px] border-2 border-dashed border-slate-200 p-12 text-center">
                          <p className="text-slate-400 font-medium italic">No PEOs configured for this program yet.</p>
                        </div>
                      )}

                      {context.peos.map((peo, idx) => (
                        <div
                          key={peo.id}
                          className="rounded-[32px] border border-slate-100 bg-slate-50/50 p-6 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="size-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-xs text-slate-900 shadow-sm shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </div>
                            <div className="flex-1 space-y-4">
                              <p className="text-sm font-bold text-slate-800 leading-relaxed italic">
                                "{peo.statement}"
                              </p>
                              
                              <div className="flex flex-col md:flex-row md:items-center gap-6 pt-2">
                                <RatingSelector
                                  value={peoFeedback[peo.id]?.rating || 0}
                                  onChange={(rating) => {
                                    setPeoFeedback((prev) => ({
                                      ...prev,
                                      [peo.id]: {
                                        rating,
                                        comment: prev[peo.id]?.comment || "",
                                      },
                                    }));
                                  }}
                                />
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={peoFeedback[peo.id]?.comment || ""}
                                    onChange={(event) => {
                                      const comment = event.target.value;
                                      setPeoFeedback((prev) => ({
                                        ...prev,
                                        [peo.id]: {
                                          rating: prev[peo.id]?.rating || 0,
                                          comment,
                                        },
                                      }));
                                    }}
                                    placeholder="Add specific observations..."
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-sm outline-none focus:border-indigo-600 transition-colors placeholder:text-slate-400"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4">
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || !canSubmit || context.peos.length === 0}
                        className="w-full sm:w-auto min-w-[240px] h-14 rounded-[20px] bg-indigo-600 px-10 text-sm font-black text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed group flex items-center justify-center gap-3"
                      >
                        {submitting ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="size-5" />
                            Submit Feedback
                          </>
                        )}
                      </button>
                      
                      {pendingFields > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 translate-y-2">
                           <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                             {pendingFields} Ratings Pending completion
                           </p>
                        </div>
                      )}
                      
                      {success && (
                        <p className="text-xs font-bold text-emerald-600 animate-in fade-in slide-in-from-top-2">
                          {success}
                        </p>
                      )}
                      {error && !success && (
                        <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-2">
                          {error}
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Sidebar Info/Timeline */}
              <div className="space-y-6">
                 <ReviewTimeline steps={context.steps} cycle={context.feedbackWindow.cycle} />
                 
                 <div className="rounded-[32px] bg-slate-900 p-8 text-white shadow-2xl shadow-indigo-200/20 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 size-40 bg-indigo-500/20 blur-[80px] rounded-full" />
                    <h3 className="text-lg font-black mb-4">Program Context</h3>
                    <div className="space-y-4">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Institution</p>
                          <p className="text-sm font-bold truncate">{context.stakeholder.institutionName}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Department</p>
                          <p className="text-sm font-bold truncate">{context.stakeholder.programName}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Academic Year</p>
                          <p className="text-sm font-bold">2024 - 2025</p>
                       </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10">
                       <div className="flex items-center gap-2 mb-2 text-indigo-400">
                          <HelpCircle className="size-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Need Help?</span>
                       </div>
                       <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                          Contact the program coordinator if you have questions about the review process.
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </StakeholderLayout>
  );
}

function ReviewTimeline({ steps, cycle }: { steps: Record<string, boolean>, cycle: string }) {
  const stages = [
    { key: "vision_mission_drafting", label: "Drafting", description: "Internal preparation" },
    { key: "stakeholder_feedback_open", label: "Consultation", description: "Feedback phase" },
    { key: "pac_review_in_progress", label: "PAC Review", description: "Committee review" },
    { key: "bos_final_approval", label: "BOS Approval", description: "Admin approval" },
    { key: "vision_mission_published", label: "Published", description: "V-M finalized" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-6 px-1">Review Timeline</h2>
      <div className="relative flex justify-between">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 h-0.5 w-full bg-slate-100 -z-0" />
        
        {stages.map((stage, index) => {
          const isCompleted = !!steps[stage.key];
          const isCurrent = (stage.key === 'stakeholder_feedback_open'); // Manual override for now as this is the stakeholder dashboard
          
          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center flex-1">
              <div className={cn(
                "size-10 rounded-full border-4 flex items-center justify-center transition-all duration-500",
                isCompleted 
                  ? "bg-emerald-500 border-emerald-100 text-white" 
                  : isCurrent 
                  ? "bg-indigo-600 border-indigo-100 text-white shadow-lg shadow-indigo-100 scale-110"
                  : "bg-white border-slate-100 text-slate-300"
              )}>
                {isCompleted ? (
                  <CheckSquare className="size-5" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              <div className="mt-3 text-center">
                <p className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-500"
                )}>
                  {stage.label}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400 hidden md:block">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
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
  isVision
}: {
  title: string;
  statement: string;
  rating: number;
  comment: string;
  onRating: (value: number) => void;
  onComment: (value: string) => void;
  isVision: boolean;
}) {
  return (
    <section className="rounded-[40px] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
         {isVision ? <Sparkles className="size-24 text-slate-900" /> : <Quote className="size-24 text-slate-900" />}
      </div>
      
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="size-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
          <Quote className="size-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[.25em] text-slate-400">Section {isVision ? '01' : '02'}</span>
      </div>
      
      <h2 className="text-3xl font-black text-slate-900">{title}</h2>
      
      <div className="mt-6 flex gap-4">
         <div className="w-1 bg-indigo-600 rounded-full my-1 shrink-0" />
         <p className="text-lg font-bold text-slate-700 leading-relaxed italic">
           "{statement || "The statement is currently under finalization."}"
         </p>
      </div>

      <div className="mt-10 flex flex-col md:flex-row md:items-center gap-8 border-t border-slate-50 pt-8">
        <RatingSelector value={rating} onChange={onRating} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 ml-1 text-slate-400">
             <MessageSquarePlus className="size-3.5" />
             <span className="text-[10px] font-black uppercase tracking-widest">Constructive Feedback</span>
          </div>
          <textarea
            value={comment}
            onChange={(event) => onComment(event.target.value)}
            placeholder="Type your feedback here..."
            className="w-full min-h-[80px] rounded-[24px] border border-slate-100 bg-slate-50/50 p-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-300"
          />
        </div>
      </div>
    </section>
  );
}

function RatingSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="space-y-3 shrink-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Overall Satisfaction</p>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = rating <= value;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={cn(
                "group relative flex size-11 items-center justify-center rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105"
                  : "border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId={`rating-glow-${rating}`}
                  className="absolute inset-0 bg-white/10" 
                />
              )}
              <span className="text-sm font-black relative z-10">{rating}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
