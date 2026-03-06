/**
 * lib/ai/similarity.ts
 * Lexical bigram Jaccard similarity — no embeddings, no API calls.
 */

export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

function getBigrams(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const bigrams = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Jaccard similarity between two vision statements using word bigrams.
 * Returns 0.0 (completely different) to 1.0 (identical).
 */
export function lexicalSimilarity(a: string, b: string): number {
  const ba = getBigrams(a);
  const bb = getBigrams(b);
  if (ba.size === 0 && bb.size === 0) return 1.0;
  if (ba.size === 0 || bb.size === 0) return 0.0;
  let intersection = 0;
  for (const gram of ba) {
    if (bb.has(gram)) intersection++;
  }
  const union = ba.size + bb.size - intersection;
  return intersection / union;
}

/**
 * Returns true if two statements are too similar (above threshold).
 */
export function areTooSimilar(
  a: string,
  b: string,
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): boolean {
  return lexicalSimilarity(a, b) >= threshold;
}

/**
 * Deduplicate an array of vision statements, keeping the first occurrence of
 * any cluster of near-identical statements.
 */
export function deduplicateVisions(
  candidates: string[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): string[] {
  const kept: string[] = [];
  for (const candidate of candidates) {
    if (!kept.some((k) => areTooSimilar(k, candidate, threshold))) {
      kept.push(candidate);
    }
  }
  return kept;
}
