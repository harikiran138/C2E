/**
 * lib/ai/scoring.ts
 * Vision Scoring Engine — single source of truth for all vision validation rules.
 * Extracted from app/api/generate/vision-mission/route.ts and made standalone.
 */

export const VISION_APPROVAL_THRESHOLD = 90;
export const VISION_SIMILARITY_THRESHOLD = 0.75;

export interface VisionScore {
  score: number;
  hardFailures: string[];
  breakdown: {
    wc: number;
    starter: number;
    global: number;
    op: number;
    mkt: number;
    diversity: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GLOBAL_PATTERNS: Array<{ concept: string; regex: RegExp }> = [
  { concept: "globally recognized",      regex: /\bglobally recognized\b/i },
  { concept: "globally respected",       regex: /\bglobally respected\b/i },
  { concept: "internationally benchmarked", regex: /\binternationally benchmarked\b/i },
  { concept: "global leadership",        regex: /\bglobal leadership\b/i },
  { concept: "global distinction",       regex: /\b(global distinction|achieve distinction|distinction in)\b/i },
  { concept: "leading advancement",      regex: /\badvance as a leading\b/i },
];

const OPERATIONAL_TERMS = [
  "education", "teaching", "learning", "curriculum", "pedagogy",
  "classroom", "provide", "deliver", "develop", "cultivate",
  "train", "prepare", "implement", "foster",
];

const MARKETING_TERMS = ["destination", "hub", "world-class", "best-in-class", "unmatched"];

const STARTERS = [
  "To be globally recognized for",
  "To emerge as",
  "To achieve distinction in",
  "To advance as a leading",
  "To be globally respected for",
];

const SYNONYM_CLUSTERS = [
  ["distinction", "excellence", "premier", "leading", "leadership", "recognized", "respected"],
  ["innovation", "innovative", "transformative", "foresight", "advancement"],
];

const REDUNDANCY_SUFFIXES = [
  "ization", "ation", "ition", "tion", "sion", "ment",
  "ness", "ity", "ship", "ing", "ed", "es", "s",
];

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into",
  "through", "toward", "towards", "to", "of", "in", "on", "a",
  "an", "by", "be", "or", "is", "are", "as", "at", "program",
  "engineering", "institutional", "strategic", "global", "globally",
  "international", "internationally", "sustained", "long", "term", "future",
]);

const GLOBAL_TOKEN_RE = /\b(global|globally|international|internationally|world)\b/gi;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeWS(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeRoot(word: string) {
  let root = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!root || root.length <= 4) return root;
  for (const suffix of REDUNDANCY_SUFFIXES) {
    if (root.endsWith(suffix) && root.length - suffix.length >= 4) {
      return root.slice(0, -suffix.length);
    }
  }
  return root;
}

function extractTokens(text: string) {
  return normalizeWS(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

function getRepeatedRoots(statement: string) {
  const tokens = extractTokens(statement).filter((t) => !STOP_WORDS.has(t));
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const root = normalizeRoot(token);
    if (!root || STOP_WORDS.has(root)) continue;
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([r]) => r);
}

function hasSynonymStacking(statement: string) {
  const lower = statement.toLowerCase();
  return SYNONYM_CLUSTERS.some(
    (cluster) =>
      cluster.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(lower)).length >= 3,
  );
}

function containsTerm(text: string, term: string) {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function scoreVision(statement: string): VisionScore {
  const normalized = normalizeWS(statement);
  const lower = normalized.toLowerCase();
  const words = normalized.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean);

  const globalConcepts = [...new Set(
    GLOBAL_PATTERNS.filter(({ regex }) => regex.test(lower)).map(({ concept }) => concept),
  )];
  const globalTokenCount = lower.match(GLOBAL_TOKEN_RE)?.length ?? 0;
  const opHits     = OPERATIONAL_TERMS.filter((t) => containsTerm(lower, t));
  const mktHits    = MARKETING_TERMS.filter((t) => containsTerm(lower, t));
  const repeatedRoots = getRepeatedRoots(normalized);
  const synStacking = hasSynonymStacking(normalized);
  const estimatedPillars = Math.max(
    1,
    (normalized.match(/,/g)?.length ?? 0) + (normalized.match(/\band\b/gi)?.length ?? 0),
  );

  // Hard failure detection
  const hardFailures: string[] = [];
  if (words.length < 18 || words.length > 24)    hardFailures.push(`word count: ${words.length} (need 18–24)`);
  if (!STARTERS.some((s) => lower.startsWith(s.toLowerCase()))) hardFailures.push("no valid starter");
  if (globalConcepts.length !== 1)               hardFailures.push(`global concept count: ${globalConcepts.length} (need exactly 1)`);
  if (globalTokenCount > 1)                      hardFailures.push(`global phrase stacking: ${globalTokenCount} global tokens`);
  if (opHits.length > 0)                         hardFailures.push(`operational leakage: ${opHits.join(", ")}`);
  if (mktHits.length > 0)                        hardFailures.push(`marketing language: ${mktHits.join(", ")}`);
  if (estimatedPillars > 3)                      hardFailures.push(`pillar count: ${estimatedPillars} (max 3)`);
  if (repeatedRoots.length > 0)                  hardFailures.push(`repeated roots: ${repeatedRoots.join(", ")}`);
  if (synStacking)                               hardFailures.push("synonym stacking");

  // Score calculation (Exactly 100 pts total)
  const breakdown = {
    wc:      (words.length >= 18 && words.length <= 24) ? 25 : 0,
    starter: STARTERS.some((s) => lower.startsWith(s.toLowerCase())) ? 25 : 0,
    global:  globalConcepts.length === 1 && globalTokenCount === 1 ? 20 : 0,
    op:      opHits.length === 0 ? 20 : 0,
    mkt:     (mktHits.length === 0 && !synStacking) ? 10 : 0,
    diversity: repeatedRoots.length === 0 ? 10 : 0,
  };

  let score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  score = Math.max(0, Math.min(100, score));
  if (hardFailures.length > 0) score = Math.min(score, 79);

  return { score, hardFailures, breakdown };
}
