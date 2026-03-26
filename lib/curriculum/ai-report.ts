import { type GeneratedCurriculum } from "./engine";

export interface AccreditationReport {
  programName: string;
  totalCredits: number;
  complianceScore: number;
  gapAnalysis: {
    missingCoreAreas: string[];
    redundancies: string[];
    bloomAlignment: string; // e.g. "High", "Medium", "Low"
  };
  recommendations: string[];
  timestamp: string;
}

export function generateAccreditationReport(
  curriculum: GeneratedCurriculum,
  audit: any
): AccreditationReport {
  // 1. Calculate basic metrics
  const totalCredits = curriculum.semesters.reduce(
    (acc, s) => acc + s.courses.reduce((cAcc, c) => cAcc + c.credits, 0),
    0
  );

  // 2. Map AI Audit to structured report
  const missingCoreAreas = audit?.gaps?.contentDepth || [];
  const redundancies = audit?.gaps?.redundancy || [];
  
  // 3. Simple heuristic for Bloom alignment based on COs
  let bloomMatches = 0;
  let totalCourses = 0;
  curriculum.semesters.forEach(s => {
    s.courses.forEach(c => {
      totalCourses++;
      const cos = (c as any).courseObjectives || [];
      const bloomKeywords = ["analyze", "evaluate", "design", "create", "synthesize", "apply"];
      if (cos.some((co: string) => bloomKeywords.some(k => co.toLowerCase().includes(k)))) {
        bloomMatches++;
      }
    });
  });

  const bloomAlignment = totalCourses > 0 
    ? (bloomMatches / totalCourses > 0.7 ? "High" : bloomMatches / totalCourses > 0.4 ? "Medium" : "Low")
    : "Uncertain";

  // 4. Final Compliance Score (Base 100)
  let score = 100;
  score -= missingCoreAreas.length * 5;
  score -= redundancies.length * 2;
  if (bloomAlignment === "Medium") score -= 10;
  if (bloomAlignment === "Low") score -= 20;
  score = Math.max(0, score);

  return {
    programName: curriculum.programName,
    totalCredits,
    complianceScore: score,
    gapAnalysis: {
      missingCoreAreas,
      redundancies,
      bloomAlignment
    },
    recommendations: [
      ...(missingCoreAreas.length > 0 ? [`Address content gaps in: ${missingCoreAreas.join(", ")}`] : []),
      ...(redundancies.length > 0 ? [`Consolidate overlapping courses: ${redundancies.join(", ")}`] : []),
      ...(bloomAlignment !== "High" ? ["Revise Course Objectives to include higher-order Bloom's levels."] : []),
      "Ensure all Professional Electives are regularly updated with industry trends."
    ],
    timestamp: new Date().toISOString()
  };
}
