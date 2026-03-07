/**
 * lib/ai/po-scoring.ts
 * Program Outcomes (PO) scoring rubric.
 *
 * POs describe graduate competencies at the time of graduation.
 * Rubric aligned with NBA/ABET PO requirements.
 */

export const PO_APPROVAL_THRESHOLD = 85;

export interface POScore {
  score:        number;
  hardFailures: string[];
  breakdown:    Record<string, number>;
}

const VALID_PREFIXES = ["ability to ", "an ability to "];

const ACTION_VERBS = [
  "design", "analyze", "apply", "communicate", "work", "use",
  "understand", "function", "engage", "recognize", "conduct", "identify",
  "demonstrate", "evaluate", "implement", "develop", "create", "formulate",
  "interpret", "assess", "collaborate", "manage",
];

const FIRST_PERSON_PATTERNS = [/\bi\b/, /\bmy\b/, /\bwe\b/, /\bour\b/, /\bus\b/];

const VAGUE_WORDS = ["excellent", "outstanding", "world-class", "best", "unmatched", "superior"];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Score a Program Outcome statement. Sync — no embeddings needed.
 */
export function scorePO(statement: string): POScore {
  const normalized = normalizeWhitespace(statement);
  const lower      = normalized.toLowerCase();
  const words      = normalized.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean);

  const hasValidPrefix = VALID_PREFIXES.some((p) => lower.startsWith(p));
  const hasActionVerb  = ACTION_VERBS.some((v) => new RegExp(`\\b${v}\\b`, "i").test(lower));
  const hasFirstPerson = FIRST_PERSON_PATTERNS.some((r) => r.test(lower));
  const vagueHits      = VAGUE_WORDS.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(lower));
  const wordCount      = words.length;

  const hardFailures = [
    ...(!hasValidPrefix  ? ["must start with 'Ability to' or 'An ability to'"] : []),
    ...(wordCount > 25   ? ["word count above 25"]                              : []),
  ];

  let prefix     = hasValidPrefix ? 100 : 0;
  let actionVerb = hasActionVerb  ? 100 : 60;
  let clarity    = 100;
  if (hasFirstPerson)        clarity -= 30;
  if (vagueHits.length > 0)  clarity -= 20 * vagueHits.length;
  let length     = wordCount <= 25 ? 100 : 0;

  let score = Math.round(
    prefix     * 0.40 +
    actionVerb * 0.25 +
    clarity    * 0.20 +
    length     * 0.15,
  );
  score = Math.max(0, Math.min(100, score));
  if (hardFailures.length > 0) score = Math.min(score, 79);

  return {
    score,
    hardFailures,
    breakdown: { prefix, actionVerb, clarity, length },
  };
}
