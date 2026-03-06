/**
 * tests/test-full-pipeline.ts
 * Full pipeline integration test covering:
 *  1. Template Engine — all 105 combinations score ≥95
 *  2. Vision Agent (template-only mode, no Gemini key)
 *  3. Scoring — all rubric rules verified
 *  4. Similarity — dedup logic
 *  5. Ranking — diversity bonus applied
 *  6. Mutation — starter variation
 *
 * Run: npx tsx tests/test-full-pipeline.ts
 */

import { getAllGrammarVariants, buildGrammarVision, PRIORITY_PILLAR_BANK } from "../lib/ai/template-engine";
import { scoreVision, VISION_APPROVAL_THRESHOLD }                           from "../lib/ai/scoring";
import { visionAgent }                                                       from "../lib/ai/vision-agent";
import { areTooSimilar, lexicalSimilarity, deduplicateVisions }             from "../lib/ai/similarity";
import { rankVisions }                                                       from "../lib/ai/ranking-engine";
import { mutateVisionStarter }                                               from "../lib/ai/mutation-engine";

// ────────────────────────────────────────────────────────────────────────────
// Helpers

let totalPassed = 0;
let totalFailed = 0;

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function assert(condition: boolean, label: string, detail = "") {
  if (condition) {
    totalPassed++;
    console.log(`  ✅ ${label}`);
  } else {
    totalFailed++;
    console.error(`  ❌ FAIL: ${label}${detail ? " — " + detail : ""}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Template Engine grid

section("1. Template Engine — full grid (3 programs × 15 variants)");

const PROGRAMS = [
  "Computer Science",
  "Electrical Engineering",
  "Electronics and Communication Engineering",
];
const ALL_PRIORITIES = Object.keys(PRIORITY_PILLAR_BANK);

let gridFailed = 0;
for (const prog of PROGRAMS) {
  const variants = getAllGrammarVariants(prog, ALL_PRIORITIES);
  for (const v of variants) {
    const s = scoreVision(v);
    if (s.score < 95 || s.hardFailures.length > 0) {
      gridFailed++;
      console.error(`    FAIL prog="${prog}": ${v}`);
      console.error(`         score=${s.score} failures=${s.hardFailures.join(", ")}`);
    }
  }
}
assert(gridFailed === 0, `All ${PROGRAMS.length * 15} grid variants score ≥95`, `${gridFailed} failed`);

// ────────────────────────────────────────────────────────────────────────────
// 2. Individual rule tests

section("2. Scoring — per-rule verification");

const GOOD = [
  "To be globally recognized for long-term Computer Engineering distinction through institutional academic rigor, applied innovation practice, and sustainable societal contribution.",
  "To achieve distinction in Electrical Engineering through sustained rigorous institutional quality, long-term professional readiness, and ethical institutional governance.",
  "To advance as a leading Mechanical Engineering program through strategic institutional distinction, responsible technological innovation, and long-term professional competitiveness.",
];

for (const v of GOOD) {
  const s = scoreVision(v);
  assert(s.score >= 95, `Known-good scores ≥95: ${v.slice(0, 60)}…`, `score=${s.score}`);
  assert(s.hardFailures.length === 0, `No hard failures`, s.hardFailures.join(", "));
}

// Rule-specific failure cases
const BAD_WORD_COUNT = "To be globally recognized for distinction.";
assert(
  scoreVision(BAD_WORD_COUNT).hardFailures.some(f => f.includes("word count")),
  "Word count < 18 triggers hard failure",
);

const BAD_OP = "To be globally recognized for providing quality education and fostering student learning.";
assert(
  scoreVision(BAD_OP).hardFailures.some(f => f.includes("operational")),
  "Operational term 'education/fostering' triggers hard failure",
);

const BAD_GLOBAL = "To be globally recognized for globally respected distinction.";
assert(
  scoreVision(BAD_GLOBAL).hardFailures.some(f => f.includes("global")),
  "Two global concepts triggers hard failure",
);

const BAD_STACKING = "To be globally recognized for distinction through excellence, leadership, and premier standards.";
assert(
  scoreVision(BAD_STACKING).hardFailures.some(f => f.includes("synonym stacking")),
  "Synonym stacking (4 cluster-1 words) triggers hard failure",
);

// ────────────────────────────────────────────────────────────────────────────
// 3. Vision Agent — template-only mode (no Gemini key)

section("3. Vision Agent — template-only (no Gemini key)");

const SAMPLE_PRIORITIES = [
  "Innovation-driven education",
  "Ethics and integrity",
  "Globally competitive graduates",
];

async function testAgent() {
  const result = await visionAgent({
    programName:  "Computer Engineering",
    priorities:   SAMPLE_PRIORITIES,
    count:        3,
    geminiApiKey: undefined, // no key → template-only
  });

  assert(result.visions.length === 3, `Agent returns exactly 3 visions (got ${result.visions.length})`);

  for (const v of result.visions) {
    const s = scoreVision(v);
    assert(s.score >= VISION_APPROVAL_THRESHOLD, `Vision ≥${VISION_APPROVAL_THRESHOLD}: "${v.slice(0, 55)}…"`, `score=${s.score}`);
  }

  assert(result.ranked.length === 3, `Ranked list has 3 entries`);
  assert(
    result.ranked[0].finalScore >= result.ranked[result.ranked.length - 1].finalScore,
    "Ranked in descending order",
  );

  console.log("\n  Sample outputs:");
  result.visions.forEach((v, i) => {
    const s = scoreVision(v);
    console.log(`    [${i + 1}] score=${s.score} "${v.slice(0, 70)}…"`);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Similarity

section("4. Similarity & deduplication");

const S1 = "To be globally recognized for long-term Computer Engineering distinction through institutional academic rigor.";
const S2 = "To be globally recognized for long-term Computer Engineering distinction through institutional academic rigor."; // identical
const S3 = "To achieve distinction in Electrical Engineering through sustained ethical institutional governance.";

const sim12 = lexicalSimilarity(S1, S2);
assert(sim12 === 1.0, `Identical statements similarity = 1.0 (got ${sim12})`);

const sim13 = lexicalSimilarity(S1, S3);
assert(sim13 < 0.75, `Different statements similarity < 0.75 (got ${sim13.toFixed(2)})`);

assert(areTooSimilar(S1, S2), "Identical → too similar");
assert(!areTooSimilar(S1, S3), "Different → not too similar");

const duped = [S1, S2, S3];
const deduped = deduplicateVisions(duped);
assert(deduped.length === 2, `Dedup reduces 3 to 2 (got ${deduped.length})`);

// ────────────────────────────────────────────────────────────────────────────
// 5. Ranking

section("5. Ranking Engine — diversity bonus");

const candidates = [
  "To be globally recognized for long-term Computer Engineering distinction through institutional academic rigor, applied innovation practice, and sustainable societal contribution.",
  "To achieve distinction in Computer Engineering through sustained ethical institutional governance, long-term professional readiness, and applied innovation practice.",
  "To advance as a leading Computer Engineering program through strategic institutional distinction, responsible technological innovation, and long-term professional competitiveness.",
];
const scores = candidates.map(scoreVision);
const ranked = rankVisions(candidates, scores, 3);

assert(ranked.length === 3, `Ranking returns 3 results`);
assert(ranked[0].diversityBonus >= 0, `First item has diversity bonus ≥ 0`);
assert(ranked[0].finalScore >= 90, `Top-ranked finalScore ≥ 90 (got ${ranked[0].finalScore.toFixed(1)})`);
console.log("\n  Ranked results:");
ranked.forEach((r, i) =>
  console.log(`    [${i + 1}] quality=${r.qualityScore} diversity=${r.diversityBonus.toFixed(2)} final=${r.finalScore.toFixed(1)}`),
);

// ────────────────────────────────────────────────────────────────────────────
// 6. Mutation

section("6. Mutation Engine — starter variation");

const base = "To be globally recognized for long-term Computer Engineering distinction through institutional academic rigor, applied innovation practice, and sustainable societal contribution.";
const mut0 = mutateVisionStarter(base, 0);
const mut1 = mutateVisionStarter(base, 1);

assert(mut0 === base || mut0.startsWith("To"), `Seed 0 returns valid starter (got: "${mut0.slice(0, 40)}")`);
assert(mut1.startsWith("To"), `Seed 1 returns valid starter`);
assert(scoreVision(mut1).score >= 90, `Mutated vision still scores ≥90 (score=${scoreVision(mut1).score})`);
console.log(`\n  Original : "${base.slice(0, 60)}…"`);
console.log(`  Mutated  : "${mut1.slice(0, 60)}…" (score=${scoreVision(mut1).score})`);

// ────────────────────────────────────────────────────────────────────────────
// 7. Multi-priority stress test

section("7. Multi-priority stress — 3 programs × 5 priority combos");

const PRIORITY_COMBOS = [
  ["Innovation-driven education"],
  ["Ethics and integrity", "Sustainable development"],
  ["Global Engineering Excellence", "Globally competitive graduates", "Human-centric engineering"],
  ["Responsible innovation", "Professional engineering standards"],
  ALL_PRIORITIES,
];

let stressFailed = 0;
for (const prog of ["Civil Engineering", "Chemical Engineering", "Electronics and Communication Engineering"]) {
  for (const combo of PRIORITY_COMBOS) {
    for (let ti = 0; ti < 5; ti++) {
      const v = buildGrammarVision(prog, combo, ti);
      const s = scoreVision(v);
      if (s.score < 95 || s.hardFailures.length > 0) {
        stressFailed++;
        console.error(`  FAIL prog="${prog}" template=${ti} combo=${combo.slice(0, 2).join("+")}`);
        console.error(`       ${v}`);
        console.error(`       score=${s.score} failures=${s.hardFailures.join(", ")}`);
      }
    }
  }
}
assert(stressFailed === 0, `All 75 stress-test combinations score ≥95 (${stressFailed} failed)`);

// ────────────────────────────────────────────────────────────────────────────
// 8. Live API test (if server running)

section("8. Live API health check (localhost:3000)");

async function testLiveAPI() {
  try {
    const res = await fetch("http://localhost:3000/api/generate/vision-mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:             "vision",
        priorities:       ["Innovation-driven education", "Ethics and integrity"],
        count:            3,
        programName:      "Computer Engineering",
        institutionContext: {},
      }),
    });
    const data = await res.json() as { results?: string[] };
    const results = data.results ?? [];

    assert(res.ok, `POST /api/generate/vision-mission returns 200 (got ${res.status})`);
    assert(results.length === 3, `Returns 3 visions (got ${results.length})`);

    let apiScoreFailed = 0;
    for (const v of results) {
      const s = scoreVision(v);
      if (s.score < 90) apiScoreFailed++;
      console.log(`    score=${s.score} "${v.slice(0, 60)}…"`);
    }
    assert(apiScoreFailed === 0, `All API visions score ≥90 (${apiScoreFailed} failed)`);
  } catch (e) {
    console.log(`  ⚠️  Server not reachable at localhost:3000 — skipping live API test`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Run async tests then summarize

async function main() {
  await testAgent();
  await testLiveAPI();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Results: ${totalPassed} passed, ${totalFailed} failed / ${totalPassed + totalFailed} total`);
  console.log("═".repeat(60));

  if (totalFailed > 0) {
    console.error(`\n❌ ${totalFailed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${totalPassed} tests passed.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
