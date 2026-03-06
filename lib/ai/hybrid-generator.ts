/**
 * lib/ai/hybrid-generator.ts
 * Orchestrates Template Engine + Gemini AI + Mutation Engine.
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
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export interface HybridParams {
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

  if (numbered.length > 0) return numbered;

  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Template candidates ───────────────────────────────────────────────────────

function getTemplateCandidates(
  programName: string,
  priorities:  string[],
  count:       number,
  attempt:     number,
): string[] {
  const all     = getAllGrammarVariants(programName, priorities);
  const offset  = (attempt * count) % all.length;
  const results: string[] = [];

  for (let i = 0; i < count && i < all.length; i++) {
    results.push(all[(offset + i) % all.length]);
  }
  return results;
}

// ── Mutation fill ─────────────────────────────────────────────────────────────

function getMutationCandidates(
  programName: string,
  priorities:  string[],
  count:       number,
  seed:        number,
): string[] {
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const base    = buildGrammarVision(programName, priorities, (seed + i) % 5, i % 3);
    const mutated = mutateVisionStarter(base, (seed + i + 1) % 2);
    results.push(mutated);
  }
  return results;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a batch of vision candidates using the hybrid strategy.
 * Returns all candidates (unfiltered — scoring/ranking done upstream).
 */
export async function generateVisionHybrid(params: HybridParams): Promise<string[]> {
  const {
    programName,
    priorities,
    count,
    institutionName,
    existingVisions = [],
    attempt = 0,
    geminiApiKey,
  } = params;

  const templateSlots = Math.max(1, Math.floor(count * 0.4));
  const aiSlots       = Math.ceil(count * 0.6);

  // 1. Template candidates (guaranteed quality)
  const templateCandidates = getTemplateCandidates(
    programName, priorities, templateSlots, attempt,
  );

  // 2. AI candidates
  let aiCandidates: string[] = [];
  if (geminiApiKey) {
    try {
      const promptParams: PromptParams = {
        programName,
        priorities,
        count:          aiSlots + 2, // request a few extra for headroom
        institutionName,
        existingVisions,
        attempt,
      };
      const prompt = buildVisionAgentPrompt(promptParams);
      aiCandidates = await callGemini(prompt, geminiApiKey);
    } catch (err) {
      console.warn("[HybridGenerator] Gemini call failed:", err);
    }
  }

  // 3. Fill gaps with mutation variants if AI is short
  const needed = count - templateCandidates.length - aiCandidates.length;
  const mutationCandidates = needed > 0
    ? getMutationCandidates(programName, priorities, needed, attempt * 10)
    : [];

  return [...templateCandidates, ...aiCandidates, ...mutationCandidates];
}
