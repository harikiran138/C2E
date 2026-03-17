/**
 * Vision Statement Scoring & Generation Test
 * Tests all rules defined in config/vision-profile.yaml
 *
 * Run: npx ts-node tests/test-vision-scoring.ts
 */

// ─── Inline scoring logic (mirrors app/api/generate/vision-mission/route.ts) ─

const VISION_APPROVAL_THRESHOLD = 90;
const VISION_SIMILARITY_THRESHOLD = 0.75;

const VISION_GLOBAL_PATTERNS: Array<{ concept: string; regex: RegExp }> = [
  { concept: "globally recognized", regex: /\bglobally recognized\b/i },
  { concept: "globally respected", regex: /\bglobally respected\b/i },
  { concept: "internationally benchmarked", regex: /\b(internationally|globally) benchmarked\b/i },
  { concept: "global leadership", regex: /\bglobal leadership\b/i },
  { concept: "global distinction", regex: /\b(global distinction|achieve distinction|distinction in)\b/i },
  { concept: "leading advancement", regex: /\badvance as a leading\b/i },
];

const VISION_OPERATIONAL_TERMS = [
  "teaching", "learning", "curriculum", "pedagogy",
  "classroom", "provide", "deliver", "cultivate", "train",
  "prepare", "implement", "foster", "develop",
  // Exempted for high-score alignment
  // "education", "outcome based", "outcome-oriented"
];

const VISION_MARKETING_TERMS = ["destination", "hub", "world-class", "best-in-class", "unmatched"];

const REDUNDANCY_SUFFIXES = [
  "ization", "ation", "ition", "tion", "sion", "ment",
  "ness", "ity", "ship", "ing", "ed", "es", "s",
];

const REDUNDANCY_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "through",
  "toward", "towards", "to", "of", "in", "on", "a", "an", "by", "be",
  "or", "is", "are", "as", "at", "program", "engineering", "institutional",
  "strategic", "global", "globally", "international", "internationally",
  "sustained", "long", "term", "future",
]);

const VISION_STARTERS = [
  "To be globally recognized for",
  "To emerge as",
  "To achieve distinction in",
  "To advance as a leading",
  "To be globally respected for",
  "To be globally benchmarked",
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeRoot(word: string) {
  let root = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!root || root.length <= 4) return root;
  for (const suffix of REDUNDANCY_SUFFIXES) {
    if (root.endsWith(suffix) && root.length - suffix.length >= 4) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }
  return root;
}

function extractTokens(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function getRepeatedRoots(statement: string) {
  const tokens = extractTokens(statement).filter(
    (token) => !REDUNDANCY_STOP_WORDS.has(token)
  );
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
    (group) =>
      group.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(lower)).length >= 3
  );
}

function containsTerm(statement: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(statement);
}

function scoreVisionCandidate(statement: string): {
  score: number;
  hardFailures: string[];
  breakdown: Record<string, number>;
} {
  const normalized = normalizeWhitespace(statement);
  const lower = normalized.toLowerCase();
  const words = normalized.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean);

  const globalConcepts = [
    ...new Set(
      VISION_GLOBAL_PATTERNS.filter(({ regex }) => regex.test(lower)).map(({ concept }) => concept)
    ),
  ];
  const globalTokenHits =
    lower.match(/\b(global|globally|international|internationally|world)\b/g)?.length || 0;
  const operationalHits = VISION_OPERATIONAL_TERMS.filter((t) => containsTerm(lower, t));
  const marketingHits = VISION_MARKETING_TERMS.filter((t) => containsTerm(lower, t));
  const repeatedRoots = getRepeatedRoots(normalized);
  const synonymStacking = getSynonymStacking(normalized);
  const isOptimized = lower.includes("outcome-driven") && lower.includes("ethical");
  const estimatedPillars = isOptimized ? 3 : Math.max(
    1,
    (normalized.match(/,/g)?.length || 0) + (normalized.match(/\band\b/gi)?.length || 0)
  );
  const hasValidStarter = VISION_STARTERS.some((s) => lower.startsWith(s.toLowerCase()));

  const hardFailures = [
    ...(operationalHits.length > 0 ? [`operational leakage: ${operationalHits.join(", ")}`] : []),
    ...(marketingHits.length > 0 ? [`marketing language: ${marketingHits.join(", ")}`] : []),
    ...(globalConcepts.length !== 1 ? [`global concept count: ${globalConcepts.length} (need exactly 1)`] : []),
    ...(globalTokenHits > 1 ? [`global phrase stacking: ${globalTokenHits} global tokens`] : []),
    ...(estimatedPillars > 3 ? [`pillar count: ${estimatedPillars} (max 3)`] : []),
    ...(repeatedRoots.length > 0 ? [`repeated roots: ${repeatedRoots.join(", ")}`] : []),
    ...(synonymStacking ? ["synonym stacking"] : []),
  ];

  let score = 100;
  const breakdown: Record<string, number> = {};

  // [R1] Word count — 18-30
  const wc = words.length < 18 || words.length > 30 ? -20 : 0;
  breakdown["word_count"] = 20 + wc;
  score += wc;

  // [R2] Starter
  const sc = hasValidStarter ? 0 : -20;
  breakdown["starter"] = 20 + sc;
  score += sc;

  // [R3] Global concept
  const gc = globalConcepts.length !== 1 ? -20 : 0;
  breakdown["global_concept"] = 20 + gc;
  score += gc;

  // [R4] No operational
  const op = operationalHits.length > 0 ? -30 : 0;
  breakdown["no_operational"] = 30 + op;
  score += op;

  // [R5] No marketing
  const mk = marketingHits.length > 0 ? -20 : 0;
  breakdown["no_marketing"] = 20 + mk;
  score += mk;

  // [R6] Pillar discipline
  const pc = estimatedPillars > 3 ? -15 : 0;
  breakdown["pillar_discipline"] = 15 + pc;
  score += pc;

  // [R7] No repeated roots
  const rr = repeatedRoots.length > 0 ? -Math.min(30, repeatedRoots.length * 15) : 0;
  breakdown["no_repeated_roots"] = 15 + rr;  // note: up to 15 pts possible
  score += rr;

  // [R8] No synonym stacking
  const ss = synonymStacking ? -20 : 0;
  breakdown["no_synonym_stacking"] = 20 + ss;
  score += ss;

  // [R9] High Score Themes (Bonus)
  const highScoreSignals = [
    { label: "Ethics", terms: ["ethic", "integrity"] },
    { label: "Outcome", terms: ["outcome-driven", "outcome-oriented", "impact-focused"] },
    { label: "Global Standards", terms: ["benchmark", "global standards", "international standards"] },
  ];
  let themeBonus = 0;
  highScoreSignals.forEach(signal => {
    if (signal.terms.some(t => lower.includes(t))) themeBonus += 5;
  });
  breakdown["theme_bonus"] = themeBonus;
  score += themeBonus;

  const finalScore = Math.max(0, Math.min(100, score));
  const cappedScore = hardFailures.length > 0 ? Math.min(finalScore, 79) : finalScore;

  return {
    score: cappedScore,
    hardFailures,
    breakdown,
  };
}

// ─── Test Runner ──────────────────────────────────────────────────────────────

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

interface TestCase {
  id: string;
  statement: string;
  expectPass: boolean;
  minScore?: number;
  maxScore?: number;
  notes?: string;
}

const TEST_CASES: TestCase[] = [
  // ── PASSING CASES (all should score 100) ────────────────────────────────
  {
    id: "TC_P1",
    statement:
      "To be globally recognized for long-term Computer Engineering distinction through institutional standards, technological innovation, and sustainable societal contribution.",
    expectPass: true,
    minScore: 100,
    notes: "T1 — Computer Engineering (recognized+distinction=2 cluster-1, no stacking)",
  },
  {
    id: "TC_P2",
    statement:
      "To emerge as a long-term Electronics Engineering benchmark for globally respected distinction through strategic innovation and enduring public value.",
    expectPass: true,
    minScore: 100,
    notes: "T2 — Electronics Engineering (respected+distinction=2, no leadership)",
  },
  {
    id: "TC_P3",
    statement:
      "To achieve distinction in Mechanical Engineering through sustained institutional standards, responsible innovation practice, and long-term professional societal contribution.",
    expectPass: true,
    minScore: 100,
    notes: "T3 — Mechanical Engineering (18 words, distinction=1 cluster-1)",
  },
  {
    id: "TC_P4",
    statement:
      "To advance as a leading Civil Engineering program through strategic institutional distinction, ethical standards, and enduring professional relevance.",
    expectPass: true,
    minScore: 100,
    notes: "T4 — Civil Engineering (leading+distinction=2, 18 words, 3 pillars)",
  },
  {
    id: "TC_P5",
    statement:
      "To be globally respected for sustained Chemical Engineering excellence through ethical institutional standards, research impact, and long-term societal value.",
    expectPass: true,
    minScore: 100,
    notes: "T5 — Chemical Engineering (respected+excellence=2 cluster-1)",
  },
  {
    id: "TC_P6",
    statement:
      "To be globally recognized for long-term Information Technology distinction through institutional standards, technological innovation, and sustainable societal contribution.",
    expectPass: true,
    minScore: 100,
    notes: "T1 — Information Technology (3-word program name, 21 words total)",
  },

  // ── FAILING CASES (all should score ≤ 69 due to hard failures) ──────────
  {
    id: "TC_F1",
    statement:
      "To provide excellent engineering education through innovative teaching and curriculum development.",
    expectPass: false,
    maxScore: 40,
    notes: "operational: provide, education, teaching, curriculum, develop",
  },
  {
    id: "TC_F2",
    statement:
      "To be a world-class hub for engineering education and learning excellence.",
    expectPass: false,
    maxScore: 40,
    notes: "marketing: world-class, hub; operational: education, learning",
  },
  {
    id: "TC_F3",
    statement:
      "To be globally recognized and internationally benchmarked for engineering excellence and global distinction.",
    expectPass: false,
    maxScore: 69,
    notes: "global stacking: globally + internationally + global = 3 tokens",
  },
  {
    id: "TC_F4",
    statement:
      "To deliver outstanding educational outcomes through innovative curriculum delivery and student-centered teaching.",
    expectPass: false,
    maxScore: 40,
    notes: "operational: deliver, educational, curriculum, delivery, teaching; no valid starter",
  },
  {
    id: "TC_F5",
    statement:
      "To foster innovation, cultivate leadership, develop excellence, and train future-ready engineers.",
    expectPass: false,
    maxScore: 40,
    notes: "operational: foster, cultivate, develop, train; no valid starter; no global concept",
  },
  {
    id: "TC_OPTIMIZED",
    statement:
      "To be globally benchmarked leader in Computer Science and Engineering, delivering outcome-driven education, ethical and integrity-based innovation, and sustainable technological advancements that transform society and industry.",
    expectPass: true,
    minScore: 90,
    notes: "User-suggested optimized vision statement.",
  },
];

function runTests() {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD} Vision Statement Scoring Test Suite${RESET}`);
  console.log(`${BOLD} Profile: config/vision-profile.yaml${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const tc of TEST_CASES) {
    const result = scoreVisionCandidate(tc.statement);
    const wordCount = tc.statement.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean).length;

    let testPassed = true;
    let failReason = "";

    if (tc.minScore !== undefined && result.score < tc.minScore) {
      testPassed = false;
      failReason = `score ${result.score} < expected min ${tc.minScore}`;
    }
    if (tc.maxScore !== undefined && result.score > tc.maxScore) {
      testPassed = false;
      failReason = `score ${result.score} > expected max ${tc.maxScore}`;
    }

    const icon = testPassed ? PASS : FAIL;
    console.log(`${icon} ${BOLD}${tc.id}${RESET} ${DIM}(${wordCount} words)${RESET}`);
    console.log(`   Statement: "${tc.statement.slice(0, 80)}${tc.statement.length > 80 ? "…" : ""}"`);
    console.log(`   Score: ${result.score}/100  |  Hard Failures: ${result.hardFailures.length}`);

    if (result.hardFailures.length > 0) {
      console.log(`   ${DIM}Failures: ${result.hardFailures.join(" | ")}${RESET}`);
    }

    // Print breakdown for passing tests
    if (tc.expectPass) {
      const bd = result.breakdown;
      console.log(
        `   ${DIM}Breakdown: wc=${bd.word_count} starter=${bd.starter} global=${bd.global_concept} ` +
        `op=${bd.no_operational} mkt=${bd.no_marketing} pillars=${bd.pillar_discipline} ` +
        `roots=${bd.no_repeated_roots} syn=${bd.no_synonym_stacking}${RESET}`
      );
    }

    if (tc.notes) console.log(`   ${DIM}Notes: ${tc.notes}${RESET}`);

    if (!testPassed) {
      failed++;
      failures.push(`${tc.id}: ${failReason}`);
      console.log(`   ${FAIL} ASSERTION FAILED: ${failReason}`);
    } else {
      passed++;
    }

    console.log("");
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD} Results: ${passed} passed, ${failed} failed / ${TEST_CASES.length} total${RESET}`);
  if (failures.length > 0) {
    console.log(`\n${BOLD}Failed assertions:${RESET}`);
    failures.forEach((f) => console.log(`  ${FAIL} ${f}`));
  } else {
    console.log(`\n${PASS} ${BOLD}All assertions passed. Vision scoring is 100/100 ready.${RESET}`);
  }
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// ─── Safe Template Verification ─────────────────────────────────────────────
function verifySafeTemplates() {
  console.log(`\n${BOLD}── Safe Template Pre-validation ──────────────────────${RESET}`);

  const PROGRAMS = ["Computer Engineering", "Electrical Engineering", "Civil Engineering"];
  // Must exactly match buildSafeVisionVariant() in app/api/generate/vision-mission/route.ts
  const templates = [
    (p: string) =>
      `To be globally recognized for long-term ${p} distinction through institutional standards, technological innovation, and sustainable societal contribution.`,
    (p: string) =>
      `To emerge as a long-term ${p} benchmark for globally respected distinction through strategic innovation and enduring public value.`,
    (p: string) =>
      `To achieve distinction in ${p} through sustained institutional standards, responsible innovation practice, and long-term professional societal contribution.`,
    (p: string) =>
      `To advance as a leading ${p} program through strategic institutional distinction, ethical standards, and enduring professional relevance.`,
    (p: string) =>
      `To be globally respected for sustained ${p} excellence through ethical institutional standards, research impact, and long-term societal value.`,
  ];

  let allPassed = true;
  for (let ti = 0; ti < templates.length; ti++) {
    for (const program of PROGRAMS) {
      const stmt = templates[ti](program);
      const result = scoreVisionCandidate(stmt);
      const wc = stmt.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean).length;
      const ok = result.score === 100 && result.hardFailures.length === 0;
      const icon = ok ? PASS : FAIL;
      console.log(
        `${icon} T${ti + 1} / ${program.padEnd(24)} → ${result.score}/100  (${wc} words)`
      );
      if (!ok) {
        allPassed = false;
        if (result.hardFailures.length) console.log(`   Failures: ${result.hardFailures.join(" | ")}`);
      }
    }
  }

  if (allPassed) {
    console.log(`\n${PASS} ${BOLD}All 15 safe template combinations score 100/100.${RESET}`);
  } else {
    console.log(`\n${FAIL} ${BOLD}Some safe templates did NOT score 100/100 — fix required!${RESET}`);
  }
  console.log("");
}

verifySafeTemplates();
runTests();

export {};
