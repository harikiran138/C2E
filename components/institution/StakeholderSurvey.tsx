'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { 
  ClipboardCheck, 
  User, 
  Briefcase, 
  BookOpen, 
  Zap, 
  Award, 
  GraduationCap, 
  Globe, 
  Eye, 
  MessageSquare,
  CheckCircle2,
  Loader2,
  ChevronRight
} from 'lucide-react';

export default function StakeholderSurvey({ programId, stakeholderId }: { programId: string, stakeholderId?: string }) {
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    organization: '',
    designation: '',
    association_years: '',
    career_roles: [] as string[],
    success_definition: [] as string[],
    fundamentals_importance: '',
    core_domains: [] as string[],
    problem_solving_level: '',
    emerging_areas: [] as string[],
    multidisciplinary_importance: '',
    skills_rating: {} as Record<string, string>,
    ethics_importance: '',
    lifelong_learning: '',
    pathways: [] as string[],
    research_importance: '',
    global_career: '',
    societal_role: [] as string[],
    differentiation: '',
    peo_validation: [] as string[],
    expectations_reflected: '',
    future_competencies: '',
    additional_comments: '',
    aspect_emphasis: {} as Record<string, string>
  });

  const [programName, setProgramName] = useState('Mechanical Engineering');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchProgram = async () => {
      if (!programId) return;
      const { data } = await supabase.from('programs').select('name').eq('id', programId).maybeSingle();
      if (data) setProgramName(data.name);
    };
    fetchProgram();
  }, [programId]);

  const handleCheckboxChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleRatingChange = (field: 'skills_rating' | 'aspect_emphasis', key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.from('stakeholder_feedback').insert({
        program_id: programId,
        stakeholder_id: stakeholderId || null,
        feedback_json: formData,
        submitted_at: new Date().toISOString()
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (error: any) {
      alert("Error submitting survey: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'profile', title: 'Profile', icon: User },
    { id: 'career', title: 'Career', icon: Briefcase },
    { id: 'technical', title: 'Technical', icon: BookOpen },
    { id: 'future', title: 'Future', icon: Zap },
    { id: 'skills', title: 'Skills', icon: Award },
    { id: 'learning', title: 'Learning', icon: GraduationCap },
    { id: 'societal', title: 'Societal', icon: Globe },
    { id: 'vision', title: 'Vision', icon: Eye },
    { id: 'validation', title: 'PEO Validation', icon: CheckCircle2 },
    { id: 'additional', title: 'Suggestions', icon: MessageSquare },
  ];

  const calculateProgress = () => {
    const totalFields = sections.length;
    let filledFields = 0;
    if (formData.category) filledFields++;
    if (formData.career_roles.length > 0) filledFields++;
    if (formData.fundamentals_importance) filledFields++;
    if (formData.emerging_areas.length > 0) filledFields++;
    if (Object.keys(formData.skills_rating).length > 0) filledFields++;
    if (formData.lifelong_learning) filledFields++;
    if (formData.global_career) filledFields++;
    if (formData.differentiation) filledFields++;
    if (formData.peo_validation.length > 0) filledFields++;
    if (formData.additional_comments) filledFields++;
    return (filledFields / totalFields) * 100;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center space-y-6 border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-500">
          <div className="size-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="size-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-serif">Thank You!</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Your feedback is invaluable in shaping the future of our <span className="text-primary-gold font-bold">{programName}</span> program.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title, id }: { icon: any, title: string, id: string }) => (
    <div id={id} className="pt-16 mb-6 first:pt-0 scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 bg-primary-gold/10 rounded-xl flex items-center justify-center border border-primary-gold/20">
          <Icon className="size-5 text-primary-gold" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white font-serif">{title}</h3>
      </div>
      <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-slate-700 dark:via-slate-800" />
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen font-sans py-12 px-4 selection:bg-primary-gold/30">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sticky Sidebar Navigation */}
        <aside className="hidden lg:block w-72 sticky top-12 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">Navigation</h4>
            <div className="space-y-1">
              {sections.map((s) => (
                <a 
                  key={s.id} 
                  href={`#${s.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold text-sm group"
                >
                  <div className="size-8 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center group-hover:text-primary-gold transition-colors">
                    <s.icon className="size-4" />
                  </div>
                  {s.title}
                </a>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 size-20 bg-primary-gold/20 rounded-full blur-2xl -mr-10 -mt-10" />
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Your Progress</h5>
            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-gold transition-all duration-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  style={{ width: `${calculateProgress()}%` }} 
                />
              </div>
              <p className="text-[10px] font-bold text-primary-gold uppercase tracking-widest">{Math.round(calculateProgress())}% Completed</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 max-w-4xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
          {/* Header */}
          <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-primary-gold/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 size-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
            
            {/* Mobile Progress Bar (Sticky) */}
            <div className="lg:hidden fixed top-0 left-0 w-full h-1 bg-slate-800 z-[100]">
              <div 
                className="h-full bg-primary-gold transition-all duration-500" 
                style={{ width: `${calculateProgress()}%` }} 
              />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-black uppercase tracking-widest text-primary-gold">
                <ClipboardCheck className="size-3" /> Stakeholder Consultation
              </div>
              <h1 className="text-4xl font-bold font-serif leading-tight">Program Educational Objectives (PEOs) – Stakeholder Survey</h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="size-2 bg-primary-gold rounded-full" />
                  Program: {programName}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 bg-blue-400 rounded-full" />
                  NBA / ABET / Washington Accord Compliant
                </div>
              </div>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed italic pt-2">
                Program Educational Objectives (PEOs) describe what graduates are expected to achieve 3–5 years after graduation. Your input helps us refine these goals.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-12 space-y-12">
            
            {/* SECTION A: Stakeholder Profile */}
            <section>
              <SectionHeader icon={User} title="SECTION A: Stakeholder Profile" id="profile" />
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Stakeholder Category *</label>
                  <div className="relative">
                    <select 
                      required
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-bold text-slate-800 dark:text-slate-200 appearance-none cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {['Student', 'Alumni', 'Parent', 'Industry Representative', 'Academic Expert', 'Research Expert', 'Professional Body Representative'].map(cat => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Name (Optional)</label>
                  <input 
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Organization / Institution</label>
                  <input 
                    placeholder="Company or College name"
                    value={formData.organization}
                    onChange={e => setFormData({...formData, organization: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Designation / Relationship</label>
                  <input 
                    placeholder="e.g. Senior Engineer / Parent of..."
                    value={formData.designation}
                    onChange={e => setFormData({...formData, designation: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Years of association with Mechanical Engineering</label>
                  <div className="flex flex-wrap gap-4">
                    {['< 3 years', '3–5 years', '5–10 years', '>10 years'].map(opt => (
                      <label key={opt} className={`flex-1 min-w-[120px] p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 font-bold text-sm ${
                        formData.association_years === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}>
                        <input 
                          type="radio" 
                          name="association_years" 
                          className="hidden" 
                          value={opt} 
                          onChange={e => setFormData({...formData, association_years: e.target.value})} 
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION B: Career Progression */}
            <section>
              <SectionHeader icon={Briefcase} title="SECTION B: Career Progression & Outcomes (3–5 Years)" id="career" />
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Professional roles a graduate should be able to perform 3–5 years after graduation:</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {['Design / Analysis Engineer', 'Manufacturing / Production Engineer', 'R&D / Research Engineer', 'Maintenance / Quality Engineer', 'Higher Studies / Research Scholar', 'Entrepreneur / Start-up Founder', 'Managerial / Leadership Roles'].map(role => (
                      <label key={role} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                        formData.career_roles.includes(role)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={formData.career_roles.includes(role)}
                          onChange={() => handleCheckboxChange('career_roles', role)}
                          className="size-4 rounded accent-primary-gold"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">What defines professional success for a graduate?</p>
                  <div className="flex flex-wrap gap-3">
                    {['Career growth', 'Job stability', 'Leadership responsibilities', 'Research / innovation contributions', 'Societal impact'].map(item => (
                      <label key={item} className={`px-5 py-3 rounded-full border transition-all cursor-pointer font-bold text-xs uppercase tracking-wider ${
                        formData.success_definition.includes(item)
                        ? 'bg-primary-gold text-white border-primary-gold shadow-md' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      }`}>
                        <input type="checkbox" className="hidden" checked={formData.success_definition.includes(item)} onChange={() => handleCheckboxChange('success_definition', item)} />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION C: Technical Competence */}
            <section>
              <SectionHeader icon={BookOpen} title="SECTION C: Technical Competence & Core Knowledge" id="technical" />
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Rate the importance of strong fundamentals for long-term success:</p>
                  <div className="flex gap-4">
                    {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.fundamentals_importance === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="radio" name="fundamentals" className="hidden" value={opt} onChange={e => setFormData({...formData, fundamentals_importance: e.target.value})} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Critical core domains for future careers (Multiple choice):</p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {['Engineering Mechanics', 'Thermal Engineering', 'Fluid Mechanics', 'Manufacturing Processes', 'Materials & Metallurgy', 'Machine Design', 'Mechatronics / Automation'].map(domain => (
                      <label key={domain} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                        formData.core_domains.includes(domain)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="checkbox" checked={formData.core_domains.includes(domain)} onChange={() => handleCheckboxChange('core_domains', domain)} className="size-4" />
                        {domain}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Problem-solving ability level expected after 3–5 years:</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {['Routine problem execution', 'Analytical problem solving', 'System-level thinking', 'Innovation-oriented problem solving'].map(level => (
                      <label key={level} className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer space-y-2 ${
                        formData.problem_solving_level === level 
                        ? 'bg-primary-gold/5 border-primary-gold shadow-md ring-1 ring-primary-gold' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}>
                        <input 
                          type="radio" 
                          name="problem_solving" 
                          className="hidden" 
                          value={level} 
                          checked={formData.problem_solving_level === level}
                          onChange={e => setFormData({...formData, problem_solving_level: e.target.value})} 
                        />
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${formData.problem_solving_level === level ? 'text-slate-900' : 'text-slate-600'}`}>{level}</span>
                          {formData.problem_solving_level === level && <CheckCircle2 className="size-5 text-primary-gold" />}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION D: Emerging Technologies */}
            <section>
              <SectionHeader icon={Zap} title="SECTION D: Emerging Technologies & Future Readiness" id="future" />
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Emerging areas PEOs should emphasize:</p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {['CAD / CAE / CFD / FEA', 'Additive Manufacturing', 'Robotics & Automation', 'Digital Manufacturing / Industry 4.0', 'AI / ML applications', 'Sustainable & Green Technologies'].map(area => (
                      <label key={area} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                        formData.emerging_areas.includes(area)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="checkbox" checked={formData.emerging_areas.includes(area)} onChange={() => handleCheckboxChange('emerging_areas', area)} className="size-4" />
                        {area}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Importance of multidisciplinary capability (Mechanical + Electrical + Software):</p>
                  <div className="flex gap-4">
                    {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.multidisciplinary_importance === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="radio" name="multidisciplinary" className="hidden" value={opt} onChange={e => setFormData({...formData, multidisciplinary_importance: e.target.value})} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION E: Professional Skills */}
            <section>
              <SectionHeader icon={Award} title="SECTION E: Professional Skills, Ethics & Responsibility" id="skills" />
              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-5 text-sm font-black text-slate-400 uppercase tracking-widest">Skill</th>
                        {['Very Important', 'Important', 'Moderate'].map(h => (
                          <th key={h} className="p-5 text-center text-xs font-black text-slate-400 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {['Communication', 'Teamwork', 'Leadership', 'Project Management'].map(skill => (
                        <tr key={skill} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300">{skill}</td>
                          {['Very Important', 'Important', 'Moderate'].map(rating => (
                            <td key={rating} className="p-5 text-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input 
                                  type="radio" 
                                  name={`skill_${skill}`} 
                                  className="size-5 accent-primary-gold" 
                                  onChange={() => handleRatingChange('skills_rating', skill, rating)} 
                                />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Importance of ethics, safety, and quality practices:</p>
                  <div className="flex gap-4">
                    {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.ethics_importance === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input 
                          type="radio" 
                          name="ethics" 
                          className="hidden" 
                          value={opt} 
                          checked={formData.ethics_importance === opt}
                          onChange={e => setFormData({...formData, ethics_importance: e.target.value})} 
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION F: Lifelong Learning */}
            <section>
              <SectionHeader icon={GraduationCap} title="SECTION F: Lifelong Learning, Research & Growth" id="learning" />
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Should graduates be encouraged towards continuous learning?</p>
                  <div className="flex gap-4">
                    {['Yes', 'No', 'Maybe'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.lifelong_learning === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="radio" name="lifelong" className="hidden" value={opt} onChange={e => setFormData({...formData, lifelong_learning: e.target.value})} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pathways PEOs should explicitly support (Multiple choice):</p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {['Higher Studies (M.Tech / MS / Ph.D.)', 'Professional Certifications', 'Research & Innovation', 'Entrepreneurship', 'Professional Body Memberships'].map(path => (
                      <label key={path} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                        formData.pathways.includes(path)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="checkbox" checked={formData.pathways.includes(path)} onChange={() => handleCheckboxChange('pathways', path)} className="size-4" />
                        {path}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Importance of exposure to research, innovation, and patents:</p>
                  <div className="flex gap-4">
                    {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.research_importance === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="radio" name="research" className="hidden" value={opt} onChange={e => setFormData({...formData, research_importance: e.target.value})} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION G: Global & Societal */}
            <section>
              <SectionHeader icon={Globe} title="SECTION G: Global, Societal & Sustainability Perspective" id="societal" />
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Should graduates be prepared for global careers?</p>
                  <div className="flex gap-4">
                    {['Yes', 'No', 'Depends'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.global_career === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="radio" name="global" className="hidden" value={opt} onChange={e => setFormData({...formData, global_career: e.target.value})} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Role Mechanical engineers should play in societal/national development:</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {['Sustainable engineering', 'Energy efficiency & environment', 'Infrastructure & manufacturing growth', 'Community welfare'].map(role => (
                      <label key={role} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                        formData.societal_role.includes(role)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="checkbox" checked={formData.societal_role.includes(role)} onChange={() => handleCheckboxChange('societal_role', role)} className="size-4" />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION H: Program Differentiation */}
            <section>
              <SectionHeader icon={Eye} title="SECTION H: Program Differentiation & Institutional Vision" id="vision" />
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">What should distinguish graduates of this Mechanical Engineering program from others?</label>
                  <textarea 
                    placeholder="Describe unique strengths..."
                    rows={3}
                    value={formData.differentiation}
                    onChange={e => setFormData({...formData, differentiation: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-[1.5rem] outline-none focus:border-primary-gold transition-all font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[500px]">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-5 text-sm font-black text-slate-400 uppercase tracking-widest">Aspect Emphasis</th>
                        {['High Emphasis', 'Moderate'].map(h => (
                          <th key={h} className="p-5 text-center text-xs font-black text-slate-400 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {['Academic excellence', 'Skill development', 'Values & ethics', 'Innovation & research'].map(aspect => (
                        <tr key={aspect} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300">{aspect}</td>
                          {['High Emphasis', 'Moderate'].map(rating => (
                            <td key={rating} className="p-5 text-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input 
                                  type="radio" 
                                  name={`aspect_${aspect}`} 
                                  className="size-5 accent-primary-gold" 
                                  onChange={() => handleRatingChange('aspect_emphasis', aspect, rating)} 
                                />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </section>

            {/* SECTION I: PEO Validation */}
            <section>
              <SectionHeader icon={CheckCircle2} title="SECTION I: PEO Validation (Accreditation Key)" id="validation" />
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">In your view, 3–5 years after graduation, a graduate should demonstrate:</p>
                  <div className="grid gap-3">
                    {[
                      'Strong technical competence', 
                      'Professional growth and leadership', 
                      'Lifelong learning capability', 
                      'Ethical and responsible engineering practice', 
                      'Contribution to society and sustainability'
                    ].map(item => (
                      <label key={item} className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        formData.peo_validation.includes(item)
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 font-bold' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          formData.peo_validation.includes(item) ? 'bg-green-500 border-transparent' : 'bg-white border-slate-200'
                        }`}>
                          {formData.peo_validation.includes(item) && <CheckCircle2 className="size-4 text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.peo_validation.includes(item)} onChange={() => handleCheckboxChange('peo_validation', item)} />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Do you feel stakeholder expectations are adequately reflected in current PEOs?</p>
                  <div className="flex gap-4">
                    {['Yes', 'Partially', 'No'].map(opt => (
                      <label key={opt} className={`flex-1 p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm ${
                        formData.expectations_reflected === opt 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        <input type="radio" name="expectations" className="hidden" value={opt} onChange={e => setFormData({...formData, expectations_reflected: e.target.value})} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">What future competencies should PEOs emphasize more strongly?</label>
                  <textarea 
                    placeholder="Short answer..."
                    rows={2}
                    value={formData.future_competencies}
                    onChange={e => setFormData({...formData, future_competencies: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-[1.5rem] outline-none focus:border-primary-gold transition-all font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </section>

            {/* SECTION J: Additional Suggestions */}
            <section>
              <SectionHeader icon={MessageSquare} title="SECTION J: Additional Suggestions" id="additional" />
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Any additional comments or recommendations for improving PEOs:</p>
                <textarea 
                  placeholder="Your suggestions here..."
                  rows={4}
                  value={formData.additional_comments}
                  onChange={e => setFormData({...formData, additional_comments: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-12 border-t border-slate-100 dark:border-slate-700">
              <button 
                type="submit" 
                disabled={loading}
                className="group relative w-full bg-slate-900 dark:bg-slate-700 text-white font-black py-6 rounded-[2rem] shadow-2xl hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 overflow-hidden text-lg uppercase tracking-widest disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-gold/0 via-primary-gold/10 to-primary-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {loading ? <Loader2 className="animate-spin size-6" /> : (
                  <>
                    Complete Official Consultation
                    <ChevronRight className="size-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              <button 
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full mt-4 py-4 text-xs font-bold text-slate-400 hover:text-primary-gold transition-colors flex items-center justify-center gap-2"
              >
                <ArrowUp className="size-3" /> Back to Top
              </button>

              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-6 flex items-center justify-center gap-2">
                <span className="size-1 bg-slate-300 rounded-full" />
                Data integrity and privacy guaranteed
                <span className="size-1 bg-slate-300 rounded-full" />
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

const ArrowUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);
