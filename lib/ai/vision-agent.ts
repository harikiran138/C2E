/**
 * lib/ai/vision-agent.ts
 * Vision Agent — main orchestrator with max-3-attempt retry loop.
 *
 * Flow:
 *   for attempt 0..2:
 *     batch = generateVisionHybrid(params, attempt)
 *     scored = batch.map(scoreVision)
 *     qualified += scored.filter(score ≥ 90).deduplicate()
 *     if qualified.length >= count → break
 *   Guarantee: fill remaining with grammar templates (always ≥90)
 *   return rankVisions(qualified, count)
 */

import { generateVisionHybrid }                    from "./vision-hybrid-generator";
import { scoreVision, VisionScore, VISION_APPROVAL_THRESHOLD } from "./scoring";
import { deduplicateVisions }                      from "./similarity";
import { rankVisions, RankedVision }               from "./ranking-engine";
import { getAllGrammarVariants }                    from "./template-engine";
import { computeSemanticSimilarity }               from "@/lib/ai-validation";

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
    attempts = attempt + 1;

    const batch = await generateVisionHybrid({
      programName,
      priorities,
      count,
      institutionName,
      // Self-improvement: pass accepted statements as style references on retry (improvement 1C)
      existingVisions: [...existingVisions, ...qualifiedStatements],
      attempt,
      geminiApiKey,
    });

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

  // Guarantee: fill with grammar templates if still short
  let is_fallback = false;
  if (semanticDeduped.length < count) {
    is_fallback = true;
    const fallbacks = getAllGrammarVariants(programName, priorities);
    for (const fb of fallbacks) {
      if (semanticDeduped.length >= count) break;
      if (!semanticDeduped.some((d) => d.toLowerCase() === fb.toLowerCase())) {
        semanticDeduped.push(fb);
        semanticDedupedScores.push(scoreVision(fb));
      }
    }
  }

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
