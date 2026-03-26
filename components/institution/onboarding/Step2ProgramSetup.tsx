import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Layers, ArrowLeft, ArrowRight } from "lucide-react";
import {
  GlassInputWrapper,
  SectionTitle,
  fadeIn,
} from "./OnboardingShared";
import { DEGREES, LEVELS } from "@/lib/validation/onboarding";
import { Program, NewProgramState } from "@/lib/hooks/useInstitutionOnboarding";

interface Step2Props {
  programs: Program[];
  newProgram: NewProgramState;
  setNewProgram: (program: NewProgramState) => void;
  handleAddProgram: () => void;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}

export const Step2ProgramSetup = ({
  programs,
  newProgram,
  setNewProgram,
  handleAddProgram,
  loading,
  onBack,
  onNext,
}: Step2Props) => {
  return (
    <motion.div
      key="step2"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full"
    >
      <div
        className="w-full bg-card/60 backdrop-blur-3xl rounded-3xl border border-border/50 shadow-2xl relative overflow-y-auto overscroll-y-contain scroll-smooth scrollbar-hide p-8 lg:p-10 pb-20 h-[80vh]"
        data-lenis-prevent
      >
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20" />

        <div className="mb-8 text-center px-2">
          <SectionTitle
            title="Add Programs"
            subtitle="List the academic programs offered by your institution."
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Program Name
              </label>
              <GlassInputWrapper>
                <input
                  placeholder="e.g. Computer Science and Engineering"
                  className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                  value={newProgram.program_name}
                  onChange={(e) =>
                    setNewProgram({
                      ...newProgram,
                      program_name: e.target.value,
                    })
                  }
                />
              </GlassInputWrapper>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Degree
                </label>
                <div className="relative">
                  <GlassInputWrapper>
                    <select
                      className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                      value={newProgram.degree}
                      onChange={(e) =>
                        setNewProgram({
                          ...newProgram,
                          degree: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Degree</option>
                      {DEGREES.map((deg) => (
                        <option key={deg} value={deg}>
                          {deg}
                        </option>
                      ))}
                    </select>
                  </GlassInputWrapper>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Level
                </label>
                <div className="relative">
                  <GlassInputWrapper>
                    <select
                      className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                      value={newProgram.level}
                      onChange={(e) =>
                        setNewProgram({
                          ...newProgram,
                          level: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Level</option>
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </GlassInputWrapper>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Program Duration
                </label>
                <div className="relative">
                  <GlassInputWrapper>
                    <select
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                      value={newProgram.duration}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setNewProgram({
                          ...newProgram,
                          duration: isNaN(val) ? "" : val,
                        });
                      }}
                    >
                      <option value="">Select Duration</option>
                      <option value="2">2 Years</option>
                      <option value="3">3 Years</option>
                      <option value="4">4 Years</option>
                      <option value="5">5 Years</option>
                    </select>
                  </GlassInputWrapper>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Intake Capacity
                </label>
                <GlassInputWrapper>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 60"
                    className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                    value={newProgram.intake}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setNewProgram({
                          ...newProgram,
                          intake: "",
                        });
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) {
                          setNewProgram({
                            ...newProgram,
                            intake: parsed,
                          });
                        }
                      }
                    }}
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Year Of Establishment
                </label>
                <GlassInputWrapper>
                  <input
                    type="text"
                    className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                    placeholder="e.g. 2025"
                    value={newProgram.academic_year}
                    onChange={(e) =>
                      setNewProgram({
                        ...newProgram,
                        academic_year: e.target.value,
                      })
                    }
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Program Code
                </label>
                <GlassInputWrapper>
                  <input
                    placeholder="e.g. CSE-101"
                    className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 uppercase"
                    value={newProgram.program_code}
                    onChange={(e) =>
                      setNewProgram({
                        ...newProgram,
                        program_code: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </GlassInputWrapper>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddProgram}
              className="w-full py-4 mt-2 border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl font-bold text-primary transition-all flex items-center justify-center gap-2 group"
              disabled={loading}
            >
              <Plus className="size-5 group-hover:rotate-90 transition-transform" /> Add Program
            </button>
          </div>

          <div className="space-y-4 pt-6 border-t border-border/50">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Added
              Programs ({programs.length})
            </h3>
            {programs.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border/60 rounded-xl bg-background/20">
                <p className="text-muted-foreground text-sm font-medium">
                  No programs added yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {programs.map((p, idx) => (
                    <motion.div
                      key={p.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-4 bg-background/60 border border-border/50 rounded-xl flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {p.program_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                          {p.degree} • {p.level} • {p.duration}Y •
                          Intake: {p.intake} • {p.program_code}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/50 flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-4 bg-background/50 border border-border text-muted-foreground font-bold rounded-xl hover:bg-background hover:text-foreground transition-all flex items-center gap-2"
          >
            <ArrowLeft className="size-5" /> Back
          </button>
          <button
            onClick={onNext}
            className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={programs.length === 0}
          >
            Define Vision & Mission <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
