/**
 * lib/ai/vision-agent.ts
 * Vision Agent — 100% AI-driven generation using Gemini 2.0 Flash.
 *
 * This agent performs a multi-attempt retry loop to generate NBA/ABET-aligned
 * Vision statements with deep domain reasoning and semantic diversity.
 */

import { z } from "zod";
import { scoreVision, VisionScore, VISION_APPROVAL_THRESHOLD } from "./scoring";
import { deduplicateVisions }                      from "./similarity";
import { rankVisions, RankedVision }               from "./ranking-engine";
import { buildVisionAgentPrompt, PromptParams }       from "./prompt-builder";
import { computeSemanticSimilarity }               from "@/lib/ai-validation";
import { callAI }                                from "@/lib/curriculum/ai-model-router";


/** Remove near-paraphrase duplicates using Google embedding cosine similarity. */
async function semanticDedup(candidates: string[], threshold = 0.82): Promise<string[]> {
  const kept: string[] = [];
  for (const c of candidates) {
    let tooClose = false;
    for (const k of kept) {
      if (await computeSemanticSimilarity(c, k) >= threshold) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) kept.push(c);
  }
  return kept;
}

/**
 * Normalizes varied AI response formats into a clean string array.
 */
const VisionResponseSchema = z.object({
  visions: z.array(z.string()).optional(),
  Visions: z.array(z.string()).optional(),
  statements: z.array(z.string()).optional(),
}).passthrough();

function normalizeAIResponse(parsed: any): string[] {
  const data = VisionResponseSchema.safeParse(parsed);
  if (!data.success) {
    console.warn("[Vision Agent] Zod validation failed:", data.error);
  }

  const list = parsed?.visions || 
               parsed?.Visions || 
               parsed?.statements || 
               (Array.isArray(parsed) ? parsed : []);

  return list.map((item: any) => {
    if (typeof item === "string") return item;
    if (item?.statement) return item.statement;
    return String(item);
  }).filter((s: string) => typeof s === "string" && s.length > 20);
}

// ── AI call ───────────────────────────────────────────────────────────────

async function fetchVisionAI(
  prompt: string
): Promise<string[]> {
  try {
    const text = await callAI(prompt, "vision");

    try {
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return normalizeAIResponse(parsed);
    } catch {
      // Robust fallback to line-splitting if JSON fails
      return text
        .split("\n")
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l: string) => l.length > 20);
    }
  } catch (error) {
    console.error("[Vision Agent] AI fetch failed:", error);
    return [];
  }
}

export interface AgentParams {
  programName:        string;
  priorities:         string[];
  count:              number;
  institutionName?:   string;
  existingVisions?:   string[];
  geminiApiKey?:      string;
}

export interface AgentResult {
  visions:     string[];
  scores:      Record<string, VisionScore>;
  ranked:      RankedVision[];
  is_fallback: boolean;
  attempts:    number;
}

const MAX_ATTEMPTS = 3;

export async function visionAgent(params: AgentParams): Promise<AgentResult> {
  const {
    programName,
    priorities,
    count,
    institutionName,
    existingVisions = [],
    geminiApiKey,
  } = params;

  const qualifiedStatements: string[] = [];
  const qualifiedScores:     VisionScore[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // collect candidates: 100% AI
    let batch: string[] = [];
    try {
      const promptParams: PromptParams = {
        programName,
        priorities,
        count:           count + 4, // request extra for headroom
        institutionName,
        existingVisions: [...existingVisions, ...qualifiedStatements],
        attempt,
      };
      const promptStr = buildVisionAgentPrompt(promptParams);
      batch = await fetchVisionAI(promptStr);
    } catch (err) {
      console.warn("[VisionAgent] AI call failed on attempt", attempt, err);
    }

    for (const candidate of batch) {
      if (!candidate || candidate.length < 20) continue;

      const scored = scoreVision(candidate);
      if (
        scored.score >= VISION_APPROVAL_THRESHOLD &&
        scored.hardFailures.length === 0
      ) {
        // Deduplicate before adding
        const isDuplicate = qualifiedStatements.some(
          (q) => q.toLowerCase() === candidate.toLowerCase(),
        );
        if (!isDuplicate) {
          qualifiedStatements.push(candidate);
          qualifiedScores.push(scored);
        }
      }
    }

    if (qualifiedStatements.length >= count) break;
  }

  // Lexical dedup (Jaccard bigram, threshold 0.75)
  const deduped = deduplicateVisions(qualifiedStatements);
  const dedupedScores = deduped.map((s) => {
    const idx = qualifiedStatements.indexOf(s);
    return qualifiedScores[idx];
  });

  // Semantic dedup: remove near-paraphrase duplicates using Google text-embedding-004 (threshold 0.82)
  const semanticDeduped = await semanticDedup(deduped, 0.82);
  const semanticDedupedScores = semanticDeduped.map((s) => dedupedScores[deduped.indexOf(s)]);

  // Final outcome: strictly AI-driven
  const is_fallback = semanticDeduped.length === 0;

  const ranked = rankVisions(semanticDeduped, semanticDedupedScores, count);
  const finalVisions = ranked.map((r) => r.statement);

  // Build scores map (keyed by statement for easy frontend lookup)
  const scoresMap: Record<string, VisionScore> = {};
  for (let i = 0; i < semanticDeduped.length; i++) {
    scoresMap[semanticDeduped[i]] = semanticDedupedScores[i];
  }

  return {
    visions:     finalVisions,
    scores:      scoresMap,
    ranked,
    is_fallback,
    attempts,
  };
}
