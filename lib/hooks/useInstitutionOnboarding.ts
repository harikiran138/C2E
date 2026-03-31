"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Country, State, City } from "country-state-city";

// --- TYPES ---
export type OnboardingStep = 1 | 2 | 3 | 4;

export interface InstitutionDetails {
  institution_name: string;
  institution_type: "Private" | "Government" | "Deemed" | "Trust";
  institution_status: string;
  established_year: number;
  university_affiliation?: string;
  city: string;
  state: string;
  vision?: string;
  mission?: string;
}

export interface Program {
  id?: string;
  program_name: string;
  degree: string;
  level: string;
  duration: number;
  intake: number;
  academic_year: string;
  program_code: string;
}

export interface NewProgramState {
  program_name: string;
  degree: string;
  level: string;
  duration: number | string;
  intake: number | string;
  academic_year: string;
  program_code: string;
}

export function useInstitutionOnboarding() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // STEP STATE
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // DATA STATES
  const [instDetails, setInstDetails] = useState<InstitutionDetails>({
    institution_name: "",
    institution_type: "Private",
    institution_status: "Non-Autonomous",
    established_year: new Date().getFullYear(),
    university_affiliation: "",
    city: "",
    state: "",
    vision: "",
    mission: "",
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [newProgram, setNewProgram] = useState<NewProgramState>({
    program_name: "",
    degree: "",
    level: "",
    duration: "",
    intake: "",
    academic_year: "",
    program_code: "",
  });

  // Location State Management
  const [selectedCountry, setSelectedCountry] = useState("IN"); // Default to India for C2E
  const [selectedState, setSelectedState] = useState("");

  const countries = Country.getAllCountries();
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  const cities = selectedCountry && selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];

  const currentYear = new Date().getFullYear();

  // VALIDATION
  const isStep1Valid =
    !!instDetails.city?.trim() &&
    !!instDetails.state?.trim() &&
    Number.isInteger(instDetails.established_year) &&
    instDetails.established_year >= 1800 &&
    instDetails.established_year <= currentYear + 1;

  const isProgramValid =
    !!newProgram.program_name?.trim() &&
    !!newProgram.program_code?.trim() &&
    !!newProgram.degree &&
    !!newProgram.level &&
    !!newProgram.academic_year &&
    typeof newProgram.duration === "number" &&
    newProgram.duration >= 1 &&
    newProgram.duration <= 6 &&
    typeof newProgram.intake === "number" &&
    newProgram.intake > 0;

  // --- EFFECTS ---
  
  // Scroll to top on step change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      try {
        const detailsRes = await fetch("/api/institution/details");
        if (detailsRes.status === 401) {
          router.push("/institution/login");
          return;
        }
        if (!detailsRes.ok) return;

        const { institution, programs: dbPrograms } = await detailsRes.json();
        if (institution) {
          setUserId(institution.id);
          setInstDetails({
            institution_name: institution.institution_name || "",
            institution_type: institution.institution_type || "Private",
            institution_status: institution.institution_status || "Non-Autonomous",
            established_year: institution.established_year || currentYear,
            university_affiliation: institution.university_affiliation || "",
            city: institution.city || "",
            state: institution.state || "",
            vision: institution.vision || "",
            mission: institution.mission || "",
          });
          
          // Try to derive state/country if possible
          if (institution.state) {
              const matchingState = states.find(s => s.name === institution.state);
              if (matchingState) setSelectedState(matchingState.isoCode);
          }
        }
        if (dbPrograms) setPrograms(dbPrograms);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    init();
  }, [router, states, currentYear]);

  // --- HANDLERS ---

  const persistInstitutionDetails = async () => {
    if (!instDetails.city.trim() || !instDetails.state.trim()) {
      setErrorMsg("City and State are required.");
      return false;
    }

    if (instDetails.established_year < 1800 || instDetails.established_year > currentYear + 1) {
      setErrorMsg(`Established year must be between 1800 and ${currentYear + 1}.`);
      return false;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/institution/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instDetails),
      });

      if (!response.ok) {
        const payload = await response.json();
        setErrorMsg(payload.error || "Failed to save institution details.");
        return false;
      }
      return true;
    } catch (err) {
      setErrorMsg("Network error saving details.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => persistInstitutionDetails();

  const handleAddProgram = async () => {
    if (!newProgram.program_name || !newProgram.degree || !newProgram.level || newProgram.duration === "" || !newProgram.program_code) {
      setErrorMsg("Please fill all required fields.");
      return;
    }

    if (programs.some(p => p.program_code === newProgram.program_code.toUpperCase())) {
      setErrorMsg(`Program code "${newProgram.program_code}" already exists.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/institution/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProgram,
          duration: Number(newProgram.duration),
          intake: Number(newProgram.intake),
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to add program");

      setPrograms([...programs, payload.program || payload]);
      setNewProgram({
        program_name: "",
        degree: "",
        level: "",
        duration: "",
        intake: "",
        academic_year: "",
        program_code: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding program");
    } finally {
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

  const handleNext = async () => {
    if (currentStep === 1) {
        const saved = await persistInstitutionDetails();
        if (saved) setCurrentStep(2);
    } else if (currentStep === 2) {
        if (programs.length === 0) {
            setErrorMsg("Add at least one program.");
            return;
        }
        setCurrentStep(3);
    } else if (currentStep === 3) {
        const saved = await persistInstitutionDetails();
        if (saved) setCurrentStep(4);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (programs.length === 0) {
      setErrorMsg("Please add at least one program.");
      return;
    }

    const detailsSaved = await persistInstitutionDetails();
    if (!detailsSaved) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/institution/onboarding/complete", { method: "POST" });
      if (response.ok) {
        router.replace("/institution/dashboard");
        return;
      }
      const payload = await response.json();
      setErrorMsg(payload.error || "Failed to complete onboarding.");
    } catch (err) {
      setErrorMsg("Network error completing onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    currentStep,
    setCurrentStep,
    loading,
    userId,
    errorMsg,
    setErrorMsg,
    instDetails,
    setInstDetails,
    programs,
    setPrograms,
    newProgram,
    setNewProgram,
    selectedCountry,
    setSelectedCountry,
    selectedState,
    setSelectedState,
    countries,
    states,
    cities,
    scrollRef,

    // Validation
    isStep1Valid,
    isProgramValid,

    // Handlers
    handleSaveDetails,
    handleAddProgram,
    handleBack,
    handleNext,
    handleCompleteOnboarding,
  };
}
