import { type GeneratedCurriculum } from "./engine";
import { getAiCache, setAiCache } from "./ai-cache";
import { callAI } from "./ai-model-router";



const ACCREDITATION_SYSTEM_PROMPT = `You are an expert NBA (National Board of Accreditation) Tier-I Auditor. Your task is to perform an "Accreditation Gap Analysis" on the provided engineering curriculum.

## Audit Criteria:
1. **Bloom's Taxonomy Balance**: Do earlier semesters focus on Remember/Understand, while later semesters (5-8) shift to Apply/Analyze/Evaluate?
2. **Outcome-Based Education (OBE)**: Is the progression logical for achieving Program Outcomes (POs)?
3. **Industry Readiness**: Are emerging technologies and practical labs adequately represented?
4. **NEP-2020 Compliance**: Is there a good mix of HSS, Basic Sciences, and Engineering Sciences?

## Output Format
Return a JSON object:
{
  "accreditationScore": 0-100,
  "summary": "...",
  "strengths": ["...", "..."],
  "gaps": [
    {
      "semester": 4,
      "finding": "...",
      "recommendation": "..."
    }
  ],
  "bloomsBalance": {
    "lowerOrder": "percentage",
    "higherOrder": "percentage"
  }
}`;

/**
 * Performs a narrative accreditation gap analysis on the curriculum.
 */
export async function performAccreditationAudit(
  curriculum: GeneratedCurriculum
): Promise<{ audit: any; warnings: string[] }> {
  const warnings: string[] = [];
  
  // Prepare a condensed version of the curriculum for the auditor
  const curriculumSummary = {
    programName: curriculum.programName,
    semesterCount: curriculum.semesterCount,
    totalCredits: curriculum.totalCredits,
    structure: curriculum.semesters.map(s => ({
      semester: s.semester,
      courses: s.courses.map(c => ({
        code: c.courseCode,
        title: c.courseTitle,
        category: c.category,
        credits: c.credits
      }))
    }))
  };

  const cacheKey = `audit_${curriculum.programName}_${JSON.stringify(curriculumSummary)}`;
  const cached = await getAiCache(cacheKey);
  let rawText = "";

  if (cached) {
    rawText = cached;
  } else {
    try {
      const prompt = `${ACCREDITATION_SYSTEM_PROMPT}\n\nCurriculum Data:\n${JSON.stringify(curriculumSummary)}`;
      rawText = await callAI(prompt, "bulk");
      await setAiCache(cacheKey, rawText);
    } catch (error) {
      console.error("[Accreditation] Audit failed:", error);
      warnings.push("Accreditation gap analysis failed.");
      return { audit: null, warnings };
    }
  }

  try {
    const audit = JSON.parse(rawText);
    return { audit, warnings };
  } catch (err) {
    warnings.push("Failed to parse accreditation audit response.");
    return { audit: null, warnings };
  }
}
