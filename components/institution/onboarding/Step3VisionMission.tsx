import * as React from "react";
import { motion } from "framer-motion";
import { Building2, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  GlassInputWrapper,
  SectionTitle,
  fadeIn,
} from "./OnboardingShared";
import { InstitutionDetails } from "@/lib/hooks/useInstitutionOnboarding";

interface Step3Props {
  instDetails: InstitutionDetails;
  setInstDetails: (details: InstitutionDetails) => void;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}

export const Step3VisionMission = ({
  instDetails,
  setInstDetails,
  loading,
  onBack,
  onNext,
}: Step3Props) => {
  return (
    <motion.div
      key="step3"
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
            title="Define Institute Vision & Mission"
            subtitle="State the overarching vision and mission for your institution."
          />
        </div>

        <div className="space-y-12">
          {/* Institute VM */}
          <div className="space-y-6">
            <h3 className="font-bold text-primary uppercase text-xs tracking-widest flex items-center gap-2">
              <Building2 className="size-4" /> Institute Level
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Institute Vision
                </label>
                <GlassInputWrapper>
                  <textarea
                    className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 min-h-[100px] resize-none"
                    placeholder="To become a center of excellence..."
                    value={instDetails.vision || ""}
                    onChange={(e) =>
                      setInstDetails({
                        ...instDetails,
                        vision: e.target.value,
                      })
                    }
                  />
                </GlassInputWrapper>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Institute Mission
                </label>
                <GlassInputWrapper>
                  <textarea
                    className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 min-h-[100px] resize-none"
                    placeholder="To provide quality education..."
                    value={instDetails.mission || ""}
                    onChange={(e) =>
                      setInstDetails({
                        ...instDetails,
                        mission: e.target.value,
                      })
                    }
                  />
                </GlassInputWrapper>
              </div>
            </div>
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
            className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin size-5" />
            ) : (
              <>
                Review & Continue <ArrowRight className="size-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
