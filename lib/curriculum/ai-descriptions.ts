import { type GeneratedCurriculum } from "./engine";
import { getAiCache, setAiCache } from "./ai-cache";
import { callAI } from "./ai-model-router";



const DESCRIPTION_SYSTEM_PROMPT = `You are an academic course description generator. Your task is to write professional, 2-3 sentence technical descriptions for engineering courses.

## Guidelines
1. **Clarity**: State the primary goal of the course and the key technologies/methodologies covered.
2. **Technical Depth**: Use appropriate terminology for the discipline (e.g., "deterministic finite automata" for Theory of Computation).
3. **Application Oriented**: Briefly mention the practical application or engineering problem the course addresses.
4. **No Fluff**: Avoid generic phrases like "This course covers...". Start directly.
5. **Length**: Exactly 2-3 sentences.

## Output Format
Return a JSON object:
{
  "descriptions": [
    {
      "courseCode": "CS101",
      "description": "..."
    }
  ]
}`;

const BATCH_SIZE = 10;

/**
 * Generates course descriptions for all courses in a curriculum.
 * Processes in batches of 10 for optimal token usage and latency.
 */
export async function generateCourseDescriptions(
  curriculum: GeneratedCurriculum
): Promise<{ curriculum: GeneratedCurriculum; warnings: string[] }> {
  const warnings: string[] = [];
  const allCourses = curriculum.semesters.flatMap(s => s.courses);

  if (allCourses.length === 0) return { curriculum, warnings };

  // Split into batches
  const batches = [];
  for (let i = 0; i < allCourses.length; i += BATCH_SIZE) {
    batches.push(allCourses.slice(i, i + BATCH_SIZE));
  }

  console.log(`[Descriptions] Processing ${batches.length} batches of courses...`);

  console.log(`[Descriptions] Processing ${batches.length} batches of courses in parallel...`);

  const results = await Promise.all(
    batches.map(async (batch, index) => {
      const batchInput = batch.map(c => ({
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        category: c.category
      }));

      const cacheKey = `desc_${curriculum.programName}_${JSON.stringify(batchInput)}`;
      const cached = await getAiCache(cacheKey);
      let rawText = "";

      if (cached) {
        rawText = cached;
      } else {
        try {
          const prompt = `${DESCRIPTION_SYSTEM_PROMPT}\n\nCourses:\n${JSON.stringify(batchInput)}`;
          rawText = await callAI(prompt, "bulk");
          await setAiCache(cacheKey, rawText);
        } catch (error) {
          console.error(`[Descriptions] Batch ${index} failed:`, error);
          return { success: false, warning: `Description generation failed for a batch starting with ${batch[0].courseCode}` };
        }
      }

      // Apply descriptions
      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed.descriptions)) {
          parsed.descriptions.forEach((item: any) => {
            const course = allCourses.find(c => c.courseCode === item.courseCode);
            if (course) {
              course.description = item.description;
            }
          });
        }
        return { success: true };
      } catch (err) {
        return { success: false, warning: "Failed to parse AI description response." };
      }
    })
  );

  results.forEach(res => {
    if (!res.success && res.warning) warnings.push(res.warning);
  });

  return { curriculum, warnings };
}
