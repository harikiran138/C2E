/**
 * lib/ai/peo-scoring.ts
 * PEO (Program Educational Objectives) scoring rubric.
 *
 * PEOs describe what graduates achieve 3–5 years after graduation.
 * Rubric aligned with NBA/ABET PEO requirements.
 */

export const PEO_APPROVAL_THRESHOLD = 85;

export interface PEOScore {
  score:        number;
  hardFailures: string[];
  breakdown:    Record<string, number>;
}

// Bloom's taxonomy action verbs appropriate for PEOs
const BLOOMS_VERBS = [
  "apply", "analyze", "design", "evaluate", "lead", "manage",
  "communicate", "contribute", "demonstrate", "develop", "implement",
  "engage", "pursue", "adapt", "integrate", "advance",
];

const VAGUE_WORDS = ["excellent", "best", "world-class", "outstanding", "superior", "unmatched"];

const REQUIRED_PREFIX = "within 3 to 5 years of graduation";

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Score a PEO statement. Sync — no embeddings needed.
 */
export function scorePEO(statement: string): PEOScore {
  const normalized = normalizeWhitespace(statement);
  const lower      = normalized.toLowerCase();
  const words      = normalized.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean);

  const startsCorrectly = lower.startsWith(REQUIRED_PREFIX);
  const bloomsMatch     = BLOOMS_VERBS.find((v) => new RegExp(`\\b${v}\\b`, "i").test(lower));
  const vagueHits       = VAGUE_WORDS.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(lower));
  const commaCount      = (normalized.match(/,/g) || []).length;
  const wordCount       = words.length;

  const hardFailures = [
    ...(!startsCorrectly             ? ["must start with 'Within 3 to 5 years of graduation'"] : []),
    ...(wordCount < 20               ? ["word count below 20"]                                 : []),
    ...(wordCount > 35               ? ["word count above 35"]                                 : []),
  ];

  // Scoring dimensions
  let startingPhrase = startsCorrectly ? 100 : 0;
  let bloomsVerb     = bloomsMatch ? 100 : 60;
  let clarity        = 100;
  if (vagueHits.length > 0)  clarity -= 20 * vagueHits.length;
  if (commaCount > 1)        clarity -= 15;
  let length         = (wordCount >= 20 && wordCount <= 35) ? 100 : 0;

  let score = Math.round(
    startingPhrase * 0.40 +
    bloomsVerb     * 0.25 +
    clarity        * 0.20 +
    length         * 0.15,
  );
  score = Math.max(0, Math.min(100, score));
  if (hardFailures.length > 0) score = Math.min(score, 79);

  return {
    score,
    hardFailures,
    breakdown: { startingPhrase, bloomsVerb, clarity, length },
  };
}
