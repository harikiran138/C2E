"use client";

import React from "react";
import { ArrowLeft, ClipboardCheck, CheckCircle2, ChevronRight, Loader2, ArrowUp } from "lucide-react";
import { useStakeholderSurvey } from "../../hooks/useStakeholderSurvey";
import { 
  ProfileSection, CareerSection, TechnicalSection, 
  EmergingSection, SkillsSection, LifelongSection, 
  SocietalSection, ValidationSection, SuggestionsSection,
  SurveySidebar 
} from "./survey/SurveySections";

export default function StakeholderSurvey({
  programId,
  programName: initialProgramName,
  onBack,
}: {
  programId: string;
  programName?: string;
  onBack?: () => void;
}) {
  const {
    formData,
    programName,
    submitted,
    loading,
    setSubmitted,
    handleInputChange,
    handleCheckboxChange,
    handleRatingChange,
    handleSubmit,
    calculateProgress,
  } = useStakeholderSurvey(initialProgramName, onBack);

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="size-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto border-4 border-white dark:border-slate-900 shadow-xl">
            <CheckCircle2 className="size-12 text-green-600 dark:text-green-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
              Consultation Complete
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Your feedback for <span className="text-primary-gold font-bold">{programName}</span> has been securely recorded. 
              This input will directly shape the PEOs and curriculum for the next accreditation cycle.
            </p>
          </div>
          <button
            onClick={() => (onBack ? onBack() : window.location.reload())}
            className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-5 rounded-xl shadow-lg hover:shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            Return to Dashboard
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="size-10 bg-primary-gold rounded-xl flex items-center justify-center shadow-lg shadow-primary-gold/20">
                <ClipboardCheck className="size-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Stakeholder Consultation
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary-gold">
                  Official Feedback Channel
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Department
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                ME (Mechanical Engineering)
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Main Form Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 md:p-12 shadow-sm relative overflow-hidden">
               <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
                <ProfileSection formData={formData} handleInputChange={handleInputChange} />
                <CareerSection formData={formData} handleCheckboxChange={handleCheckboxChange} />
                <TechnicalSection formData={formData} handleInputChange={handleInputChange} />
                <EmergingSection formData={formData} handleInputChange={handleInputChange} handleCheckboxChange={handleCheckboxChange} />
                <SkillsSection formData={formData} handleRatingChange={handleRatingChange} handleInputChange={handleInputChange} />
                <LifelongSection formData={formData} handleInputChange={handleInputChange} handleCheckboxChange={handleCheckboxChange} />
                <SocietalSection formData={formData} handleInputChange={handleInputChange} handleCheckboxChange={handleCheckboxChange} />
                <ValidationSection formData={formData} handleInputChange={handleInputChange} handleCheckboxChange={handleCheckboxChange} />
                <SuggestionsSection formData={formData} handleInputChange={handleInputChange} />

                {/* Submit Logic */}
                <div className="pt-12 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full bg-slate-900 dark:bg-slate-700 text-white font-semibold py-6 rounded-xl shadow-2xl hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 overflow-hidden text-lg uppercase tracking-widest disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-gold/0 via-primary-gold/10 to-primary-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {loading ? (
                      <Loader2 className="animate-spin size-6" />
                    ) : (
                      <>
                        Complete Official Consultation
                        <ChevronRight className="size-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="w-full mt-4 py-4 text-xs font-semibold text-slate-400 hover:text-primary-gold transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowUp className="size-3" /> Back to Top
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <SurveySidebar calculateProgress={calculateProgress} />
        </div>
      </div>
    </div>
  );
}
