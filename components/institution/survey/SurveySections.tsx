import React from "react";
import { 
  User, Briefcase, BookOpen, Zap, Award, 
  GraduationCap, Globe, Eye, MessageSquare, 
  CheckCircle2, ChevronRight, Loader2, ArrowUp
} from "lucide-react";
import { SurveyFormData } from "../../../hooks/useStakeholderSurvey";

export const SectionHeader = ({ icon: Icon, title, id }: { icon: any; title: string; id: string }) => (
  <div id={id} className="pt-16 mb-6 first:pt-0 scroll-mt-24">
    <div className="flex items-center gap-3 mb-4">
      <div className="size-10 bg-primary-gold/10 rounded-xl flex items-center justify-center border border-primary-gold/20">
        <Icon className="size-5 text-primary-gold" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white font-serif">
        {title}
      </h3>
    </div>
    <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-slate-700 dark:via-slate-800" />
  </div>
);

export const ProfileSection = ({ formData, handleInputChange }: { formData: SurveyFormData, handleInputChange: any }) => (
  <section>
    <SectionHeader icon={User} title="SECTION A: Stakeholder Profile" id="profile" />
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">
          Stakeholder Category *
        </label>
        <div className="relative">
          <select
            required
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-lg outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-semibold text-slate-800 dark:text-slate-200 appearance-none cursor-pointer"
          >
            <option value="">Select Category</option>
            {["Student", "Alumni", "Parent", "Industry Representative", "Academic Expert", "Research Expert", "Professional Body Representative"].map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 rotate-90 pointer-events-none" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Name (Optional)</label>
        <input
          placeholder="Enter your name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-lg outline-none focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/5 transition-all font-semibold text-slate-800 dark:text-slate-200"
        />
      </div>
      <div className="md:col-span-2 space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Years of association</label>
        <div className="flex flex-wrap gap-4">
          {["< 3 years", "3–5 years", "5–10 years", ">10 years"].map((opt) => (
            <label
              key={opt}
              className={`flex-1 min-w-[120px] p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold text-sm ${
                formData.association_years === opt
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="association_years"
                className="hidden"
                value={opt}
                onChange={(e) => handleInputChange("association_years", e.target.value)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const CareerSection = ({ formData, handleCheckboxChange }: { formData: SurveyFormData, handleCheckboxChange: any }) => (
  <section>
    <SectionHeader icon={Briefcase} title="SECTION B: Career Progression & Outcomes" id="career" />
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Professional roles graduates should perform (3-5 years):</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {["Design / Analysis Engineer", "Manufacturing / Production Engineer", "R&D / Research Engineer", "Maintenance / Quality Engineer", "Higher Studies", "Entrepreneur", "Managerial Roles"].map((role) => (
            <label
              key={role}
              className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                formData.career_roles.includes(role)
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.career_roles.includes(role)}
                onChange={() => handleCheckboxChange("career_roles", role)}
                className="size-4 rounded accent-primary-gold"
              />
              {role}
            </label>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const TechnicalSection = ({ formData, handleInputChange }: { formData: SurveyFormData, handleInputChange: any }) => (
  <section>
    <SectionHeader icon={BookOpen} title="SECTION C: Technical Competence" id="technical" />
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Importance of strong fundamentals:</p>
        <div className="flex gap-4">
          {["Very High", "High", "Moderate", "Low"].map((opt) => (
            <label
              key={opt}
              className={`flex-1 p-4 rounded-lg border text-center transition-all cursor-pointer font-semibold text-sm ${
                formData.fundamentals_importance === opt
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="fundamentals"
                className="hidden"
                value={opt}
                onChange={(e) => handleInputChange("fundamentals_importance", e.target.value)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const EmergingSection = ({ formData, handleInputChange, handleCheckboxChange }: { formData: SurveyFormData, handleInputChange: any, handleCheckboxChange: any }) => (
  <section>
    <SectionHeader icon={Zap} title="SECTION D: Emerging Technologies" id="future" />
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Emerging areas PEOs should emphasize:</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {["CAD / CAE / CFD / FEA", "Additive Manufacturing", "Robotics & Automation", "Digital Manufacturing", "AI / ML Applications", "Sustainable Technologies"].map((area) => (
            <label
              key={area}
              className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center gap-3 font-medium text-sm ${
                formData.emerging_areas.includes(area)
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.emerging_areas.includes(area)}
                onChange={() => handleCheckboxChange("emerging_areas", area)}
                className="size-4"
              />
              {area}
            </label>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const SkillsSection = ({ formData, handleRatingChange, handleInputChange }: { formData: SurveyFormData, handleRatingChange: any, handleInputChange: any }) => (
  <section>
    <SectionHeader icon={Award} title="SECTION E: Professional Skills & Ethics" id="skills" />
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-5 text-sm font-semibold text-slate-400 uppercase tracking-widest">Skill</th>
                {["Very Important", "Important", "Moderate"].map((h) => (
                  <th key={h} className="p-5 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {["Communication", "Teamwork", "Leadership", "Project Management"].map((skill) => (
                <tr key={skill} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 text-sm font-semibold text-slate-700 dark:text-slate-300">{skill}</td>
                  {["Very Important", "Important", "Moderate"].map((rating) => (
                    <td key={rating} className="p-5 text-center">
                      <input
                        type="radio"
                        name={`skill_${skill}`}
                        className="size-5 accent-primary-gold"
                        checked={formData.skills_rating[skill] === rating}
                        onChange={() => handleRatingChange("skills_rating", skill, rating)}
                      />
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
);

export const LifelongSection = ({ formData, handleInputChange, handleCheckboxChange }: { formData: SurveyFormData, handleInputChange: any, handleCheckboxChange: any }) => (
  <section>
    <SectionHeader icon={GraduationCap} title="SECTION F: Lifelong Learning" id="learning" />
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Continuous learning encouragement?</p>
        <div className="flex gap-4">
          {["Yes", "No", "Maybe"].map((opt) => (
            <label
              key={opt}
              className={`flex-1 p-4 rounded-lg border text-center transition-all cursor-pointer font-semibold text-sm ${
                formData.lifelong_learning === opt
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="lifelong"
                className="hidden"
                value={opt}
                onChange={(e) => handleInputChange("lifelong_learning", e.target.value)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const SocietalSection = ({ formData, handleInputChange, handleCheckboxChange }: { formData: SurveyFormData, handleInputChange: any, handleCheckboxChange: any }) => (
  <section>
    <SectionHeader icon={Globe} title="SECTION G: Global & Societal" id="societal" />
    <div className="space-y-6">
       <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prepare for global careers?</p>
        <div className="flex gap-4">
          {["Yes", "No", "Depends"].map((opt) => (
            <label
              key={opt}
              className={`flex-1 p-4 rounded-lg border text-center transition-all cursor-pointer font-semibold text-sm ${
                formData.global_career === opt
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="global"
                className="hidden"
                value={opt}
                onChange={(e) => handleInputChange("global_career", e.target.value)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const ValidationSection = ({ formData, handleInputChange, handleCheckboxChange }: { formData: SurveyFormData, handleInputChange: any, handleCheckboxChange: any }) => (
  <section>
    <SectionHeader icon={CheckCircle2} title="SECTION I: PEO Validation" id="validation" />
    <div className="space-y-8">
      {/* Validation logic here */}
      <div className="space-y-4">
        {["Strong technical competence", "Professional growth", "Lifelong learning", "Ethical practice"].map((item) => (
          <label
            key={item}
            className={`p-5 rounded-lg border transition-all cursor-pointer flex items-center gap-4 ${
              formData.peo_validation.includes(item)
                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 font-semibold"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            <input
              type="checkbox"
              className="size-4"
              checked={formData.peo_validation.includes(item)}
              onChange={() => handleCheckboxChange("peo_validation", item)}
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  </section>
);

export const SuggestionsSection = ({ formData, handleInputChange }: { formData: SurveyFormData, handleInputChange: any }) => (
  <section>
    <SectionHeader icon={MessageSquare} title="SECTION J: Suggestions" id="additional" />
    <textarea
      placeholder="Your suggestions here..."
      rows={4}
      value={formData.additional_comments}
      onChange={(e) => handleInputChange("additional_comments", e.target.value)}
      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-xl outline-none focus:border-primary-gold transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
    />
  </section>
);

export const SurveySidebar = ({ calculateProgress }: { calculateProgress: () => number }) => {
  const progress = calculateProgress();
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Survey Progress
            </h4>
            <span className="text-primary-gold font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
