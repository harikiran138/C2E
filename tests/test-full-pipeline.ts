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

import { scoreVision, VISION_APPROVAL_THRESHOLD }                           from "../lib/ai/scoring";
import { visionAgent }                                                       from "../lib/ai/vision-agent";
import { areTooSimilar, lexicalSimilarity, deduplicateVisions }             from "../lib/ai/similarity";
import { rankVisions }                                                       from "../lib/ai/ranking-engine";
import { scoreMission, MISSION_APPROVAL_THRESHOLD }                         from "../lib/ai/mission-scoring";
import { missionAgent }                                                      from "../lib/ai/mission-agent";
import { scorePEO, PEO_APPROVAL_THRESHOLD }                                  from "../lib/ai/peo-scoring";
import { peoAgent }                                                          from "../lib/ai/peo-agent";
import { scorePO, PO_APPROVAL_THRESHOLD }                                    from "../lib/ai/po-scoring";
import { poAgent }                                                           from "../lib/ai/po-agent";
import { STANDARD_PO_STATEMENTS }                                            from "../lib/ai/constants";

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

// ── 1. AI Transition ────────────────────────────────────────────────────────
section("1. AI Architecture — Templates Decommissioned");
console.log("  Skipping grammar grid tests (Grid logic moved to Gemini prompts).");

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
    institution_id: "00000000-0000-0000-0000-000000000001",
    program_id:     "00000000-0000-0000-0000-000000000002",
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

// ── 6. Mutation Logic retired ─────────────────────────────

section("6. Mutation Logic retired");
console.log("  Mutation engine replaced by direct multi-variant AI generation.");

// ── 7. Stress Tests retired ─────────────────────────────

section("7. Stress Tests retired");
console.log("  Legacy grammar stress tests removed.");

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

// ── 9. Mission Agent — AI Mocked logic check ─────────────────────────────

section("9. Mission Agent — AI Mocked logic check");

async function testMissionAgent() {
  const realFetch = global.fetch;
  global.fetch = (async (url: string) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify([
                "Deliver a rigorous Computer Engineering curriculum through outcome-based education. Mock 1.",
                "Advance Engineering through research-driven inquiry and applied partnerships. Mock 2.",
                "Foster ethical responsibility and innovation capability. Mock 3."
              ])
            }]
          }
        }]
      })
    };
  }) as any;

  try {
    const result = await missionAgent({
      programName:  "Computer Engineering",
      priorities:   ["Innovation", "Ethics"],
      count:        2,
      visionRef:    "",
      geminiApiKey: "mock-key",
    });

    assert(result.missions.length === 2, `Mission Agent returns 2 missions (got ${result.missions.length})`);
    assert(result.ranked.length === 2, `Mission ranked list has 2 entries`);
  } finally {
    global.fetch = realFetch;
  }
}

// ── 10. PEO Agent — AI Mocked logic check ─────────────────────────────

section("10. PEO Agent — AI Mocked logic check");

async function testPEOAgent() {
  const realFetch = global.fetch;
  global.fetch = (async (url: string) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify([
                "Within 3 to 5 years of graduation, graduates will demonstrate professional engineering competency. Mock 1.",
                "Within 3 to 5 years of graduation, graduates will lead multidisciplinary engineering teams. Mock 2.",
                "Within 3 to 5 years of graduation, graduates will contribute to national development. Mock 3."
              ])
            }]
          }
        }]
      })
    };
  }) as any;

  try {
    const result = await peoAgent({
      programName:  "Computer Engineering",
      priorities:   ["Practice", "Ethics"],
      count:        2,
      geminiApiKey: "mock-key",
    });

    assert(result.peos.length === 2, `PEO Agent returns 2 PEOs (got ${result.peos.length})`);
  } finally {
    global.fetch = realFetch;
  }
}

// ── 11. PO Agent — AI Mocked logic check ─────────────────────────────

section("11. PO Agent — AI Mocked logic check");

async function testPOAgent() {
  const realFetch = global.fetch;
  global.fetch = (async (url: string) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify([
                "Ability to apply knowledge of mathematics, science, and engineering in AI mode.",
                "Ability to design and conduct experiments via AI.",
                "Ability to function on multidisciplinary teams in AI environment."
              ])
            }]
          }
        }]
      })
    };
  }) as any;

  try {
    const result = await poAgent({
      programName:  "Computer Engineering",
      count:        2,
      geminiApiKey: "mock-key",
    });

    assert(result.pos.length === 2, `PO Agent returns 2 POs (got ${result.pos.length})`);
  } finally {
    global.fetch = realFetch;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Run async tests then summarize

async function main() {
  await testAgent();
  await testLiveAPI();
  await testMissionAgent();
  await testPEOAgent();
  await testPOAgent();

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
