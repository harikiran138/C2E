'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Building2, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  School, 
  Users, 
  Lightbulb, 
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import ShadersBackground from '@/components/ui/background-shades';

// --- TYPES ---
type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface InstitutionDetails {
  id: string;
  name: string;
  code: string;
  status: 'Autonomous' | 'Non-Autonomous';
  vision: string;
  mission: string;
}

interface Program {
  id?: string;
  name: string;
  code: string;
  degree: string;
  years: number;
  level: string;
  // New fields for Step 3
  program_chair?: string;
  nba_coordinator?: string;
  vision?: string;
  mission?: string;
  stakeholder_feedback_enabled?: boolean;
}

interface Peo {
  id: string;
  statement: string;
}

interface Stakeholder {
  id?: string;
  program_id: string; 
  name: string;
  organisation: string;
  category: string;
  email: string;
  contact_no: string;
}

// --- SUB-COMPONENTS ---
const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-primary-gold focus-within:bg-white focus-within:shadow-md">
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
  const scrollRef = useRef<HTMLElement>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // DATA STATES
  const [instDetails, setInstDetails] = useState<InstitutionDetails>({
    id: '',
    name: '',
    code: '',
    status: 'Autonomous',
    vision: '',
    mission: ''
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [newProgram, setNewProgram] = useState<Program>({ name: '', code: '', degree: 'B. Tech./ B. E.', years: 4, level: 'UG' });
  
  // Step 3 State
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [programDetails, setProgramDetails] = useState<Partial<Program>>({});
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [newStakeholder, setNewStakeholder] = useState<Stakeholder>({ 
      program_id: '', 
      name: '', 
      organisation: '', 
      category: 'Alumni', 
      email: '', 
      contact_no: '' 
  });
  
  // PEO Gen State
  const [peoSets, setPeoSets] = useState<Peo[][]>([]);
  const [finalizedPeos, setFinalizedPeos] = useState<Peo[]>([]);
  const [isGeneratingPeos, setIsGeneratingPeos] = useState(false);


  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const sessionData = localStorage.getItem('inst_session');
      if (!sessionData) {
        router.push('/institution/login');
        return;
      }

      const session = JSON.parse(sessionData);
      const sessionUserId = session.id;
      setUserId(sessionUserId);
      
      const { data: existing } = await supabase.from('institutions').select('*').eq('id', sessionUserId).maybeSingle();

      let startStep: OnboardingStep = 1;
      
      if (existing) {
         setInstDetails({
            id: sessionUserId,
            name: existing.name || '',
            code: existing.code || '',
            status: existing.status || 'Autonomous',
            vision: existing.vision || '',
            mission: existing.mission || ''
         });
         startStep = 2;
      }
      
      const { data: dbPrograms } = await supabase.from('programs').select('*').eq('institution_id', sessionUserId);
      if (dbPrograms && dbPrograms.length > 0) {
          setPrograms(dbPrograms);
          if (startStep === 2) startStep = 3;
      }

      // Restore step from localStorage if available
      const savedStep = localStorage.getItem('onboardingStep');
      if (savedStep) {
          const stepNum = parseInt(savedStep) as OnboardingStep;
          // Only use saved step if it's within reachable range
          if (stepNum > startStep && stepNum <= 5) {
              setCurrentStep(stepNum);
          } else {
              setCurrentStep(startStep);
          }
      } else {
          setCurrentStep(startStep);
      }

      // Restore selectedProgramId
      const savedProgId = localStorage.getItem('selectedProgramId');
      if (savedProgId) {
          setSelectedProgramId(savedProgId);
      } else if (dbPrograms && dbPrograms.length === 1) {
          setSelectedProgramId(dbPrograms[0].id || '');
      }
    };
    init();
  }, []);

  const handleToggleStakeholderFeedback = async (enabled: boolean) => {
      if (!selectedProgramId) return;
      
      const updatedPrograms = programs.map(p => p.id === selectedProgramId ? { ...p, stakeholder_feedback_enabled: enabled } : p);
      setPrograms(updatedPrograms);
      
      await supabase.from('programs').update({ stakeholder_feedback_enabled: enabled }).eq('id', selectedProgramId);
  };

  // --- HANDLERS (Simulated & Real Mix) ---

  // Scroll to top and persist step
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    localStorage.setItem('onboardingStep', currentStep.toString());
    if (selectedProgramId) {
        localStorage.setItem('selectedProgramId', selectedProgramId);
    }
  }, [currentStep, selectedProgramId]);

  const handleSaveStep1 = async () => {
     if (!userId) return;
     
     if (!instDetails.name.trim() || !instDetails.code.trim()) {
         alert("Institution Name and Code are required.");
         return;
     }

     setLoading(true);
     // Update basic details
     const { id: _, ...detailsToSave } = instDetails;
     
     const { error } = await supabase.from('institutions').upsert({
         id: userId,
         ...detailsToSave,
         updated_at: new Date().toISOString()
     });
     setLoading(false);
     if (!error) setCurrentStep(2);
     else alert("Error saving: " + error.message);
  };

  const handleAddProgram = async () => {
    if (!userId) {
      alert("User not authenticated.");
      return;
    }
    if (!newProgram.name || !newProgram.code) {
      alert("Program Name and Code are required.");
      return;
    }
    
    setLoading(true);
    const { years, ...rest } = newProgram;
    const p = { ...rest, duration_years: years, institution_id: userId };
    
    // Explicitly map years for safety
    const { data, error } = await supabase.from('programs').insert(p).select().single();
    
    if (error) {
        alert("Error adding program: " + error.message);
    } else if (data) {
        setPrograms([...programs, data]);
        setNewProgram({ name: '', code: '', degree: 'B.Tech', years: 4, level: 'UG' });
    }
    setLoading(false);
  };

  const handleDeleteProgram = async (id: string) => {
      await supabase.from('programs').delete().eq('id', id);
      setPrograms(programs.filter(p => p.id !== id));
  };

  // --- STEP 3 HANDLERS ---
  const handleUpdateProgramDetails = async () => {
     if (!selectedProgramId) return;
     setLoading(true);
     const { error } = await supabase.from('programs').update({
         program_chair: programDetails.program_chair,
         nba_coordinator: programDetails.nba_coordinator,
         vision: programDetails.vision,
         mission: programDetails.mission
     }).eq('id', selectedProgramId);
     
     if (error) alert("Error updating: " + error.message);
     else {
         // Update local state
         setPrograms(programs.map(p => p.id === selectedProgramId ? { ...p, ...programDetails } : p));
         // Optional: toast success
     }
     setLoading(false);
  };

  const handleAddStakeholder = async () => {
      if (!selectedProgramId || !newStakeholder.name) return;
      const s = { ...newStakeholder, program_id: selectedProgramId };
      
    const { data, error } = await supabase.from('stakeholders').insert(s).select().single();
    if (data) {
        setStakeholders([...stakeholders, data]);
        setNewStakeholder({ 
            program_id: '', 
            name: '', 
            organisation: '', 
            category: 'Alumni', 
            email: '', 
            contact_no: '' 
        });
    } else {
        alert("Error adding stakeholder: " + (error?.message || 'Unknown'));
    }
};

  const handleDeleteStakeholder = async (id: string) => {
      await supabase.from('stakeholders').delete().eq('id', id);
      setStakeholders(stakeholders.filter(s => s.id !== id));
  };
  
  // Fetch stakeholders when program is selected
  useEffect(() => {
      const fetchStakeholders = async () => {
          if (!selectedProgramId) return;
          
          const { data } = await supabase.from('stakeholders').select('*').eq('program_id', selectedProgramId);
          if (data) setStakeholders(data);
          
          // Also set program details into form
          const prog = programs.find(p => p.id === selectedProgramId);
          if (prog) {
              setProgramDetails({
                  program_chair: prog.program_chair || '',
                  nba_coordinator: prog.nba_coordinator || '',
                  vision: prog.vision || '',
                  mission: prog.mission || '',
                  stakeholder_feedback_enabled: prog.stakeholder_feedback_enabled || false
              });
          }
      };
      if (currentStep === 3) fetchStakeholders();
  }, [selectedProgramId, currentStep, programs]);
  
  const handleGeneratePEOs = async () => {
      if (!selectedProgramId) return;
      setIsGeneratingPeos(true);
      
      // Simulate AI generating 4 sets based on Vision/Mission
      setTimeout(() => {
          const mockSets: Peo[][] = [
              [
                  { id: 'S1-P1', statement: 'Technical Proficiency: Graduates will apply engineering principles to solve complex problems.' },
                  { id: 'S1-P2', statement: 'Professionalism: Graduates will adhere to ethical standards and communicate effectively.' },
                  { id: 'S1-P3', statement: 'Lifelong Learning: Graduates will pursue advanced studies or professional certifications.' }
              ],
              [
                  { id: 'S2-P1', statement: 'Analytical Skills: Graduates will leverage modern tools to analyze and design systems.' },
                  { id: 'S2-P2', statement: 'Leadership: Graduates will lead multidisciplinary teams with social responsibility.' },
                  { id: 'S2-P3', statement: 'Innovation: Graduates will contribute to research and developmental activities.' }
              ],
              [
                  { id: 'S3-P1', statement: 'Practical Wisdom: Graduates will integrate theoretical knowledge with field experiences.' },
                  { id: 'S3-P2', statement: 'Global Competence: Graduates will succeed in global markets through diversity and inclusion.' },
                  { id: 'S3-P3', statement: 'Sustainability: Graduates will create solutions considering environmental impact.' }
              ],
              [
                  { id: 'S4-P1', statement: 'Disciplinary Depth: Graduates will demonstrate mastery in their specialized core areas.' },
                  { id: 'S4-P2', statement: 'Entrepreneurship: Graduates will demonstrate initiative and management skills.' },
                  { id: 'S4-P3', statement: 'Community Engagement: Graduates will apply expertise for societal benefits.' }
              ]
          ];
          setPeoSets(mockSets);
          setIsGeneratingPeos(false);
      }, 2000);
  };

  const handleFinalizePeo = (peo: Peo) => {
      if (finalizedPeos.find(p => p.id === peo.id)) return;
      // Increment ID for preservation (PEO-01, PEO-02...)
      const nextId = `PEO-${(finalizedPeos.length + 1).toString().padStart(2, '0')}`;
      setFinalizedPeos([...finalizedPeos, { ...peo, id: nextId }]);
  };

  const handleRemoveFinalizedPeo = (id: string) => {
      setFinalizedPeos(finalizedPeos.filter(p => p.id !== id));
  };

  const handleSaveFinalPEOs = async () => {
      if (!selectedProgramId || finalizedPeos.length === 0) return;
      setLoading(true);
      
      // First delete existing PEOs for this program to overwrite
      await supabase.from('peos').delete().eq('program_id', selectedProgramId);
      
      const { error } = await supabase.from('peos').insert(
          finalizedPeos.map((p, index) => ({
              program_id: selectedProgramId,
              peo_code: p.id, // PEO-01, PEO-02...
              statement: p.statement
          }))
      );
      
      setLoading(false);
      if (!error) router.push('/institution/dashboard');
      else alert("Error saving PEOs: " + error.message);
  };

  // --- RENDER HELPERS ---
  
  const renderStepIndicator = () => (
     <div className="flex items-center justify-between mb-8 px-2">
         {[1, 2, 3, 4].map((step) => (
             <div key={step} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setCurrentStep(step as OnboardingStep)}>
                 <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                     currentStep === step 
                     ? 'bg-primary-gold text-white shadow-lg scale-110' 
                     : currentStep > step 
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                 }`}>
                     {currentStep > step ? <CheckCircle2 className="size-5" /> : step}
                 </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600">
                      {step === 1 ? 'Details' : step === 2 ? 'Programs' : step === 3 ? 'Program Details' : 'PEOs'}
                  </span>
             </div>
         ))}
     </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative font-sans overflow-hidden bg-slate-50">
       <ShadersBackground />

       {/* Left side: Visual Area (Fixed) */}
       <section className="hidden lg:flex flex-1 flex-col justify-between p-12 text-slate-800 relative z-10">
          <div>
              <div className="flex items-center gap-3 mb-12">
                   <div className="size-10 bg-white/90 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                      <Image src="/x.png" alt="Logo" width={24} height={24} />
                   </div>
                   <span className="font-serif text-xl font-bold">C2X Portal</span>
              </div>
              
              <div className="max-w-md space-y-6">
                 <h1 className="text-5xl font-bold font-serif leading-tight">
                    {currentStep === 1 && "Start Your Journey to Excellence."}
                    {currentStep === 2 && "Curate Your Academic Offerings."}
                    {currentStep === 3 && "Engage Your Stakeholders."}
                    {currentStep === 4 && "Define Your Vision."}
                 </h1>
                 <p className="text-lg text-slate-600 font-medium opacity-80">
                    A guided path to setting up your institution's digital backbone for outcome-based education.
                 </p>
              </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              © 2025 Compliance to Excellence
          </div>
       </section>

       {/* Right side: Dynamic Form Area */}
       <section ref={scrollRef} className="flex-[1.5] bg-white/80 backdrop-blur-xl border-l border-white/50 shadow-2xl h-screen overflow-y-auto">
          <div className="max-w-2xl mx-auto p-12 py-16">
              
              {/* Progress */}
              {renderStepIndicator()}

              {/* Step 1: Basic Details */}
              {currentStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                      <SectionTitle title="Basic Institution Details" subtitle="Tell us about your institution and its core philosophy." />
                      
                      <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <label className="text-xs font-bold text-slate-500 uppercase">Institution Name</label>
                                   <GlassInputWrapper>
                                       <input 
                                          value={instDetails.name}
                                          onChange={e => setInstDetails({...instDetails, name: e.target.value})}
                                          className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                       />
                                   </GlassInputWrapper>
                               </div>
                               <div className="space-y-2">
                                   <label className="text-xs font-bold text-slate-500 uppercase">Institute Code (Short)</label>
                                   <GlassInputWrapper>
                                       <input 
                                          value={instDetails.code}
                                          onChange={e => setInstDetails({...instDetails, code: e.target.value})}
                                          placeholder="e.g. NSRIT"
                                          className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                       />
                                   </GlassInputWrapper>
                               </div>
                           </div>
                           
                           <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                               <div className="flex gap-4">
                                   {['Autonomous', 'Non-Autonomous'].map(s => (
                                       <button 
                                          key={s}
                                          onClick={() => setInstDetails({...instDetails, status: s as any})}
                                          className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${instDetails.status === s ? 'border-primary-gold bg-primary-gold/5 text-primary-gold' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                       >
                                           {s}
                                       </button>
                                   ))}
                               </div>
                           </div>

                           <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase">Vision</label>
                               <GlassInputWrapper>
                                   <textarea 
                                      value={instDetails.vision}
                                      onChange={e => setInstDetails({...instDetails, vision: e.target.value})}
                                      className="w-full bg-transparent p-4 outline-none min-h-[100px] text-slate-700"
                                      placeholder="To be a global leader in..."
                                   />
                               </GlassInputWrapper>
                           </div>

                           <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase">Mission</label>
                               <GlassInputWrapper>
                                   <textarea 
                                      value={instDetails.mission}
                                      onChange={e => setInstDetails({...instDetails, mission: e.target.value})}
                                      className="w-full bg-transparent p-4 outline-none min-h-[100px] text-slate-700"
                                      placeholder="To empower students..."
                                   />
                               </GlassInputWrapper>
                           </div>

                           <button 
                              onClick={handleSaveStep1}
                              disabled={loading}
                              className="flex-1 py-3 text-sm font-semibold rounded-xl transition-all bg-slate-900 text-white shadow-xl hover:shadow-slate-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                               {loading ? <Loader2 className="animate-spin" /> : <>Save & Continue <ArrowRight className="size-4" /></>}
                           </button>
                      </div>
                  </div>
              )}

              {/* Step 2: Programs */}
              {currentStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                      <SectionTitle title="Programs Offered" subtitle="Add the academic programs you offer." />
                      
                      {/* Add Form */}
                      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 mb-8 space-y-6">
                           <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                               <Plus className="size-5 text-primary-gold" /> Add New Program
                           </h3>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Program Name</label>
                                    <GlassInputWrapper>
                                        <input 
                                           placeholder="e.g. Computer Science & Engineering"
                                           value={newProgram.name}
                                           onChange={e => setNewProgram({...newProgram, name: e.target.value})}
                                           className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                        />
                                    </GlassInputWrapper>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Program Code</label>
                                    <GlassInputWrapper>
                                        <input 
                                           placeholder="e.g. CSE"
                                           value={newProgram.code}
                                           onChange={e => setNewProgram({...newProgram, code: e.target.value})}
                                           className="w-full bg-transparent p-4 outline-none font-bold text-slate-800 uppercase"
                                        />
                                    </GlassInputWrapper>
                                </div>

                                 <div className="space-y-2">
                                     <label className="text-xs font-bold text-slate-500 uppercase">Degree Type</label>
                                     <GlassInputWrapper>
                                         <div className="relative">
                                             <select 
                                                 value={newProgram.degree}
                                                 onChange={e => setNewProgram({...newProgram, degree: e.target.value})}
                                                 className="w-full bg-transparent p-4 outline-none font-bold text-slate-800 appearance-none cursor-pointer"
                                             >
                                                 <option value="B. Tech./ B. E.">B. Tech./ B. E.</option>
                                                 <option value="M. Tech.">M. Tech.</option>
                                                 <option value="M. E.">M. E.</option>
                                                 <option value="Integrated">Integrated</option>
                                             </select>
                                             <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
                                         </div>
                                     </GlassInputWrapper>
                                 </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Duration (Years)</label>
                                    <GlassInputWrapper>
                                        <div className="relative">
                                            <select 
                                                value={newProgram.years}
                                                onChange={e => setNewProgram({...newProgram, years: parseInt(e.target.value) || 4})}
                                                className="w-full bg-transparent p-4 outline-none font-bold text-slate-800 appearance-none cursor-pointer"
                                            >
                                                <option value={2}>2</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </GlassInputWrapper>
                                </div>

                                 <div className="space-y-2">
                                     <label className="text-xs font-bold text-slate-500 uppercase">Level</label>
                                     <GlassInputWrapper>
                                         <div className="relative">
                                             <select 
                                                 value={newProgram.level}
                                                 onChange={e => setNewProgram({...newProgram, level: e.target.value})}
                                                 className="w-full bg-transparent p-4 outline-none font-bold text-slate-800 appearance-none cursor-pointer"
                                             >
                                                 <option value="UG">Undergraduate (UG)</option>
                                                 <option value="PG">Postgraduate (PG)</option>
                                                 <option value="Integrated">Integrated</option>
                                             </select>
                                             <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
                                         </div>
                                     </GlassInputWrapper>
                                 </div>
                           </div>
                           
                           <button 
                             onClick={handleAddProgram} 
                             disabled={loading}
                             className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:shadow-slate-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                           >
                               {loading ? <Loader2 className="animate-spin size-5" /> : <><Plus className="size-5" /> Add Program to List</>}
                           </button>
                      </div>

                      {/* List */}
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
                          <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                      <th className="py-4 px-4 text-slate-400 font-bold uppercase">Sl.</th>
                                      <th className="py-4 px-4 text-slate-400 font-bold uppercase">Program</th>
                                      <th className="py-4 px-4 text-slate-400 font-bold uppercase">Degree</th>
                                      <th className="py-4 px-4 text-slate-400 font-bold uppercase">Duration</th>
                                      <th className="py-4 px-4 text-slate-400 font-bold uppercase text-center">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {programs.map((p, index) => (
                                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="py-4 px-4 text-slate-400 font-medium">{index + 1}</td>
                                          <td className="py-4 px-4 font-bold text-slate-800">{p.name} ({p.code})</td>
                                          <td className="py-4 px-4 text-slate-600 font-medium">{p.degree}</td>
                                          <td className="py-4 px-4 text-slate-600 font-medium">{p.years} Years</td>
                                          <td className="py-4 px-4 text-center">
                                               <button onClick={() => p.id && handleDeleteProgram(p.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                   <Trash2 className="size-4" />
                                               </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                          {programs.length === 0 && (
                              <div className="py-12 text-center text-slate-400 text-sm italic bg-slate-50/50">
                                  No programs added yet.
                              </div>
                          )}
                      </div>

                       <div className="flex gap-4">
                           <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Back</button>
                           <button onClick={() => setCurrentStep(3)} className="flex-1 py-4 bg-primary-gold text-white font-bold rounded-xl hover:bg-primary-gold/90 shadow-lg shadow-primary-gold/20 transition-all flex items-center justify-center gap-2">Continue <ArrowRight className="size-4" /></button>
                       </div>
                  </div>
              )}

              {/* Step 3: Program Details & Stakeholders */}
              {currentStep === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                      <SectionTitle title="Program Details & Stakeholders" subtitle="Define leadership, vision, and key stakeholders for each program." />
                      
                      {/* Program Selector */}
                      <div className="mb-8">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Program</label>
                          <div className="relative">
                              <select 
                                  value={selectedProgramId} 
                                  onChange={(e) => setSelectedProgramId(e.target.value)}
                                  className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-800 focus:border-primary-gold outline-none shadow-sm transition-all appearance-none cursor-pointer"
                              >
                                  <option value="">-- Select a Program --</option>
                                  {programs.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
                          </div>
                      </div>

                      {selectedProgramId && (
                          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                              
                              {/* Program Leadership & Vision */}
                              <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6 shadow-sm">
                                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                      <School className="size-6 text-primary-gold" /> Program Details
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-xs font-bold text-slate-500 uppercase">Program Chair</label>
                                          <GlassInputWrapper>
                                              <input 
                                                  value={programDetails.program_chair || ''}
                                                  onChange={e => setProgramDetails({...programDetails, program_chair: e.target.value})}
                                                  className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                                  placeholder="Name of Chair"
                                              />
                                          </GlassInputWrapper>
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-xs font-bold text-slate-500 uppercase">NBA Coordinator</label>
                                          <GlassInputWrapper>
                                              <input 
                                                  value={programDetails.nba_coordinator || ''}
                                                  onChange={e => setProgramDetails({...programDetails, nba_coordinator: e.target.value})}
                                                  className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                                  placeholder="Name of Coordinator"
                                              />
                                          </GlassInputWrapper>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase">Program Vision</label>
                                      <textarea 
                                          value={programDetails.vision || ''}
                                          onChange={e => setProgramDetails({...programDetails, vision: e.target.value})}
                                          className="w-full p-4 rounded-2xl border border-slate-200 text-slate-800 font-medium min-h-[100px] outline-none focus:border-primary-gold transition-all"
                                          placeholder="Vision for this specific program..."
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase">Program Mission</label>
                                      <textarea 
                                          value={programDetails.mission || ''}
                                          onChange={e => setProgramDetails({...programDetails, mission: e.target.value})}
                                          className="w-full p-4 rounded-2xl border border-slate-200 text-slate-800 font-medium min-h-[100px] outline-none focus:border-primary-gold transition-all"
                                          placeholder="Mission for this specific program..."
                                      />
                                  </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                                       <div className="flex flex-col gap-1">
                                           <div className="flex items-center gap-3">
                                               <label className="relative inline-flex items-center cursor-pointer">
                                                   <input 
                                                       type="checkbox" 
                                                       className="sr-only peer" 
                                                       checked={programs.find(p => p.id === selectedProgramId)?.stakeholder_feedback_enabled || false}
                                                       onChange={(e) => handleToggleStakeholderFeedback(e.target.checked)}
                                                   />
                                                   <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-gold"></div>
                                               </label>
                                               <span className="text-sm font-bold text-slate-700">Enable & Seek Stakeholders’ Expectation</span>
                                           </div>
                                           <p className="text-[10px] text-slate-400 font-medium ml-14">Grants access to a separate feedback dashboard for stakeholders.</p>
                                       </div>
                                       <button 
                                           onClick={handleUpdateProgramDetails}
                                           disabled={loading}
                                           className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                                       >
                                           {loading ? <Loader2 className="animate-spin size-4" /> : <><Save className="size-4" /> Save Program Details</>}
                                       </button>
                                   </div>
                              </div>

                               {/* Stakeholders Section */}
                               <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
                                   <div className="flex items-center justify-between">
                                       <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                           <Users className="size-6 text-primary-gold" /> Stakeholders
                                       </h3>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase bg-white px-2 py-1 rounded-lg border border-slate-100">
                                           Total: {stakeholders.length}
                                       </span>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                       <div className="col-span-1 md:col-span-2 space-y-2">
                                           <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                           <GlassInputWrapper>
                                               <input 
                                                  placeholder="e.g. Dr. John Doe"
                                                  value={newStakeholder.name}
                                                  onChange={e => setNewStakeholder({...newStakeholder, name: e.target.value})}
                                                  className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                               />
                                           </GlassInputWrapper>
                                       </div>

                                       <div className="space-y-2">
                                           <label className="text-xs font-bold text-slate-500 uppercase">Organisation</label>
                                           <GlassInputWrapper>
                                               <input 
                                                  placeholder="e.g. Acme Industry / Alumni Assoc."
                                                  value={newStakeholder.organisation}
                                                  onChange={e => setNewStakeholder({...newStakeholder, organisation: e.target.value})}
                                                  className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                               />
                                           </GlassInputWrapper>
                                       </div>

                                       <div className="space-y-2">
                                           <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                                           <div className="relative">
                                               <select 
                                                   value={newStakeholder.category}
                                                   onChange={e => setNewStakeholder({...newStakeholder, category: e.target.value})}
                                                   className="w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none font-bold text-slate-800 appearance-none shadow-sm focus:border-primary-gold transition-all"
                                               >
                                                   {['Academia', 'Industry', 'Potential Employers', 'Research Organisations', 'Professional Body', 'Alumni', 'Students', 'Parents', 'Management'].map(c => (
                                                       <option key={c} value={c}>{c}</option>
                                                   ))}
                                               </select>
                                               <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
                                           </div>
                                       </div>

                                       <div className="space-y-2">
                                           <label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label>
                                           <GlassInputWrapper>
                                               <input 
                                                  placeholder="e.g. +91 9876543210"
                                                  value={newStakeholder.contact_no}
                                                  onChange={e => setNewStakeholder({...newStakeholder, contact_no: e.target.value})}
                                                  className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                               />
                                           </GlassInputWrapper>
                                       </div>

                                       <div className="space-y-2">
                                           <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                                           <GlassInputWrapper>
                                               <input 
                                                  placeholder="e.g. john@example.com"
                                                  value={newStakeholder.email}
                                                  onChange={e => setNewStakeholder({...newStakeholder, email: e.target.value})}
                                                  className="w-full bg-transparent p-4 outline-none font-bold text-slate-800"
                                               />
                                           </GlassInputWrapper>
                                       </div>

                                       <button 
                                  onClick={handleAddStakeholder} 
                                  disabled={loading}
                                  className="flex-1 py-3 text-sm font-semibold rounded-xl transition-all bg-white text-slate-900 border border-slate-200 shadow-sm hover:border-slate-300 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin size-4" /> : <><Plus className="size-4" /> Add Stakeholder</>}
                                </button>
                                   </div>

                                    {/* Stakeholder List */}
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="py-4 px-4 text-slate-400 font-bold uppercase">Sl.</th>
                                                        <th className="py-4 px-2 text-slate-400 font-bold uppercase">Name</th>
                                                        <th className="py-4 px-2 text-slate-400 font-bold uppercase">Org / Cat</th>
                                                        <th className="py-4 px-2 text-slate-400 font-bold uppercase">Email</th>
                                                        <th className="py-4 px-4 text-slate-400 font-bold uppercase text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {stakeholders.map((s, index) => (
                                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-4 px-4 text-slate-400 font-medium">{index + 1}</td>
                                                            <td className="py-4 px-2 font-bold text-slate-800">{s.name}</td>
                                                            <td className="py-4 px-2">
                                                                <div className="space-y-1">
                                                                    <div className="text-slate-600 font-medium">{s.organisation}</div>
                                                                    <div className="text-[9px] text-primary-gold font-bold uppercase px-1.5 py-0.5 bg-primary-gold/5 rounded inline-block">{s.category}</div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-slate-500">{s.email}</td>
                                                            <td className="py-4 px-4 text-center">
                                                                 <button onClick={() => s.id && handleDeleteStakeholder(s.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                                     <Trash2 className="size-4" />
                                                                 </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {stakeholders.length === 0 && (
                                                <div className="py-12 text-center text-slate-400 text-sm italic bg-slate-50/50">
                                                    <Users className="size-8 mx-auto mb-2 opacity-20" />
                                                    No stakeholders added yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                               </div>
                          </div>
                      )}

                       <div className="flex gap-4 mt-8">
                           <button onClick={() => setCurrentStep(2)} className="flex-1 py-3 text-sm font-semibold rounded-xl transition-all bg-white text-slate-500 border border-slate-100 shadow-sm hover:bg-slate-50">Back</button>
                           <button onClick={() => setCurrentStep(4)} className="flex-[2] py-3 text-sm font-semibold rounded-xl transition-all bg-slate-900 text-white shadow-xl hover:shadow-slate-500/20 active:scale-[0.98]">Continue to PEOs</button>
                       </div>
                  </div>
              )}

              {/* Step 4: PEO Generation */}
              {currentStep === 4 && (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                      <SectionTitle title="Define Vision & PEOs" subtitle="AI-assisted generation of Program Educational Objectives." />
                      
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
                          <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
                              <Lightbulb className="size-5" /> AI Insight
                          </h3>
                          <p className="text-sm text-blue-700 leading-relaxed mb-4">
                              Based on your Institute Vision "<strong>{instDetails.vision.substring(0, 50)}...</strong>" 
                              and the attributes of your <strong>{programs.length} Programs</strong>, 
                              we can generate aligned PEOs.
                          </p>
                          <div className="text-xs text-blue-600 font-medium bg-blue-100/50 p-3 rounded-lg border border-blue-200">
                             Context: {programs.length} Programs, {stakeholders.length} Stakeholders included.
                          </div>
                      </div>

                       <div className="space-y-4 mb-8">
                           {peoSets.length === 0 && !isGeneratingPeos && (
                               <button 
                                   onClick={handleGeneratePEOs}
                                   className="w-full py-12 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-gold hover:bg-primary-gold/5 flex flex-col items-center justify-center gap-3 transition-all"
                               >
                                   <RefreshCw className="size-10 text-slate-300" />
                                   <span className="font-bold text-slate-400">Click to Generate 4 Sets of PEOs</span>
                               </button>
                           )}

                           {isGeneratingPeos && (
                               <div className="w-full py-20 flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-2xl border border-slate-100">
                                   <Loader2 className="size-10 text-primary-gold animate-spin" />
                                   <p className="text-slate-500 font-bold animate-pulse">Aligning with Vision & Mission...</p>
                               </div>
                           )}

                           {peoSets.length > 0 && !isGeneratingPeos && (
                               <div className="space-y-8 animate-in fade-in duration-500">
                                     <div className="flex items-center justify-between">
                                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Save className="size-5 text-primary-gold" /> Generated Proposals (4 Sets)
                                         </h3>
                                         <button onClick={handleGeneratePEOs} className="text-xs font-bold text-primary-gold flex items-center gap-1 hover:underline bg-primary-gold/5 px-3 py-1.5 rounded-lg border border-primary-gold/10">
                                             <RefreshCw className="size-3" /> Regenerate
                                         </button>
                                     </div>

                                     {/* 4 Sets Display */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         {peoSets.map((set, setIdx) => (
                                             <div key={setIdx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-primary-gold/30 transition-all">
                                                 <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Option Set {setIdx + 1}</h4>
                                                    <div className="size-2 rounded-full bg-primary-gold/40 animate-pulse" />
                                                 </div>
                                                 <div className="space-y-3">
                                                     {set.map((peo, pIdx) => (
                                                         <div 
                                                             key={pIdx} 
                                                             onClick={() => handleFinalizePeo(peo)}
                                                             className="p-4 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-700 cursor-pointer hover:border-primary-gold hover:shadow-md transition-all relative group font-medium leading-relaxed"
                                                         >
                                                             {peo.statement}
                                                             <div className="absolute -right-1.5 -top-1.5 bg-primary-gold text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
                                                                 <Plus className="size-3" />
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>

                                     {/* Finalized Box */}
                                     <div className="mt-12 group">
                                         <div className="relative p-1 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-950 shadow-2xl overflow-hidden">
                                            {/* Decorative background elements */}
                                            <div className="absolute top-0 right-0 size-32 bg-primary-gold/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                            <div className="absolute bottom-0 left-0 size-32 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16" />

                                            <div className="relative bg-slate-900/40 backdrop-blur-sm p-8 rounded-[1.75rem] space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-white text-xl font-bold font-serif flex items-center gap-3">
                                                            <div className="size-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                                                                <CheckCircle2 className="size-6 text-green-400" />
                                                            </div>
                                                            Finalised PEOs
                                                        </h3>
                                                        <p className="text-slate-500 text-xs mt-1 font-medium italic">These objectives will be preserved with unique identifiers.</p>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl font-black text-white/10 font-mono tracking-tighter leading-none">{finalizedPeos.length}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">OBJECTIVES</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    {finalizedPeos.map((peo, index) => (
                                                        <div key={peo.id} className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl relative group hover:border-slate-600/50 transition-all">
                                                            <div className="flex items-start gap-4">
                                                                <div className="mt-1 flex flex-col items-center">
                                                                    <div className="text-[10px] font-black font-mono text-primary-gold opacity-80">{peo.id}</div>
                                                                    <div className="w-px h-full bg-slate-700/50 mt-2" />
                                                                </div>
                                                                <p className="text-slate-200 text-sm leading-relaxed font-medium flex-1">{peo.statement}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleRemoveFinalizedPeo(peo.id)}
                                                                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {finalizedPeos.length === 0 && (
                                                        <div className="py-12 text-center border-2 border-dashed border-slate-800/50 rounded-2xl text-slate-600 text-sm font-medium italic flex flex-col items-center gap-3">
                                                            <div className="size-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                                                                <Save className="size-5 opacity-20" />
                                                            </div>
                                                            Selective finalized statements will appear here.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                         </div>
                                     </div>
                               </div>
                           )}
                       </div>

                       <div className="flex gap-4">
                           <button onClick={() => setCurrentStep(3)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Back</button>
                           <button 
                              onClick={handleSaveFinalPEOs}
                              disabled={loading || finalizedPeos.length === 0}
                              className="flex-[2] py-3 text-sm font-semibold rounded-xl transition-all bg-slate-900 text-white shadow-xl hover:shadow-slate-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-4" /> Finalize Setup</>}
                           </button>
                       </div>
                  </div>
              )}

          </div>
       </section>
    </div>
  );
}
