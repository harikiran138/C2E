/**
 * lib/ai/ranking-engine.ts
 * Ranks qualified vision candidates by combined quality + diversity score.
 *
 * Final score = 0.7 × qualityScore + 0.3 × diversityBonus
 * Diversity bonus rewards statements that differ from already-selected top picks.
 */

import { VisionScore } from "./scoring";
import { lexicalSimilarity } from "./similarity";

export interface RankedVision {
  statement:     string;
  qualityScore:  number;
  diversityBonus: number;
  finalScore:    number;
  hardFailures:  string[];
}

/**
 * Pick the top `count` vision statements from `candidates`, balancing quality
 * and lexical diversity.
 *
 * @param candidates  Vision statement strings
 * @param scores      Parallel array of VisionScore objects
 * @param count       How many to return
 */
export function rankVisions(
  candidates: string[],
  scores: VisionScore[],
  count: number,
): RankedVision[] {
  if (candidates.length === 0) return [];

  const selected: RankedVision[] = [];

  // Build index of (statement, score) sorted by quality descending for greedy selection
  const pool = candidates.map((statement, i) => ({
    statement,
    score: scores[i],
  })).sort((a, b) => b.score.score - a.score.score);

  for (const { statement, score } of pool) {
    if (selected.length >= count) break;

    // Diversity bonus: average distance from already-selected statements
    const diversityBonus = selected.length === 0
      ? 1.0
      : selected.reduce((sum, s) => sum + (1 - lexicalSimilarity(s.statement, statement)), 0)
        / selected.length;

    const finalScore = 0.7 * score.score + 0.3 * (diversityBonus * 100);

    selected.push({
      statement,
      qualityScore:  score.score,
      diversityBonus,
      finalScore,
      hardFailures:  score.hardFailures,
    });
  }

  return selected.sort((a, b) => b.finalScore - a.finalScore);
}
