/**
 * lib/ai/vision-hybrid-generator.ts
 * Orchestrates Template Engine + Gemini AI + Mutation Engine for Vision Statement generation.
 *
 * Generation split:
 *   floor(count × 0.4) → grammar templates (guaranteed quality)
 *   ceil(count × 0.6)  → Gemini AI with structured prompt
 *   if AI short       → fill remaining with mutation variants
 */

import { getAllGrammarVariants, buildGrammarVision } from "./template-engine";
import { mutateVisionStarter }                        from "./mutation-engine";
import { buildVisionAgentPrompt, PromptParams }       from "./prompt-builder";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface VisionHybridParams {
  programName:        string;
  priorities:         string[];
  count:              number;
  institutionName?:   string;
  existingVisions?:   string[];
  attempt?:           number;
  geminiApiKey?:      string;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  apiKey: string,
): Promise<string[]> {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Try to parse numbered list first (our prompt format), then fall back to JSON
  const numbered = text
    .split(/\n/)
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter((l) => l.length > 20);

  if (numbered.length > 0 && !text.includes("{") && !text.includes("[")) return numbered;

  try {
    const cleaned = text.replace(/```(?:json)?|```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    let arr: any[] = [];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed);
      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          arr = parsed[key];
          break;
        }
      }
    }
    return arr.map(String).filter(s => s.length > 20);
  } catch {
    return numbered;
  }
}


// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a batch of vision candidates using the hybrid strategy.
 * Returns all candidates (unfiltered — scoring/ranking done upstream in visionAgent).
 */
export async function generateVisionHybrid(params: VisionHybridParams): Promise<string[]> {
  const {
    programName,
    priorities,
    count,
    institutionName,
    existingVisions = [],
    attempt = 0,
    geminiApiKey,
  } = params;

  // 1. AI candidates only
  let aiCandidates: string[] = [];
  if (geminiApiKey) {
    try {
      const promptParams: PromptParams = {
        programName,
        priorities,
        count:          count + 4, // request extra for headroom
        institutionName,
        existingVisions,
        attempt,
      };
      const prompt = buildVisionAgentPrompt(promptParams);
      aiCandidates = await callGemini(prompt, geminiApiKey);
    } catch (err) {
      console.warn("[VisionHybridGenerator] Gemini call failed:", err);
    }
  }

  // No more template or mutation fallbacks
  return aiCandidates;
}
