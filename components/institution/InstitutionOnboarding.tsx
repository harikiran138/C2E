"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import AuthBackground from "../ui/AuthBackground";

// HOOK
import { useInstitutionOnboarding } from "@/lib/hooks/useInstitutionOnboarding";

// SUB-COMPONENTS
import { Step1InstitutionProfile } from "./onboarding/Step1InstitutionProfile";
import { Step2ProgramSetup } from "./onboarding/Step2ProgramSetup";
import { Step3VisionMission } from "./onboarding/Step3VisionMission";
import { Step4Review } from "./onboarding/Step4Review";

export default function InstitutionOnboarding() {
  const {
    currentStep,
    setCurrentStep,
    loading,
    errorMsg,
    instDetails,
    setInstDetails,
    programs,
    newProgram,
    setNewProgram,
    selectedCountry,
    setSelectedCountry,
    selectedState,
    setSelectedState,
    countries,
    states,
    cities,
    scrollRef,
    handleAddProgram,
    handleBack,
    handleNext,
    handleCompleteOnboarding,
  } = useInstitutionOnboarding();

  const steps = [
    { step: 1, label: "Institution Details" },
    { step: 2, label: "Program Details" },
    { step: 3, label: "Vision & Mission" },
    { step: 4, label: "Review & Submit" },
  ];

  return (
    <AuthBackground fullScreen className="!p-0">
      <div className="flex flex-col lg:flex-row w-full h-screen relative font-sans selection:bg-primary/20 overflow-hidden">
        {/* Sidebar Info */}
        <section className="hidden lg:flex flex-[0.85] flex-col justify-between p-12 lg:p-16 bg-sidebar/40 backdrop-blur-3xl border-r border-border/40 text-foreground relative z-10 h-full overflow-y-auto">
          <div className="space-y-12">
            <div className="flex items-center gap-3">
              <div className="size-12 relative">
                <Image
                  src="/C2XPlus.jpeg"
                  alt="C2X Plus"
                  fill
                  className="object-contain rounded-xl shadow-2xl shadow-primary/20"
                />
              </div>
              <div className="text-left">
                <span className="block text-xl font-bold tracking-tight leading-none text-foreground">
                  C2XPlus
                </span>
                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-muted-foreground mt-1 block">
                  Onboarding
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                {currentStep === 1 && "Setup your institution profile"}
                {currentStep === 2 && "Add your academic programs"}
                {currentStep === 3 && "Define your Institute Vision & Mission"}
                {currentStep === 4 && "Review and finalize your data."}
              </h1>
              <p className="text-base text-muted-foreground font-medium max-w-md">
                Complete these steps to unlock your institutional dashboard and
                start your journey towards excellence.
              </p>
            </div>

            <div className="space-y-4">
              {steps.map((s) => {
                const active = currentStep >= s.step;
                const completed = currentStep > s.step;
                return (
                  <div
                    key={s.step}
                    className={cn(
                      "flex items-center gap-4 transition-all duration-500",
                      active ? "opacity-100 translate-x-1" : "opacity-20 translate-x-0"
                    )}
                  >
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-lg",
                        completed
                          ? "bg-emerald-500 text-white shadow-emerald-500/20"
                          : active
                            ? "bg-primary text-primary-foreground shadow-primary/20"
                            : "border border-border bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {completed ? <CheckCircle2 className="size-5" /> : s.step}
                    </div>
                    <span
                      className={cn(
                        "font-bold text-sm uppercase tracking-wider",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            © {new Date().getFullYear()} C2XPlus Systems
          </div>
        </section>

        <main
          ref={scrollRef}
          className="flex-[1.15] relative z-10 bg-background/5"
        >
          <div className="min-h-full flex flex-col items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-[620px] space-y-8 py-12">
              {/* Back Button - Only show if step > 1 */}
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl bg-card/40 border border-border/40 backdrop-blur-xl hover:scale-105"
                >
                  <ArrowLeft className="size-4" /> Back
                </button>
              )}

              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3"
                  >
                    <AlertCircle className="size-5 text-red-500 shrink-0" />
                    <p className="text-sm font-semibold text-red-600">
                      {errorMsg}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <Step1InstitutionProfile
                    instDetails={instDetails}
                    setInstDetails={setInstDetails}
                    selectedCountry={selectedCountry}
                    setSelectedCountry={setSelectedCountry}
                    selectedState={selectedState}
                    setSelectedState={setSelectedState}
                    countries={countries}
                    states={states}
                    cities={cities}
                    loading={loading}
                    onNext={handleNext}
                  />
                )}
                {currentStep === 2 && (
                  <Step2ProgramSetup
                    programs={programs}
                    newProgram={newProgram}
                    setNewProgram={setNewProgram}
                    handleAddProgram={handleAddProgram}
                    loading={loading}
                    onBack={handleBack}
                    onNext={handleNext}
                  />
                )}
                {currentStep === 3 && (
                  <Step3VisionMission
                    instDetails={instDetails}
                    setInstDetails={setInstDetails}
                    loading={loading}
                    onBack={handleBack}
                    onNext={handleNext}
                  />
                )}
                {currentStep === 4 && (
                  <Step4Review
                    instDetails={instDetails}
                    programs={programs}
                    loading={loading}
                    onBack={handleBack}
                    onComplete={handleCompleteOnboarding}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </AuthBackground>
  );
}
