/**
 * lib/ai/vision-agent.ts
 * Vision Agent — 100% AI-driven generation using Gemini 2.0 Flash.
 *
 * This agent performs a multi-attempt retry loop to generate NBA/ABET-aligned
 * Vision statements with deep domain reasoning and semantic diversity.
 */

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

// ── AI call ───────────────────────────────────────────────────────────────

async function fetchVisionAI(
  prompt: string
): Promise<string[]> {
  const text = await callAI(prompt, "vision");

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
