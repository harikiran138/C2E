import { type GeneratedCurriculum, type CategoryCode } from "./engine";
import { getAiCache, setAiCache } from "./ai-cache";
import { callAiWithFallback, callLocalAi } from "./ai-model-router";
import { getDomainKnowledgeProfile } from "./domain-knowledge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const ELECTIVE_SYSTEM_PROMPT = `You are an academic elective consultant for engineering programs. Your task is to suggest specialized Professional Electives (PE) and Open Electives (OE).

## Professional Electives (PE)
- Focus: Deep specialization within the core domain (e.g., CSE -> "Cloud Security", "Real-time Systems").
- Semesters: Usually 5, 6, 7.
- Rule: Must align with the Knowledge Graph.

## Open Electives (OE)
- Focus: Inter-domain or cross-disciplinary knowledge (e.g., CSE -> "Digital Marketing", "Financial Analytics", "Psychology for Engineers").
- Semesters: Usually 6, 7.
- Rule: Should NOT be from the same core domain.

## Output Format
Return a JSON object:
{
  "electives": [
    {
      "courseCode": "PE01",
      "suggestedTitles": ["Advanced ML", "Distributed DB"],
      "type": "PE"
    }
  ]
}`;

export async function suggestElectives(
  curriculum: GeneratedCurriculum
): Promise<{ curriculum: GeneratedCurriculum; warnings: string[] }> {
  const warnings: string[] = [];
  const profile = getDomainKnowledgeProfile(curriculum.programName);

  // 1. Identify elective slots
  const electiveSlots = curriculum.semesters.flatMap(s => 
    s.courses
      .filter(c => c.category === "PE" || c.category === "OE")
      .map(c => ({
        courseCode: c.courseCode,
        category: c.category,
        semester: s.semester,
        domain: profile.domain
      }))
  );

  if (electiveSlots.length === 0) {
    return { curriculum, warnings };
  }

  const cacheKey = `electives_${curriculum.programName}_${JSON.stringify(electiveSlots)}`;
  const cached = await getAiCache(cacheKey);
  let rawText = "";

  if (cached) {
    rawText = cached;
  } else {
    if (!GEMINI_API_KEY) {
      warnings.push("GEMINI_API_KEY missing for elective recommendations.");
      return { curriculum, warnings };
    }

    try {
      rawText = await callAiWithFallback(JSON.stringify({ slots: electiveSlots, domainProfile: profile }), async (modelId, provider, prompt) => {
        if (provider === "gemini") {
          const url = `${GEMINI_BASE_URL}/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${ELECTIVE_SYSTEM_PROMPT}\n\nInput:\n${prompt}` }] }],
              generationConfig: {
                temperature: 0.5,
                responseMimeType: "application/json",
              },
            }),
          });

          if (!response.ok) throw new Error(`AI Error: ${response.status}`);
          const data = await response.json();
          return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          return await callLocalAi(prompt, ELECTIVE_SYSTEM_PROMPT);
        }
      });
      await setAiCache(cacheKey, rawText);
    } catch (error) {
      console.error("[Electives] AI Call failed:", error);
      warnings.push("Elective recommendation failed. Using default placeholders.");
      return { curriculum, warnings };
    }
  }

  // 3. Apply results (pick the first suggestion)
  try {
    const parsed = JSON.parse(rawText);
    const electiveMap = new Map<string, string>();
    
    if (Array.isArray(parsed.electives)) {
      parsed.electives.forEach((item: any) => {
        if (item.courseCode && Array.isArray(item.suggestedTitles) && item.suggestedTitles.length > 0) {
          electiveMap.set(item.courseCode, item.suggestedTitles[0]);
        }
      });
    }

    curriculum.semesters.forEach(s => {
      s.courses.forEach(c => {
        const suggestion = electiveMap.get(c.courseCode);
        if (suggestion) {
          c.courseTitle = suggestion;
        }
      });
    });
  } catch (err) {
    warnings.push("Failed to parse elective recommendations.");
  }

  return { curriculum, warnings };
}
