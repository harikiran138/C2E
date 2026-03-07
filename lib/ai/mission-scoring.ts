/**
 * lib/ai/mission-scoring.ts
 * Mission scoring rubric — ported from app/api/generate/vision-mission/route.ts.
 *
 * NOTE: overlap and leakage intentionally use the same computeSemanticSimilarity call.
 * The hard-failure threshold (leakage > 0.82) and coherence penalty (leakage > 0.72)
 * are calibrated to this behaviour — do not change.
 */

import { computeSemanticSimilarity, calculateLexicalRichness } from "@/lib/ai-validation";

// ── Constants ────────────────────────────────────────────────────────────────

export const MISSION_APPROVAL_THRESHOLD = 90;

const MISSION_OPERATIONAL_VERBS = [
  "deliver", "strengthen", "foster", "promote", "advance",
  "implement", "integrate", "enable", "support", "sustain", "build",
];

const MISSION_MARKETING_TERMS = [
  "destination", "hub", "world-class", "best-in-class", "unmatched",
];

const MISSION_RESTRICTED_TERMS = [
  "guarantee", "ensure all", "100%", "master", "excel in all",
];

const MISSION_IMMEDIATE_TERMS = [
  "at graduation", "on graduation",
  "students will be able to", "student will be able to",
];

const MISSION_PILLAR_SIGNALS = {
  academic:              ["curriculum", "outcome-based", "outcome based", "academic", "learning", "continuous improvement", "rigor"],
  research_industry:     ["research", "industry", "innovation", "laboratory", "hands-on", "internship", "collaboration"],
  professional_standards:["professional standards", "engineering standards", "standards alignment", "quality standards"],
  ethics_society:        ["ethical", "ethics", "societal", "community", "sustainable", "responsibility", "public"],
} as const;

const REDUNDANCY_SUFFIXES = [
  "ization", "ation", "ition", "tion", "sion", "ment",
  "ness", "ity", "ship", "ing", "ed", "es", "s",
];

const REDUNDANCY_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into",
  "through", "toward", "towards", "to", "of", "in", "on", "a", "an",
  "by", "be", "or", "is", "are", "as", "at",
  "program", "engineering", "institutional", "strategic",
  "global", "globally", "international", "internationally",
  "sustained", "long", "term", "future",
]);

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MissionScore {
  score:        number;
  hardFailures: string[];
  breakdown:    Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function containsTerm(statement: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(statement);
}

function extractTokens(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
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

function getRepeatedRoots(statement: string) {
  const tokens = extractTokens(statement).filter((t) => !REDUNDANCY_STOP_WORDS.has(t));
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const root = normalizeRoot(token);
    if (!root || REDUNDANCY_STOP_WORDS.has(root)) continue;
    counts.set(root, (counts.get(root) || 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([r]) => r);
}

function getSynonymStacking(statement: string) {
  const lower = statement.toLowerCase();
  const groups = [
    ["distinction", "excellence", "premier", "leading", "leadership", "recognized", "respected"],
    ["innovation", "innovative", "transformative", "foresight", "advancement"],
  ];
  return groups.some(
    (g) => g.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(lower)).length >= 3,
  );
}

function missionPillarCoverage(statement: string) {
  const lower = statement.toLowerCase();
  const hits = {
    academic:              MISSION_PILLAR_SIGNALS.academic.some((t) => containsTerm(lower, t)),
    research_industry:     MISSION_PILLAR_SIGNALS.research_industry.some((t) => containsTerm(lower, t)),
    professional_standards:MISSION_PILLAR_SIGNALS.professional_standards.some((t) => containsTerm(lower, t)),
    ethics_society:        MISSION_PILLAR_SIGNALS.ethics_society.some((t) => containsTerm(lower, t)),
  };
  return { ...hits, total: Object.values(hits).filter(Boolean).length };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Score a mission statement. Async because vision-leakage check uses embeddings.
 * Pass an empty string for visionRef to skip leakage check (returns 0.35 baseline).
 */
export async function scoreMission(
  statement:  string,
  visionRef = "",
): Promise<MissionScore> {
  const normalized     = normalizeWhitespace(statement);
  const lower          = normalized.toLowerCase();
  const words          = normalized.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean);
  const sentenceCount  = normalized.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  const operationalHits= MISSION_OPERATIONAL_VERBS.filter((t) => containsTerm(lower, t));
  const marketingHits  = MISSION_MARKETING_TERMS.filter((t) => containsTerm(lower, t));
  const restrictedHits = MISSION_RESTRICTED_TERMS.filter((t) => lower.includes(t));
  const immediateHits  = MISSION_IMMEDIATE_TERMS.filter((t) => lower.includes(t));
  const repeatedRoots  = getRepeatedRoots(normalized);
  const synonymStacking= getSynonymStacking(normalized);
  const pillars        = missionPillarCoverage(normalized);
  const lexicalRichness= calculateLexicalRichness(normalized);

  // NOTE: overlap and leakage intentionally use the same call (calibrated thresholds).
  const overlap  = visionRef ? await computeSemanticSimilarity(visionRef, normalized) : 0.35;
  const leakage  = visionRef ? await computeSemanticSimilarity(visionRef, normalized) : 0;

  const hardFailures = [
    ...(lexicalRichness < 40               ? ["insufficient lexical flexibility"] : []),
    ...(operationalHits.length < 2         ? ["insufficient operational verbs"]   : []),
    ...(sentenceCount < 3 || sentenceCount > 4 ? ["mission sentence count"]       : []),
    ...(pillars.total < 3                  ? ["pillar coverage"]                  : []),
    ...(repeatedRoots.length > 0           ? [`repeated roots: ${repeatedRoots.join(", ")}`] : []),
    ...(synonymStacking                    ? ["synonym stacking"]                 : []),
    ...(marketingHits.length > 0           ? ["marketing language"]               : []),
    ...(restrictedHits.length > 0          ? ["restricted wording"]               : []),
    ...(immediateHits.length > 0           ? ["immediate outcomes"]               : []),
    ...(leakage > 0.82                     ? ["vision leakage"]                   : []),
  ];

  let alignment = 100;
  if (visionRef) {
    const pillarScore = Math.min(100, Math.round((pillars.total / 4) * 100));
    alignment = Math.round(Math.min(100, overlap * 100) * 0.65 + pillarScore * 0.35);
  }

  let operational = 100;
  if (operationalHits.length < 2) operational -= 45;
  if (pillars.total < 3)          operational -= 35;
  if (sentenceCount < 3 || sentenceCount > 4) operational -= 25;

  let redundancy = 100;
  if (repeatedRoots.length > 0) redundancy -= Math.min(60, repeatedRoots.length * 20);
  if (synonymStacking)           redundancy -= 35;

  let accreditation = 100;
  if (marketingHits.length > 0)  accreditation -= 45;
  if (restrictedHits.length > 0) accreditation -= 35;
  if (immediateHits.length > 0)  accreditation -= 40;

  let coherence = 100;
  if (sentenceCount < 3 || sentenceCount > 4) coherence -= 35;
  if (words.length < 45 || words.length > 110) coherence -= 25;
  if (pillars.total < 3)         coherence -= 25;
  if (leakage > 0.72)            coherence -= 30;

  let score = Math.round(
    alignment    * 0.25 +
    operational  * 0.20 +
    redundancy   * 0.15 +
    accreditation* 0.20 +
    coherence    * 0.20,
  );
  score = Math.max(0, Math.min(100, score));
  if (hardFailures.length > 0) score = Math.min(score, 79);

  return {
    score,
    hardFailures,
    breakdown: { alignment, operational, redundancy, accreditation, coherence },
  };
}
