'use client';

import React, { useState } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function StakeholderSurvey({ programId }: { programId: string }) {
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
    additional_comments: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const handleCheckboxChange = (field: keyof typeof formData, value: string) => {
    // @ts-ignore
    setFormData(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting Survey:', formData);
    // Mock success - in real app, save to Supabase
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Thank You!</h2>
          <p className="text-slate-600 dark:text-slate-300">Your feedback is invaluable in shaping the future of our Mechanical Engineering program.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen font-sans py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#137fec] p-8 text-white">
          <h1 className="text-2xl font-bold mb-2">Program Educational Objectives (PEOs) – Stakeholder Survey</h1>
          <p className="opacity-90">Program: B.Tech – Mechanical Engineering</p>
          <p className="text-sm mt-4 opacity-80">Purpose: To collect stakeholder inputs for formulation/revision of PEOs.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          
          {/* Section A: Stakeholder Profile */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION A: Stakeholder Profile</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Stakeholder Category *</span>
                <select 
                  required
                  className="w-full mt-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  <option>Student</option>
                  <option>Alumni</option>
                  <option>Parent</option>
                  <option>Industry Representative</option>
                  <option>Academic Expert</option>
                  <option>Research Expert</option>
                  <option>Professional Body Representative</option>
                </select>
              </label>
              
              <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Name (Optional)</span>
                <input 
                  className="w-full mt-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </label>
            </div>
          </section>

          {/* Section B: Career Progression */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION B: Career Progression (3–5 Years)</h3>
            
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">What professional roles should a graduate be able to perform?</p>
              <div className="grid md:grid-cols-2 gap-2">
                {['Design / Analysis Engineer', 'Manufacturing / Production Engineer', 'R&D / Research Engineer', 'Maintenance / Quality Engineer', 'Higher Studies / Research Scholar', 'Entrepreneur / Start-up Founder', 'Managerial / Leadership Roles'].map(role => (
                  <label key={role} className="flex items-center gap-2">
                    <input type="checkbox" onChange={() => handleCheckboxChange('career_roles', role)} />
                    <span className="text-sm">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Section C: Technical Competence */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION C: Technical Competence</h3>
             
             <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Importance of strong fundamentals:</p>
                <div className="flex gap-4">
                  {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" name="fundamentals" value={opt} onChange={e => setFormData({...formData, fundamentals_importance: e.target.value})} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
             </div>

             <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Critical core domains (Multiple choice):</p>
              <div className="grid md:grid-cols-2 gap-2">
                {['Engineering Mechanics', 'Thermal Engineering', 'Fluid Mechanics', 'Manufacturing Processes', 'Materials & Metallurgy', 'Machine Design', 'Mechatronics / Automation'].map(domain => (
                  <label key={domain} className="flex items-center gap-2">
                    <input type="checkbox" onChange={() => handleCheckboxChange('core_domains', domain)} />
                    <span className="text-sm">{domain}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Problem-solving ability level:</p>
                 <select 
                  className="w-full mt-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                  value={formData.problem_solving_level}
                  onChange={e => setFormData({...formData, problem_solving_level: e.target.value})}
                >
                  <option value="">Select Level</option>
                  <option>Routine problem execution</option>
                  <option>Analytical problem solving</option>
                  <option>System-level thinking</option>
                  <option>Innovation-oriented problem solving</option>
                </select>
            </div>
          </section>

          {/* Section D: Emerging Technologies */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION D: Emerging Technologies</h3>
              <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Which emerging areas should PEOs emphasize?</p>
              <div className="grid md:grid-cols-2 gap-2">
                {['CAD / CAE / CFD / FEA', 'Additive Manufacturing', 'Robotics & Automation', 'Digital Manufacturing / Industry 4.0', 'AI / ML applications', 'Sustainable & Green Technologies'].map(area => (
                  <label key={area} className="flex items-center gap-2">
                    <input type="checkbox" onChange={() => handleCheckboxChange('emerging_areas', area)} />
                    <span className="text-sm">{area}</span>
                  </label>
                ))}
              </div>
            </div>
             <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Importance of multidisciplinary capability:</p>
                <div className="flex gap-4">
                  {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" name="multidisciplinary" value={opt} onChange={e => setFormData({...formData, multidisciplinary_importance: e.target.value})} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
             </div>
          </section>

          {/* Section E: Professional Skills */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION E: Professional Skills</h3>
             <div className="space-y-4">
               {['Communication', 'Teamwork', 'Leadership', 'Project Management'].map(skill => (
                 <div key={skill} className="flex items-center justify-between">
                    <span className="text-sm font-medium w-1/3">{skill}</span>
                    <div className="flex gap-4">
                       {['Very Important', 'Important', 'Moderate'].map(rating => (
                          <label key={rating} className="flex items-center gap-1">
                            <input 
                              type="radio" 
                              name={`skill_${skill}`} 
                              onChange={() => setFormData(prev => ({...prev, skills_rating: {...prev.skills_rating, [skill]: rating}}))}
                            />
                            <span className="text-xs">{rating}</span>
                          </label>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
             <div className="mt-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Importance of ethics, safety, and quality:</p>
                <div className="flex gap-4">
                  {['Very High', 'High', 'Moderate', 'Low'].map(opt => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" name="ethics" value={opt} onChange={e => setFormData({...formData, ethics_importance: e.target.value})} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
             </div>
          </section>

          {/* Section F: Lifelong Learning */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION F: Lifelong Learning</h3>
             <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Encourage continuous learning?</p>
                 <div className="flex gap-4">
                  {['Yes', 'No', 'Maybe'].map(opt => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" name="lifelong" value={opt} onChange={e => setFormData({...formData, lifelong_learning: e.target.value})} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
             </div>
             <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Pathways to support (Multiple choice):</p>
              <div className="grid md:grid-cols-2 gap-2">
                {['Higher Studies (M.Tech / MS / Ph.D.)', 'Professional Certifications', 'Research & Innovation', 'Entrepreneurship', 'Professional Body Memberships'].map(path => (
                  <label key={path} className="flex items-center gap-2">
                    <input type="checkbox" onChange={() => handleCheckboxChange('pathways', path)} />
                    <span className="text-sm">{path}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

           {/* Section G: Global & Societal */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION G: Global & Societal</h3>
             <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Prepared for global careers?</p>
                 <div className="flex gap-4">
                  {['Yes', 'No', 'Depends'].map(opt => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" name="global" value={opt} onChange={e => setFormData({...formData, global_career: e.target.value})} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
             </div>
              <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Role in societal development:</p>
              <div className="grid md:grid-cols-2 gap-2">
                {['Sustainable engineering', 'Energy efficiency & environment', 'Infrastructure & manufacturing growth', 'Community welfare'].map(role => (
                  <label key={role} className="flex items-center gap-2">
                    <input type="checkbox" onChange={() => handleCheckboxChange('societal_role', role)} />
                    <span className="text-sm">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

           {/* Section H & I: Vision & Validation */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION H & I: Vision & Validation</h3>
             <label className="block">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">What should distinguish graduates of this program?</span>
                <textarea 
                  className="w-full mt-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                  rows={2}
                  value={formData.differentiation}
                  onChange={e => setFormData({...formData, differentiation: e.target.value})}
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Graduates should demonstrate (3-5 years):</p>
                <div className="grid md:grid-cols-1 gap-2">
                  {['Strong technical competence', 'Professional growth and leadership', 'Lifelong learning capability', 'Ethical and responsible engineering practice', 'Contribution to society and sustainability'].map(item => (
                    <label key={item} className="flex items-center gap-2">
                      <input type="checkbox" onChange={() => handleCheckboxChange('peo_validation', item)} />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

               <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Are expectations reflected in current PEOs?</p>
                 <div className="flex gap-4">
                  {['Yes', 'Partially', 'No'].map(opt => (
                    <label key={opt} className="flex items-center gap-1">
                      <input type="radio" name="expectations" value={opt} onChange={e => setFormData({...formData, expectations_reflected: e.target.value})} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
             </div>
          </section>

          {/* Section J: Additional */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">SECTION J: Additional Comments</h3>
             <textarea 
                className="w-full p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                rows={4}
                placeholder="Any additional suggestions..."
                value={formData.additional_comments}
                onChange={e => setFormData({...formData, additional_comments: e.target.value})}
              />
          </section>

          {/* Submit Button */}
          <div className="pt-6">
            <button type="submit" className="w-full bg-[#137fec] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-colors">
              Submit Feedback
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
