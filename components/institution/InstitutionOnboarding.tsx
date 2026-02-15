'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Building2, 
  ChevronRight, 
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
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

// --- TYPES ---
type OnboardingStep = 1 | 2 | 3;

interface InstitutionDetails {
  institution_type: 'Private' | 'Government' | 'Deemed' | 'Trust';
  institution_status: 'Autonomous' | 'Non-Autonomous';
  established_year: number;
  university_affiliation?: string;
  address: string;
  city: string;
  state: string;
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
  <div className="rounded-lg border border-slate-200 bg-slate-50 shadow-sm transition-all focus-within:border-slate-900 focus-within:bg-white focus-within:shadow-md">
    {children}
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold font-serif text-slate-900">{title}</h2>
    <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
  </div>
);

export default function InstitutionOnboarding() {
  const router = useRouter();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // DATA STATES
  const [instDetails, setInstDetails] = useState<InstitutionDetails>({
    institution_type: 'Private',
    institution_status: 'Non-Autonomous',
    established_year: new Date().getFullYear(),
    university_affiliation: '',
    address: '',
    city: '',
    state: ''
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [newProgram, setNewProgram] = useState<Program>({
    program_name: '',
    degree: 'B.Tech',
    level: 'UG',
    duration: 4,
    intake: 60,
    academic_year: '2025-2026',
    program_code: ''
  });

  const currentYear = new Date().getFullYear();
  const isStep1Valid =
    !!instDetails.address.trim() &&
    instDetails.address.trim().length >= 10 &&
    !!instDetails.city.trim() &&
    !!instDetails.state.trim() &&
    Number.isInteger(instDetails.established_year) &&
    instDetails.established_year >= 1900 &&
    instDetails.established_year <= currentYear &&
    (instDetails.institution_status !== 'Non-Autonomous' || !!instDetails.university_affiliation?.trim());

  const isProgramValid =
    !!newProgram.program_name.trim() &&
    !!newProgram.program_code.trim() &&
    !!newProgram.degree &&
    !!newProgram.level &&
    !!newProgram.academic_year &&
    Number.isInteger(newProgram.duration) &&
    newProgram.duration >= 1 &&
    newProgram.duration <= 6 &&
    Number.isInteger(newProgram.intake) &&
    newProgram.intake > 0;

  // --- INITIALIZATION ---
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;

    const init = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Session not found, retrying... (${retryCount})`);
          setTimeout(init, 1000); // Wait 1s and retry
          return;
        }
        console.warn('No active session found after retries, redirecting to login.');
        router.push('/institution/login');
        return;
      }

      setUserId(session.user.id);
      
      const detailsRes = await fetch('/api/institution/details');
      const detailsPayload = detailsRes.ok ? await detailsRes.json() : { details: null };
      const details = detailsPayload.details;

      if (details) {
         // Populate if data exists, defaults if not
         setInstDetails({
            institution_type: (details.type as any) || 'Private',
            institution_status: (details.status as any) || 'Non-Autonomous',
            established_year: details.established_year || new Date().getFullYear(),
            university_affiliation: details.affiliation || '',
            address: details.address || '',
            city: details.city || '',
            state: details.state || ''
         });
      }
      
      const { data: dbPrograms } = await supabase
        .from('programs')
        .select('*')
        .eq('institution_id', session.user.id);
        
      if (dbPrograms) setPrograms(dbPrograms);
    };
    init();
  }, [router, supabase]);

  // --- HANDLERS ---
  const handleSaveDetails = async () => {
    if (!userId) return;
    
    // Strict Validation Step 1
    if (!instDetails.address.trim() || !instDetails.city.trim() || !instDetails.state.trim()) {
      setErrorMsg("Address, City, and State are required.");
      return;
    }
    
    if (instDetails.address.length < 10) {
        setErrorMsg("Address must be at least 10 characters long.");
        return;
    }

    if (instDetails.institution_status === 'Non-Autonomous' && !instDetails.university_affiliation?.trim()) {
      setErrorMsg("University affiliation is required for non-autonomous institutions.");
      return;
    }
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(instDetails.established_year) || instDetails.established_year < 1900 || instDetails.established_year > currentYear) {
      setErrorMsg(`Established year must be between 1900 and ${currentYear}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const response = await fetch('/api/institution/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_type: instDetails.institution_type,
        institution_status: instDetails.institution_status,
        established_year: instDetails.established_year,
        university_affiliation: instDetails.institution_status === 'Non-Autonomous' ? instDetails.university_affiliation : null,
        address: instDetails.address,
        city: instDetails.city,
        state: instDetails.state
      }),
    });

    setLoading(false);
    if (response.ok) {
      setCurrentStep(2);
      return;
    }

    const payload = await response.json();
    setErrorMsg(payload.error || 'Failed to save institution details.');
  };

  const handleAddProgram = async () => {
    if (!userId) return;
    
    // Strict Validation Step 2 (Program)
    if (!newProgram.program_name.trim() || !newProgram.program_code.trim() || !newProgram.degree || !newProgram.level || !newProgram.academic_year) {
      setErrorMsg("All program fields are required.");
      return;
    }

    if (newProgram.intake <= 0) {
      setErrorMsg("Intake must be greater than 0.");
      return;
    }
    if (!Number.isInteger(newProgram.duration) || newProgram.duration < 1 || newProgram.duration > 6) {
      setErrorMsg("Duration must be between 1 and 6 years.");
      return;
    }
    
    if (programs.some(p => p.program_code === newProgram.program_code.toUpperCase())) {
       setErrorMsg(`Program code "${newProgram.program_code}" already exists.`);
       return;
    }

    setLoading(true);
    setErrorMsg(null);

    const response = await fetch('/api/institution/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProgram),
    });
    
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json();
      setErrorMsg(payload.error || 'Failed to add program.');
      return;
    }

    const payload = await response.json();
    if (payload.program) {
      setPrograms([...programs, payload.program]);
      setNewProgram({
        program_name: '',
        degree: 'B.Tech',
        level: 'UG',
        duration: 4,
        intake: 60,
        academic_year: '2025-2026',
        program_code: ''
      });
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!userId) return;
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
        // Force refresh to ensure middleware picks up the new status
        router.refresh(); 
        router.push('/institution/dashboard');
      return;
    }

    const payload = await response.json();
    setErrorMsg(payload.error || 'Failed to complete onboarding.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative bg-slate-50 font-sans">
      <div className="login-pattern-bg fixed inset-0 -z-20 opacity-30"></div>

      {/* Sidebar Info */}
      <section className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-slate-900 text-white relative z-10 lg:h-screen lg:sticky lg:top-0">
        <div className="space-y-12">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-2xl">
              <Image src="/x.png" alt="Logo" width={32} height={32} />
            </div>
            <div className="text-left text-white">
              <span className="block text-xl font-bold tracking-tight font-serif leading-none">C2X Portal</span>
              <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">Onboarding Flow</span>
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl font-bold font-serif leading-tight">
              {currentStep === 1 && "Setup your institution profile."}
              {currentStep === 2 && "Add your academic programs."}
              {currentStep === 3 && "Review and finalize your data."}
            </h1>
            <p className="text-lg text-slate-400 font-medium">
              Complete these steps to unlock your institutional dashboard and start managing compliance.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { step: 1, label: "Institution Details", active: currentStep >= 1 },
              { step: 2, label: "Program Details", active: currentStep >= 2 },
              { step: 3, label: "Review & Submit", active: currentStep >= 3 }
            ].map((s) => (
              <div key={s.step} className={`flex items-center gap-4 transition-all ${s.active ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${currentStep > s.step ? 'bg-green-500' : s.active ? 'bg-white text-slate-900' : 'border border-white/20'}`}>
                  {currentStep > s.step ? <CheckCircle2 className="size-4" /> : s.step}
                </div>
                <span className="font-semibold text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          © 2026 C2E System
        </div>
      </section>

      {/* Main Content */}
      <main ref={scrollRef} className="flex-[1.5] p-6 lg:p-24 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-12">
          
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="size-5 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
            </div>
          )}

          {/* STEP 1: Institution Details */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
              <SectionTitle title="Basic Institution Details" subtitle="Provide the legal and physical information about your campus." />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Institution Type</label>
                  <GlassInputWrapper>
                    <select 
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                      value={instDetails.institution_type}
                      onChange={e => setInstDetails({...instDetails, institution_type: e.target.value as any})}
                    >
                      <option>Private</option>
                      <option>Government</option>
                      <option>Deemed</option>
                      <option>Trust</option>
                    </select>
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Status</label>
                  <GlassInputWrapper>
                    <select 
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                      value={instDetails.institution_status}
                      onChange={e => setInstDetails({...instDetails, institution_status: e.target.value as any})}
                    >
                      <option value="Autonomous">Autonomous</option>
                      <option value="Non-Autonomous">Non-Autonomous</option>
                    </select>
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Established Year</label>
                  <GlassInputWrapper>
                    <input 
                      type="number" 
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                      value={instDetails.established_year}
                      onChange={e => setInstDetails({...instDetails, established_year: parseInt(e.target.value) || currentYear})}
                      min="1900" max={new Date().getFullYear()}
                    />
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">University Affiliation</label>
                  <GlassInputWrapper>
                    <input 
                      placeholder={instDetails.institution_status === 'Autonomous' ? "Not Required" : "University Name"}
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 disabled:opacity-50" 
                      value={instDetails.university_affiliation}
                      onChange={e => setInstDetails({...instDetails, university_affiliation: e.target.value})}
                      disabled={instDetails.institution_status === 'Autonomous'}
                    />
                  </GlassInputWrapper>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Address</label>
                  <GlassInputWrapper>
                    <textarea 
                      placeholder="Full street address (min 10 chars)"
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 h-24 resize-none" 
                      value={instDetails.address}
                      onChange={e => setInstDetails({...instDetails, address: e.target.value})}
                    />
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">City</label>
                  <GlassInputWrapper>
                    <input 
                      placeholder="City Name"
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                      value={instDetails.city}
                      onChange={e => setInstDetails({...instDetails, city: e.target.value})}
                    />
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">State</label>
                  <GlassInputWrapper>
                    <input 
                      placeholder="State Name"
                      className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                      value={instDetails.state}
                      onChange={e => setInstDetails({...instDetails, state: e.target.value})}
                    />
                  </GlassInputWrapper>
                </div>
              </div>

              <button 
                onClick={handleSaveDetails} 
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                disabled={loading || !isStep1Valid}
              >
                {loading ? <Loader2 className="animate-spin size-5" /> : <>Save & Continue <ArrowRight className="size-5" /></>}
              </button>
            </div>
          )}

          {/* STEP 2: Programs */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
              <SectionTitle title="Add Programs" subtitle="List at least one academic program to complete onboarding." />
              
              <div className="bg-slate-100/50 border border-slate-200 p-8 rounded-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Program Name</label>
                    <GlassInputWrapper>
                      <input 
                        placeholder="e.g. Computer Science Engineering"
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                        value={newProgram.program_name}
                        onChange={e => setNewProgram({...newProgram, program_name: e.target.value})}
                      />
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Degree</label>
                    <GlassInputWrapper>
                      <select 
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                        value={newProgram.degree}
                        onChange={e => setNewProgram({...newProgram, degree: e.target.value})}
                      >
                        <option>B.Tech</option>
                        <option>B.Sc</option>
                        <option>B.Com</option>
                        <option>MBA</option>
                        <option>M.Tech</option>
                        <option>PhD</option>
                      </select>
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Level</label>
                    <GlassInputWrapper>
                      <select 
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                        value={newProgram.level}
                        onChange={e => setNewProgram({...newProgram, level: e.target.value})}
                      >
                        <option>UG</option>
                        <option>PG</option>
                        <option>Diploma</option>
                        <option>Doctorate</option>
                      </select>
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Duration (Years)</label>
                    <GlassInputWrapper>
                      <input 
                        type="number" 
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                        value={newProgram.duration}
                        onChange={e => setNewProgram({...newProgram, duration: parseInt(e.target.value) || 4})}
                        min="1" max="6"
                      />
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Intake Capacity</label>
                    <GlassInputWrapper>
                      <input 
                        type="number" 
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800" 
                        value={newProgram.intake}
                        onChange={e => setNewProgram({...newProgram, intake: parseInt(e.target.value) || 60})}
                      />
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
                    <GlassInputWrapper>
                      <select 
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800"
                        value={newProgram.academic_year}
                        onChange={e => setNewProgram({...newProgram, academic_year: e.target.value})}
                      >
                        <option>2025-2026</option>
                        <option>2026-2027</option>
                      </select>
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Program Code</label>
                    <GlassInputWrapper>
                      <input 
                        placeholder="e.g. CSE101"
                        className="w-full bg-transparent p-4 outline-none font-semibold text-slate-800 uppercase" 
                        value={newProgram.program_code}
                        onChange={e => setNewProgram({...newProgram, program_code: e.target.value.toUpperCase()})}
                      />
                    </GlassInputWrapper>
                  </div>
                </div>

                <button 
                  onClick={handleAddProgram} 
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl font-bold text-slate-500 hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                  disabled={loading || !isProgramValid}
                >
                  <Plus className="size-5" /> Add Program to List
                </button>
              </div>

              {/* List of Added Programs */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Added Programs ({programs.length})</h3>
                {programs.length === 0 ? (
                  <p className="text-slate-400 text-sm italic">No programs added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {programs.map((p, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">{p.program_name}</p>
                          <p className="text-xs text-slate-500">{p.degree} • {p.level} • {p.duration} Years • Code: {p.program_code}</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (p.id) {
                              await supabase.from('programs').delete().eq('id', p.id);
                              setPrograms(programs.filter(prog => prog.id !== p.id));
                            }
                          }}
                          className="p-2 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentStep(1)} 
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="size-5" /> Back
                </button>
                <button 
                  onClick={() => setCurrentStep(3)} 
                  className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={programs.length === 0}
                >
                  Review Data <ArrowRight className="size-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Final Review */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
              <SectionTitle title="Final Review" subtitle="Verify your institutional and program data before submitting." />
              
              <div className="space-y-8">
                {/* Institution Summary */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="size-4" /> Institution Summary
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-2 gap-6 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Type</p>
                      <p className="font-semibold text-slate-900">{instDetails.institution_type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
                      <p className="font-semibold text-slate-900">{instDetails.institution_status}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">Location</p>
                      <p className="font-semibold text-slate-900">{instDetails.city}, {instDetails.state}</p>
                    </div>
                  </div>
                </div>

                {/* Programs Summary */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="size-4" /> Programs ({programs.length})
                  </h4>
                  <div className="space-y-3">
                    {programs.map((p, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <p className="font-bold text-slate-900">{p.program_name}</p>
                        <p className="text-xs text-slate-500">{p.degree} • Code: {p.program_code} • Intake: {p.intake}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  onClick={() => setCurrentStep(2)} 
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="size-5" /> Back
                </button>
                <button 
                  onClick={handleCompleteOnboarding} 
                  className="flex-1 py-4 bg-green-600 text-white font-bold rounded-2xl shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin size-5" /> : <>Submit & Launch Portal <CheckCircle2 className="size-5" /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
