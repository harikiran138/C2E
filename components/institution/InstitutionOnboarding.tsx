'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Building2, 
  ChevronRight, 
  ChevronDown,
  ArrowLeft, 
  CheckCircle2, 
  School, 
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Save,
  AlertCircle,
  MapPin,
  Globe,
  Calendar,
  Layers,
  GraduationCap,
  Clock,
  UserPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Country, State, City } from 'country-state-city';
import { cn } from '@/lib/utils';
import { INSTITUTION_TYPES, DEGREES, LEVELS } from '@/lib/validation/onboarding';

// --- TYPES ---
type OnboardingStep = 1 | 2 | 3 | 4;

interface InstitutionDetails {
  institution_name: string;
  institution_type: 'Private' | 'Government' | 'Deemed' | 'Trust';
  institution_status: string;
  established_year: number;
  university_affiliation?: string;
  city: string;
  state: string;
  vision?: string;
  mission?: string;
}


interface Program {
  id?: string;
  program_name: string;
  degree: string;
  level: string;
  duration: number;
  intake: number;
  academic_year: string;
  program_code: string;
}

// --- SUB-COMPONENTS ---
const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
    {children}
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="mb-12">
    <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
    <p className="text-muted-foreground text-sm mt-1 font-medium">{subtitle}</p>
  </div>
);

// Animation variants
const fadeIn: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: "easeIn" } }
};

import AuthBackground from '../ui/AuthBackground';

export default function InstitutionOnboarding() {

  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // DATA STATES
  const [instDetails, setInstDetails] = useState<InstitutionDetails>({
    institution_name: '',
    institution_type: 'Private',
    institution_status: 'Non-Autonomous',
    established_year: new Date().getFullYear(),
    university_affiliation: '',
    city: '',
    state: '',
    vision: '',
    mission: ''
  });

  // Location State Management
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const countries = Country.getAllCountries();
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  const cities = selectedCountry && selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];

  const [programs, setPrograms] = useState<Program[]>([]);
  const [newProgram, setNewProgram] = useState<{
    program_name: string;
    degree: string;
    level: string;
    duration: number | string;
    intake: number | string;
    academic_year: string;
    program_code: string;
  }>({
    program_name: '',
    degree: '',
    level: '',
    duration: '',
    intake: '',
    academic_year: '',
    program_code: ''
  });

  const currentYear = new Date().getFullYear();
  
  // Validation logic (kept for reference or internal checks, but not blocking UI feedback)
  const isStep1Valid =
    !!instDetails.city.trim() &&
    !!instDetails.state.trim() &&
    Number.isInteger(instDetails.established_year) &&
    instDetails.established_year >= 1900 &&
    instDetails.established_year <= currentYear &&
    instDetails.established_year <= currentYear;

  const isProgramValid =
    !!newProgram.program_name.trim() &&
    !!newProgram.program_code.trim() &&
    !!newProgram.degree &&
    !!newProgram.level &&
    !!newProgram.academic_year &&
    typeof newProgram.duration === 'number' &&
    newProgram.duration >= 1 &&
    newProgram.duration <= 6 &&
    typeof newProgram.intake === 'number' &&
    newProgram.intake > 0;



  // --- SCROLL TO TOP ON STEP CHANGE ---
  useEffect(() => {
    // Scroll main container to top
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Also scroll window just in case
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      // Check session via API instead of Supabase client
      const detailsRes = await fetch('/api/institution/details');
      
      if (detailsRes.status === 401) {
        console.warn('No active session found, redirecting to login.');
        router.push('/institution/login');
        return;
      }

      if (!detailsRes.ok) {
        // Handle other errors gracefully
        console.error('Failed to fetch details');
        return;
      }

      const detailsPayload = await detailsRes.json();
      const institution = detailsPayload.institution;
      const dbPrograms = detailsPayload.programs;

      if (institution) {
         setUserId(institution.id);
         setInstDetails({
            institution_name: institution.institution_name || '',
            institution_type: (institution.institution_type as any) || 'Private',
            institution_status: (institution.institution_status as any) || 'Non-Autonomous',
            established_year: institution.established_year || new Date().getFullYear(),
            university_affiliation: institution.university_affiliation || '',
            city: institution.city || '',
            state: institution.state || '',
            vision: institution.vision || '',
            mission: institution.mission || ''
         });
      }
      
      if (dbPrograms) setPrograms(dbPrograms);
    };
    init();
  }, [router]);

  // --- HANDLERS ---
  const handleSaveDetails = async () => {
    
    // Strict Validation Step 1
    if (!instDetails.city.trim() || !instDetails.state.trim()) {
      setErrorMsg("City and State are required.");
      return;
    }

    const currentYear = new Date().getFullYear();
    // Allow year to be 0 (while typing) but validate range on save
    if (!instDetails.established_year || instDetails.established_year < 1800 || instDetails.established_year > currentYear + 1) {
      setErrorMsg(`Established year must be a valid year between 1800 and ${currentYear + 1}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const response = await fetch('/api/institution/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_name: instDetails.institution_name,
        institution_type: instDetails.institution_type,
        institution_status: instDetails.institution_status,
        established_year: instDetails.established_year,
        university_affiliation: instDetails.university_affiliation,
        city: instDetails.city,
        state: instDetails.state,
        vision: instDetails.vision,
        mission: instDetails.mission
      }),
    });

    setLoading(false);
    if (!response.ok) {
      const payload = await response.json();
      setErrorMsg(payload.error || 'Failed to save institution details.');
      return false;
    }
    return true;
  };

  const handleAddProgram = async () => {
    // Validate required fields
    if (!newProgram.program_name || !newProgram.degree || !newProgram.level || newProgram.duration === '' || !newProgram.program_code) {
      setErrorMsg("Please fill all required fields (Name, Degree, Level, Duration, Code)");
      return;
    }

    // Additional validations
    if (programs.some(p => p.program_code === newProgram.program_code.toUpperCase())) {
       setErrorMsg(`Program code "${newProgram.program_code}" already exists.`);
       return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      
      const res = await fetch('/api/institution/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProgram,
          duration: Number(newProgram.duration),
          intake: Number(newProgram.intake)
        })
      });

      const payload = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to add program');
      }

      setPrograms([...programs, payload.program || payload]);
      setNewProgram({
        program_name: '',
        degree: '',
        level: '',
        duration: '',
        intake: '',
        academic_year: '',
        program_code: ''
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error adding program');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (programs.length === 0) {
      setErrorMsg("Please add at least one program to continue.");
      return;
    }

    setLoading(true);
    
    const response = await fetch('/api/institution/onboarding/complete', {
      method: 'POST',
    });

    setLoading(false);
    if (response.ok) {
        // Use deterministic navigation after completion
        router.replace('/institution/dashboard');
        setTimeout(() => {
          if (window.location.pathname.startsWith('/institution/onboarding')) {
            window.location.assign('/institution/dashboard');
          }
        }, 700);
      return;
    }

    const payload = await response.json();
    setErrorMsg(payload.error || 'Failed to complete onboarding.');
  };


  return (
    <AuthBackground fullScreen className="!p-0">
      <div className="flex flex-col lg:flex-row w-full h-screen relative font-sans selection:bg-primary/20 overflow-hidden">

      {/* Sidebar Info */}
      <section className="hidden lg:flex flex-[0.85] flex-col justify-between p-12 lg:p-16 bg-sidebar/40 backdrop-blur-3xl border-r border-border/40 text-foreground relative z-10 h-full overflow-y-auto">
        <div className="space-y-12">
          <div className="flex items-center gap-3">
            <div className="size-12 relative">
              <Image src="/C2XPlus.jpeg" alt="C2X Plus" fill className="object-contain rounded-xl shadow-2xl shadow-primary/20" />
            </div>
            <div className="text-left">
              <span className="block text-xl font-bold tracking-tight leading-none text-foreground">C2XPlus</span>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-muted-foreground mt-1 block">Onboarding</span>
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
              Complete these steps to unlock your institutional dashboard and start your journey towards excellence.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { step: 1, label: "Institution Details", active: currentStep >= 1 },
              { step: 2, label: "Program Details", active: currentStep >= 2 },
              { step: 3, label: "Vision & Mission", active: currentStep >= 3 },
              { step: 4, label: "Review & Submit", active: currentStep >= 4 }
            ].map((s) => (
              <div key={s.step} className={`flex items-center gap-4 transition-all duration-500 ${s.active ? 'opacity-100 translate-x-1' : 'opacity-20 translate-x-0'}`}>
                <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-lg",
                    currentStep > s.step ? "bg-emerald-500 text-white shadow-emerald-500/20" : s.active ? "bg-primary text-primary-foreground shadow-primary/20" : "border border-border bg-muted/50 text-muted-foreground"
                )}>
                  {currentStep > s.step ? <CheckCircle2 className="size-5" /> : s.step}
                </div>
                <span className={cn("font-bold text-sm uppercase tracking-wider", s.active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          © {new Date().getFullYear()} C2XPlus Systems
        </div>
      </section>

      <main ref={scrollRef} className="flex-[1.15] relative z-10 bg-background/5">
        <div className="min-h-full flex flex-col items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[620px] space-y-8 py-12">
            {/* Back Button */}
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
                <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* STEP 1: Institution Details */}
            {currentStep === 1 && (
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
                        <SectionTitle title="Basic Institution Details" subtitle="Provide your institution's core administrative information." />
                    </div>
              
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">Institution Name</label>
                          <GlassInputWrapper>
                            <input 
                              placeholder="Name of your Institution"
                              className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                              value={instDetails.institution_name}
                              onChange={e => setInstDetails({...instDetails, institution_name: e.target.value})}
                            />
                          </GlassInputWrapper>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">Institution Type</label>
                          <div className="relative">
                            <GlassInputWrapper>
                              <select 
                                className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                value={instDetails.institution_type}
                                onChange={e => setInstDetails({...instDetails, institution_type: e.target.value as any})}
                              >
                                {INSTITUTION_TYPES.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </GlassInputWrapper>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">Status</label>
                          <div className="relative">
                            <GlassInputWrapper>
                              <select 
                                className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                value={instDetails.institution_status}
                                onChange={e => setInstDetails({...instDetails, institution_status: e.target.value})}
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
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">Established Year</label>
                          <GlassInputWrapper>
                            <input 
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*" 
                              className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                              value={instDetails.established_year || ''}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                setInstDetails({...instDetails, established_year: val ? parseInt(val) : 0})
                              }}
                              placeholder="e.g. 1985"
                            />
                          </GlassInputWrapper>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">Affiliated University</label>
                          <GlassInputWrapper>
                            <input 
                              placeholder="University Name"
                              className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                              value={instDetails.university_affiliation}
                              onChange={e => setInstDetails({...instDetails, university_affiliation: e.target.value})}
                            />
                          </GlassInputWrapper>
                        </div>



                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">Country</label>
                          <div className="relative">
                            <GlassInputWrapper>
                              <select 
                                className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                value={selectedCountry}
                                onChange={e => {
                                    setSelectedCountry(e.target.value);
                                    setSelectedState('');
                                    setInstDetails({...instDetails, state: '', city: ''});
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
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">State</label>
                          <div className="relative">
                            <GlassInputWrapper>
                              <select 
                                className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                value={selectedState}
                                onChange={e => {
                                    const stateCode = e.target.value;
                                    const state = states.find(s => s.isoCode === stateCode);
                                    setSelectedState(stateCode);
                                    setInstDetails({...instDetails, state: state ? state.name : '', city: ''});
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
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">City</label>
                          <div className="relative">
                            <GlassInputWrapper>
                              <select 
                                className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                value={instDetails.city}
                                onChange={e => setInstDetails({...instDetails, city: e.target.value})}
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
                      onClick={async () => {
                        const ok = await handleSaveDetails();
                        if (ok) setCurrentStep(2);
                      }} 
                      className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin size-5" /> : <>Save & Continue <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Programs */}
            {currentStep === 2 && (
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
                        <SectionTitle title="Add Programs" subtitle="List the academic programs offered by your institution." />
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Program Name</label>
                          <GlassInputWrapper>
                            <input 
                              placeholder="e.g. Computer Science and Engineering"
                              className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                              value={newProgram.program_name}
                              onChange={e => setNewProgram({...newProgram, program_name: e.target.value})}
                            />
                          </GlassInputWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Degree</label>
                            <div className="relative">
                              <GlassInputWrapper>
                                <select 
                                  className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                  value={newProgram.degree}
                                  onChange={e => setNewProgram({...newProgram, degree: e.target.value})}
                                >
                                  <option value="">Select Degree</option>
                                  {DEGREES.map((deg) => (
                                    <option key={deg} value={deg}>{deg}</option>
                                  ))}
                                </select>
                              </GlassInputWrapper>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Level</label>
                            <div className="relative">
                              <GlassInputWrapper>
                                <select 
                                  className="w-full bg-transparent p-4 pr-10 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                  value={newProgram.level}
                                  onChange={e => setNewProgram({...newProgram, level: e.target.value})}
                                >
                                  <option value="">Select Level</option>
                                  {LEVELS.map((lvl) => (
                                    <option key={lvl} value={lvl}>{lvl}</option>
                                  ))}
                                </select>
                              </GlassInputWrapper>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Program Duration</label>
                            <div className="relative">
                              <GlassInputWrapper>
                                <select
                                  className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 appearance-none cursor-pointer"
                                  value={newProgram.duration}
                                  onChange={e => {
                                      const val = parseInt(e.target.value);
                                      setNewProgram({...newProgram, duration: isNaN(val) ? '' : val});
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
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Intake Capacity</label>
                            <GlassInputWrapper>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="e.g. 60"
                                className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                                value={newProgram.intake}
                                onChange={e => setNewProgram({...newProgram, intake: parseInt(e.target.value) || 60})}
                              />
                            </GlassInputWrapper>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Year Of Establishment</label>
                            <GlassInputWrapper>
                              <input 
                                type="text"
                                className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                                placeholder="e.g. 2025"
                                value={newProgram.academic_year}
                                onChange={e => setNewProgram({...newProgram, academic_year: e.target.value})}
                              />
                            </GlassInputWrapper>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Program Code</label>
                            <GlassInputWrapper>
                              <input 
                                placeholder="e.g. CSE-101"
                                className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 uppercase" 
                                value={newProgram.program_code}
                                onChange={e => setNewProgram({...newProgram, program_code: e.target.value.toUpperCase()})}
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
                          <Layers className="size-4 text-primary" /> Added Programs ({programs.length})
                        </h3>
                        {programs.length === 0 ? (
                          <div className="text-center p-8 border border-dashed border-border/60 rounded-xl bg-background/20">
                            <p className="text-muted-foreground text-sm font-medium">No programs added yet.</p>
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
                                  <p className="font-bold text-slate-800">{p.program_name}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                                    {p.degree} • {p.level} • {p.duration}Y • Intake: {p.intake} • {p.program_code}
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
                      onClick={() => setCurrentStep(1)} 
                      className="px-6 py-4 bg-background/50 border border-border text-muted-foreground font-bold rounded-xl hover:bg-background hover:text-foreground transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="size-5" /> Back
                    </button>
                    <button 
                      onClick={() => setCurrentStep(3)} 
                      className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      disabled={programs.length === 0}
                    >
                      Define Vision & Mission <ArrowRight className="size-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Combined Vision & Mission */}
            {currentStep === 3 && (
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
                        <SectionTitle title="Define Institute Vision & Mission" subtitle="State the overarching vision and mission for your institution." />
                    </div>
              
                    <div className="space-y-12">
                      {/* Institute VM */}
                      <div className="space-y-6">
                        <h3 className="font-bold text-primary uppercase text-xs tracking-widest flex items-center gap-2">
                           <Building2 className="size-4" /> Institute Level
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Institute Vision</label>
                            <GlassInputWrapper>
                              <textarea 
                                className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 min-h-[100px] resize-none" 
                                placeholder="To become a center of excellence..."
                                value={instDetails.vision || ''}
                                onChange={e => setInstDetails({...instDetails, vision: e.target.value})}
                              />
                            </GlassInputWrapper>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Institute Mission</label>
                            <GlassInputWrapper>
                              <textarea 
                                className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 min-h-[100px] resize-none" 
                                placeholder="To provide quality education..."
                                value={instDetails.mission || ''}
                                onChange={e => setInstDetails({...instDetails, mission: e.target.value})}
                              />
                            </GlassInputWrapper>
                          </div>
                        </div>
                      </div>
                    </div>

                  <div className="mt-8 pt-6 border-t border-border/50 flex gap-4">
                    <button 
                      onClick={() => setCurrentStep(2)} 
                      className="px-6 py-4 bg-background/50 border border-border text-muted-foreground font-bold rounded-xl hover:bg-background hover:text-foreground transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="size-5" /> Back
                    </button>
                    <button 
                      onClick={async () => {
                         setLoading(true);
                         // Save Institute VM ONLY
                         const ok = await handleSaveDetails();
                         setLoading(false);
                         if (ok) {
                           setCurrentStep(4);
                         }
                      }} 
                      className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin size-5" /> : <>Review & Continue <ArrowRight className="size-5" /></>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}


            {/* STEP 4: Final Review */}
            {currentStep === 4 && (
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
                        <SectionTitle title="Final Review" subtitle="Verify your institutional and program data before submission." />
                    </div>

                    <div className="space-y-8">
                      {/* Institution Summary */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1">
                          <Building2 className="size-4 text-primary" /> Institution Summary
                        </h4>
                        <div className="bg-background/40 border border-border/50 rounded-2xl p-6 grid grid-cols-2 gap-6 shadow-sm group hover:border-primary/20 transition-all">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Type</p>
                            <p className="font-bold text-slate-800">{instDetails.institution_type}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                            <p className="font-bold text-slate-800">{instDetails.institution_status}</p>
                          </div>
                          <div className="col-span-2 pt-4 border-t border-border/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Location</p>
                            <div className="flex items-center gap-2 text-slate-800 font-bold">
                                <MapPin className="size-4 text-primary" />
                                {instDetails.city}, {instDetails.state}
                            </div>
                          </div>
                          <div className="col-span-2 pt-4 border-t border-border/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vision</p>
                            <p className="text-slate-700 text-sm font-medium leading-relaxed italic">"{instDetails.vision}"</p>
                          </div>
                          <div className="col-span-2 pt-4 border-t border-border/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Mission</p>
                            <p className="text-slate-700 text-sm font-medium leading-relaxed italic">"{instDetails.mission}"</p>
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
                            <div key={idx} className="p-5 bg-background/40 border border-border/50 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                              <div className="flex justify-between items-start mb-3">
                                <p className="font-bold text-slate-800 text-base">{p.program_name}</p>
                                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-primary/20">{p.program_code}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-[11px] text-muted-foreground font-semibold">
                                <div><span className="text-slate-400 block mb-0.5 uppercase tracking-tighter">Degree</span> {p.degree}</div>
                                <div><span className="text-slate-400 block mb-0.5 uppercase tracking-tighter">Intake</span> {p.intake}</div>
                                <div><span className="text-slate-400 block mb-0.5 uppercase tracking-tighter">Duration</span> {p.duration} Years</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Vision & Mission Summary */}
                        <div className="pt-8 border-t border-border/50 space-y-8">
                          <div>
                            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2 mb-4">
                              <Building2 className="size-4 text-primary" /> Institute Vision & Mission
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 bg-background/40 border border-border/40 rounded-xl">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Vision</p>
                                <p className="text-sm font-medium text-slate-800 line-clamp-3">{instDetails.vision || 'Not specified'}</p>
                              </div>
                              <div className="p-4 bg-background/40 border border-border/40 rounded-xl">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Mission</p>
                                <p className="text-sm font-medium text-slate-800 line-clamp-3">{instDetails.mission || 'Not specified'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Programs VM Summary Removed */}
                        </div>
                      </div>
                    </div>
                  <div className="mt-8 pt-6 border-t border-border/50 flex gap-4">
                    <button 
                      onClick={() => setCurrentStep(3)} 
                      className="px-6 py-4 bg-background/50 border border-border text-muted-foreground font-bold rounded-xl hover:bg-background hover:text-foreground transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="size-5" />
                    </button>
                    <button 
                      onClick={handleCompleteOnboarding} 
                      className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin size-5" /> : <>Complete & Launch Portal <CheckCircle2 className="size-5 group-hover:scale-110 transition-transform" /></>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </main>
      </div>
    </AuthBackground>
  );
}
