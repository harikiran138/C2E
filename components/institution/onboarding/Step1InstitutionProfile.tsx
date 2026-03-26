import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Loader2, ArrowRight } from "lucide-react";
import {
  GlassInputWrapper,
  SectionTitle,
  fadeIn,
} from "./OnboardingShared";
import { INSTITUTION_TYPES } from "@/lib/validation/onboarding";
import { InstitutionDetails } from "@/lib/hooks/useInstitutionOnboarding";

interface Step1Props {
  instDetails: InstitutionDetails;
  setInstDetails: (details: InstitutionDetails) => void;
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  countries: any[];
  states: any[];
  cities: any[];
  loading: boolean;
  onNext: () => void;
}

export const Step1InstitutionProfile = ({
  instDetails,
  setInstDetails,
  selectedCountry,
  setSelectedCountry,
  selectedState,
  setSelectedState,
  countries,
  states,
  cities,
  loading,
  onNext,
}: Step1Props) => {
  return (
    <motion.div
      key="step1"
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
            title="Basic Institution Details"
            subtitle="Provide your institution's core administrative information."
          />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Institution Name
              </label>
              <GlassInputWrapper>
                <input
                  placeholder="Name of your Institution"
                  className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                  value={instDetails.institution_name}
                  onChange={(e) =>
                    setInstDetails({
                      ...instDetails,
                      institution_name: e.target.value,
                    })
                  }
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Institution Type
              </label>
              <div className="relative">
                <GlassInputWrapper>
                  <select
                    className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                    value={instDetails.institution_type}
                    onChange={(e) =>
                      setInstDetails({
                        ...instDetails,
                        institution_type: e.target.value as any,
                      })
                    }
                  >
                    {INSTITUTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </GlassInputWrapper>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Status
              </label>
              <div className="relative">
                <GlassInputWrapper>
                  <select
                    className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                    value={instDetails.institution_status}
                    onChange={(e) =>
                      setInstDetails({
                        ...instDetails,
                        institution_status: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Status</option>
                    <option value="University">University</option>
                    <option value="Autonomous">Autonomous</option>
                    <option value="Non-Autonomous">Non-autonomous</option>
                  </select>
                </GlassInputWrapper>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Established Year
              </label>
              <GlassInputWrapper>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                  value={instDetails.established_year || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setInstDetails({
                      ...instDetails,
                      established_year: val ? parseInt(val) : 0,
                    });
                  }}
                  placeholder="e.g. 1985"
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Affiliated University
              </label>
              <GlassInputWrapper>
                <input
                  placeholder="University Name"
                  className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                  value={instDetails.university_affiliation}
                  onChange={(e) =>
                    setInstDetails({
                      ...instDetails,
                      university_affiliation: e.target.value,
                    })
                  }
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Country
              </label>
              <div className="relative">
                <GlassInputWrapper>
                  <select
                    className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedState("");
                      setInstDetails({
                        ...instDetails,
                        state: "",
                        city: "",
                      });
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </GlassInputWrapper>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                State
              </label>
              <div className="relative">
                <GlassInputWrapper>
                  <select
                    className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                    value={selectedState}
                    onChange={(e) => {
                      const stateCode = e.target.value;
                      const state = states.find((s) => s.isoCode === stateCode);
                      setSelectedState(stateCode);
                      setInstDetails({
                        ...instDetails,
                        state: state ? state.name : "",
                        city: "",
                      });
                    }}
                    disabled={!selectedCountry}
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.isoCode} value={state.isoCode}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </GlassInputWrapper>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                City
              </label>
              <div className="relative">
                <GlassInputWrapper>
                  <select
                    className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                    value={instDetails.city}
                    onChange={(e) =>
                      setInstDetails({
                        ...instDetails,
                        city: e.target.value,
                      })
                    }
                    disabled={!selectedState}
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </GlassInputWrapper>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/50">
          <button
            onClick={onNext}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin size-5" />
            ) : (
              <>
                Save & Continue{" "}
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
