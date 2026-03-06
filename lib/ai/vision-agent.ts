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

import { generateVisionHybrid }                    from "./hybrid-generator";
import { scoreVision, VisionScore, VISION_APPROVAL_THRESHOLD } from "./scoring";
import { deduplicateVisions }                      from "./similarity";
import { rankVisions, RankedVision }               from "./ranking-engine";
import { getAllGrammarVariants }                    from "./template-engine";

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

  // Lexical dedup in case some near-duplicates slipped through
  const deduped = deduplicateVisions(qualifiedStatements);
  const dedupedScores = deduped.map((s) => {
    const idx = qualifiedStatements.indexOf(s);
    return qualifiedScores[idx];
  });

  // Guarantee: fill with grammar templates if still short
  let is_fallback = false;
  if (deduped.length < count) {
    is_fallback = true;
    const fallbacks = getAllGrammarVariants(programName, priorities);
    for (const fb of fallbacks) {
      if (deduped.length >= count) break;
      if (!deduped.some((d) => d.toLowerCase() === fb.toLowerCase())) {
        deduped.push(fb);
        dedupedScores.push(scoreVision(fb));
      }
    }
  }

  const ranked = rankVisions(deduped, dedupedScores, count);
  const finalVisions = ranked.map((r) => r.statement);

  // Build scores map (keyed by statement for easy frontend lookup)
  const scoresMap: Record<string, VisionScore> = {};
  for (let i = 0; i < deduped.length; i++) {
    scoresMap[deduped[i]] = dedupedScores[i];
  }

  return {
    visions:     finalVisions,
    scores:      scoresMap,
    ranked,
    is_fallback,
    attempts,
  };
}
