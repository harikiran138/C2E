import { type GeneratedCourse, type GeneratedCurriculum } from "./engine";
import { getAiCache, setAiCache } from "./ai-cache";
import { callAI } from "./ai-model-router";



const PREREQUISITE_SYSTEM_PROMPT = `You are an academic prerequisite analyzer. Your task is to establish semantic relationships between courses in an engineering curriculum.

## Objective
For each target course, identify 0-4 prerequisite courses from the provided list of "Available Previous Courses".

## Semantic Rules
1. **Direct Dependency**: If Course B requires fundamental knowledge from Course A (e.g., "Data Structures" -> "Algorithms").
2. **Mathematical Foundation**: Core engineering courses often require specific math (e.g., "Signal Processing" -> "Calculus").
3. **Complexity Progression**: Advanced specialization courses should link to their core discipline (e.g., "Deep Learning" -> "Machine Learning").
4. **No Circularity**: Prerequisites must only come from EARLIER semesters.
5. **Relevance**: Only suggest prerequisites if there is a clear, essential knowledge link.

## Output Format
Return a JSON object with this structure:
{
  "prerequisites": [
    {
      "courseCode": "CS101",
      "suggestedPrerequisites": ["MA101", "CS100"]
    }
  ]
}`;

/**
 * Suggests prerequisites for all courses in a curriculum using AI semantic analysis.
 * Processes in a single batched call for maximum efficiency.
 */
export async function suggestPrerequisites(
  curriculum: GeneratedCurriculum
): Promise<{ curriculum: GeneratedCurriculum; warnings: string[] }> {
  const warnings: string[] = [];

  // 1. Prepare data for prompt
  const coursesToProcess = curriculum.semesters.flatMap((s) => 
    s.courses.map(c => ({
      courseCode: c.courseCode,
      courseTitle: c.courseTitle,
      semester: s.semester,
      category: c.category,
      availablePreviousCourses: curriculum.semesters
        .filter(prevS => prevS.semester < s.semester)
        .flatMap(prevS => prevS.courses.map(prevC => ({
          courseCode: prevC.courseCode,
          courseTitle: prevC.courseTitle
        })))
    }))
  ).filter(c => c.semester > 1);

  if (coursesToProcess.length === 0) {
    return { curriculum, warnings };
  }

  const cacheKey = `prereq_${curriculum.programName}_${JSON.stringify(coursesToProcess)}`;
  const cached = await getAiCache(cacheKey);
  let rawText = "";

  if (cached) {
    rawText = cached;
  } else {
    try {
      const prompt = `${PREREQUISITE_SYSTEM_PROMPT}\n\nInput Data:\n${JSON.stringify(coursesToProcess)}`;
      rawText = await callAI(prompt, "bulk");
      await setAiCache(cacheKey, rawText);
    } catch (error) {
      console.error("[Prerequisites] AI Call failed:", error);
      warnings.push("Semantic prerequisite analysis failed. Using default mappings.");
      return { curriculum, warnings };
    }
  }

  // 3. Apply results
  try {
    const parsed = JSON.parse(rawText);
    const prereqMap = new Map<string, string[]>();
    
    if (Array.isArray(parsed.prerequisites)) {
      parsed.prerequisites.forEach((item: any) => {
        if (item.courseCode && Array.isArray(item.suggestedPrerequisites)) {
          prereqMap.set(item.courseCode, item.suggestedPrerequisites);
        }
      });
    }

    curriculum.semesters.forEach(s => {
      s.courses.forEach(c => {
        const suggested = prereqMap.get(c.courseCode);
        if (suggested) {
          // Filter to ensure prerequisites actually exist in previous semesters
          const validPrereqs = suggested.filter(pTitle => 
            curriculum.semesters
              .filter(ps => ps.semester < s.semester)
              .some(ps => ps.courses.some(pc => pc.courseTitle === pTitle || pc.courseCode === pTitle))
          );
          c.prerequisites = validPrereqs.slice(0, 4);
        }
      });
    });
  } catch (err) {
    warnings.push("Failed to parse AI prerequisite response.");
  }

  return { curriculum, warnings };
}
