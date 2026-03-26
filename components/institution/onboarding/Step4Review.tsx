import * as React from "react";
import { motion } from "framer-motion";
import { Building2, MapPin, Layers, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { SectionTitle, fadeIn } from "./OnboardingShared";
import { InstitutionDetails, Program } from "@/lib/hooks/useInstitutionOnboarding";

interface Step4Props {
  instDetails: InstitutionDetails;
  programs: Program[];
  loading: boolean;
  onBack: () => void;
  onComplete: () => void;
}

export const Step4Review = ({
  instDetails,
  programs,
  loading,
  onBack,
  onComplete,
}: Step4Props) => {
  return (
    <motion.div
      key="step4"
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
            title="Final Review"
            subtitle="Verify your institutional and program data before submission."
          />
        </div>

        <div className="space-y-8">
          {/* Institution Summary */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1">
              <Building2 className="size-4 text-primary" /> Institution Summary
            </h4>
            <div className="bg-background/40 border border-border/50 rounded-2xl p-6 grid grid-cols-2 gap-6 shadow-sm group hover:border-primary/20 transition-all">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Type
                </p>
                <p className="font-bold text-slate-800">
                  {instDetails.institution_type}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Status
                </p>
                <p className="font-bold text-slate-800">
                  {instDetails.institution_status}
                </p>
              </div>
              <div className="col-span-2 pt-4 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Location
                </p>
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <MapPin className="size-4 text-primary" />
                  {instDetails.city}, {instDetails.state}
                </div>
              </div>
              <div className="col-span-2 pt-4 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Vision
                </p>
                <p className="text-slate-700 text-sm font-medium leading-relaxed italic">
                  "{instDetails.vision}"
                </p>
              </div>
              <div className="col-span-2 pt-4 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Mission
                </p>
                <p className="text-slate-700 text-sm font-medium leading-relaxed italic">
                  "{instDetails.mission}"
                </p>
              </div>
            </div>
          </div>

          {/* Programs Summary */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1">
              <Layers className="size-4 text-primary" /> Programs ({programs.length})
            </h4>
            <div className="space-y-3">
              {programs.map((p, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-background/40 border border-border/50 rounded-2xl shadow-sm hover:border-primary/20 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-bold text-slate-800 text-base">
                      {p.program_name}
                    </p>
                    <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-primary/20">
                      {p.program_code}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-[11px] text-muted-foreground font-semibold">
                    <div>
                      <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter">
                        Degree
                      </span>{" "}
                      {p.degree}
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter">
                        Intake
                      </span>{" "}
                      {p.intake}
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter">
                        Duration
                      </span>{" "}
                      {p.duration} Years
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-4 bg-background/50 border border-border text-muted-foreground font-bold rounded-xl hover:bg-background hover:text-foreground transition-all flex items-center gap-2"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            onClick={onComplete}
            className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin size-5" />
            ) : (
              <>
                Complete & Launch Portal{" "}
                <CheckCircle2 className="size-5 group-hover:scale-110 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
