import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";

export interface SurveyFormData {
  category: string;
  name: string;
  organization: string;
  designation: string;
  association_years: string;
  career_roles: string[];
  success_definition: string[];
  fundamentals_importance: string;
  core_domains: string[];
  problem_solving_level: string;
  emerging_areas: string[];
  multidisciplinary_importance: string;
  skills_rating: Record<string, string>;
  ethics_importance: string;
  lifelong_learning: string;
  pathways: string[];
  research_importance: string;
  global_career: string;
  societal_role: string[];
  differentiation: string;
  peo_validation: string[];
  expectations_reflected: string;
  future_competencies: string;
  additional_comments: string;
  aspect_emphasis: Record<string, string>;
}

const INITIAL_FORM_DATA: SurveyFormData = {
  category: "",
  name: "",
  organization: "",
  designation: "",
  association_years: "",
  career_roles: [],
  success_definition: [],
  fundamentals_importance: "",
  core_domains: [],
  problem_solving_level: "",
  emerging_areas: [],
  multidisciplinary_importance: "",
  skills_rating: {},
  ethics_importance: "",
  lifelong_learning: "",
  pathways: [],
  research_importance: "",
  global_career: "",
  societal_role: [],
  differentiation: "",
  peo_validation: [],
  expectations_reflected: "",
  future_competencies: "",
  additional_comments: "",
  aspect_emphasis: {},
};

export function useStakeholderSurvey(initialProgramName?: string, onBack?: () => void) {
  const [formData, setFormData] = useState<SurveyFormData>(INITIAL_FORM_DATA);
  const [programName, setProgramName] = useState(initialProgramName || "Program");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialProgramName) {
      setProgramName(initialProgramName);
    }
  }, [initialProgramName]);

  const handleInputChange = (field: keyof SurveyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: keyof SurveyFormData, value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((item) => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleRatingChange = (
    field: "skills_rating" | "aspect_emphasis",
    key: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/stakeholder/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit survey");

      setSubmitted(true);
    } catch (error: any) {
      alert("Error submitting survey: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    // 10 key sections for progress calculation
    const sections = [
      formData.category,
      formData.career_roles.length > 0,
      formData.fundamentals_importance,
      formData.emerging_areas.length > 0,
      Object.keys(formData.skills_rating).length > 0,
      formData.lifelong_learning,
      formData.global_career,
      formData.differentiation,
      formData.peo_validation.length > 0,
      formData.additional_comments,
    ];
    
    const filled = sections.filter(Boolean).length;
    return (filled / sections.length) * 100;
  };

  return {
    formData,
    programName,
    submitted,
    loading,
    setSubmitted,
    handleInputChange,
    handleCheckboxChange,
    handleRatingChange,
    handleSubmit,
    calculateProgress,
  };
}
