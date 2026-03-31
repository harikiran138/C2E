import { type GeneratedCurriculum } from "./engine";
import { getAiCache, setAiCache } from "./ai-cache";
import { callAI } from "./ai-model-router";



const CO_SYSTEM_PROMPT = `You are an academic curriculum designer. Your task is to generate 5-6 Course Objectives (COs) for each course in an engineering curriculum.

## CO Guidelines
- Use Bloom's Taxonomy (e.g., "Analyze", "Evaluate", "Design").
- Be specific to the course title and description.
- Align with Outcome-Based Education (OBE) principles.

## Output Format
Return a JSON object:
{
  "courses": [
    {
      "courseCode": "CS101",
      "courseObjectives": [
        "CO1: Understanding the fundamental principles of...",
        "CO2: Designing efficient algorithms for..."
      ]
    }
  ]
}`;

export async function generateCourseObjectives(
  curriculum: GeneratedCurriculum
): Promise<{ curriculum: GeneratedCurriculum; warnings: string[] }> {
  const warnings: string[] = [];

  // 1. Prepare data (Batching slightly larger because COs are short)
  const coursesToProcess = curriculum.semesters.flatMap(s => 
    s.courses.map(c => ({
      courseCode: c.courseCode,
      courseTitle: c.courseTitle,
      description: c.description
    }))
  );

  if (coursesToProcess.length === 0) {
    return { curriculum, warnings };
  }

  // Process in batches of 15
  const BATCH_SIZE = 15;
  console.log(`[CO Generation] Processing ${coursesToProcess.length} courses in ${Math.ceil(coursesToProcess.length / BATCH_SIZE)} batches in parallel...`);

  await Promise.all(
    Array.from({ length: Math.ceil(coursesToProcess.length / BATCH_SIZE) }).map(async (_, i) => {
      const startIndex = i * BATCH_SIZE;
      const batch = coursesToProcess.slice(startIndex, startIndex + BATCH_SIZE);
      const cacheKey = `co_${curriculum.programName}_${JSON.stringify(batch)}`;
      const cached = await getAiCache(cacheKey);
      let rawText = "";

      if (cached) {
        rawText = cached;
      } else {
        try {
          const prompt = `${CO_SYSTEM_PROMPT}\n\nCourses:\n${JSON.stringify(batch)}`;
          rawText = await callAI(prompt, "co");
          await setAiCache(cacheKey, rawText);
        } catch (error) {
          console.error(`[CO Generation] AI Call failed for batch ${i}:`, error);
          return;
        }
      }

      // Apply results
      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed.courses)) {
          parsed.courses.forEach((item: any) => {
            const course = curriculum.semesters
              .flatMap(s => s.courses)
              .find(c => c.courseCode === item.courseCode);
            if (course && Array.isArray(item.courseObjectives)) {
               (course as any).courseObjectives = item.courseObjectives;
            }
          });
        }
      } catch (err) {
        console.error(`[CO Generation] Failed to parse CO batch starting at index ${startIndex}.`);
      }
    })
  );

  return { curriculum, warnings };
}
