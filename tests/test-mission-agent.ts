/**
 * tests/test-mission-agent.ts
 * Mission Agent integration tests.
 *
 * Run: npx tsx tests/test-mission-agent.ts
 */

import { scoreMission, MISSION_APPROVAL_THRESHOLD } from "../lib/ai/mission-scoring";
import { missionAgent } from "../lib/ai/mission-agent";

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

// ── 1. Scoping — templates are removed in 100% AI version ──────────────────────
section("1. Mission Generation — 100% AI (Templates Removed)");
console.log("  Skipping template-specific tests. Moving to scoring and agent logic.");

// ── 2. Scoring — per-rule verification ───────────────────────────────────────

section("2. Mission Scoring — per-rule verification");

const GOOD_MISSIONS = [
  "Deliver a rigorous Computer Engineering curriculum through outcome-based education, continuous assessment, and evidence-driven academic improvement. Strengthen research engagement, industry collaboration, and applied practice to align graduates with career and accreditation standards. Foster ethical responsibility, innovation capability, and societal awareness to sustain long-term professional growth and community impact.",
  "Advance Electrical Engineering through research-driven inquiry, applied industry partnerships, hands-on laboratory engagement, and collaborative professional learning. Implement outcome-based curriculum design, continuous academic review, and evidence-based quality improvement across all program activities. Promote ethical conduct, sustainable practices, and societal responsibility among graduates to sustain institutional growth and community impact.",
];

async function testScoring() {
  for (const m of GOOD_MISSIONS) {
    const s = await scoreMission(m, "");
    assert(s.score >= MISSION_APPROVAL_THRESHOLD, `Known-good mission scores ≥${MISSION_APPROVAL_THRESHOLD}: ${m.slice(0, 55)}…`, `score=${s.score}`);
    assert(s.hardFailures.length === 0, `No hard failures`, s.hardFailures.join(", "));
  }

  // Bad: only 2 sentences
  const BAD_SENTENCES = "Deliver rigorous curriculum through outcome-based education. Foster ethical responsibility and societal awareness.";
  const badSentResult = await scoreMission(BAD_SENTENCES, "");
  assert(
    badSentResult.hardFailures.some((f) => f.includes("sentence count")),
    "2 sentences triggers sentence count hard failure",
  );

  // Bad: no operational verbs (only adjective-driven)
  const BAD_VERBS = "The curriculum is rigorous and academic. Industry standards are important. Ethics matter greatly.";
  const badVerbResult = await scoreMission(BAD_VERBS, "");
  assert(
    badVerbResult.hardFailures.some((f) => f.includes("operational verbs")),
    "No operational verbs triggers hard failure",
  );

  // Bad: marketing language
  const BAD_MARKETING = "Deliver world-class curriculum through outcome-based education, continuous improvement. Strengthen research engagement and industry collaboration. Foster ethical responsibility.";
  const badMktResult = await scoreMission(BAD_MARKETING, "");
  assert(
    badMktResult.hardFailures.some((f) => f.includes("marketing")),
    "Marketing term 'world-class' triggers hard failure",
  );
}

// ── 3. Mission Agent — AI-mocked mode ─────────────────────────────────────

section("3. Mission Agent — AI Mocked logic check");

async function testAgent() {
  // Mock global fetch for Gemini
  const realFetch = global.fetch;
  global.fetch = (async (url: string) => {
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify([
                "Deliver a rigorous Computer Engineering curriculum through outcome-based education, continuous assessment, and evidence-driven academic improvement. Mock AI variant 1.",
                "Advance Electrical Engineering through research-driven inquiry, applied industry partnerships, hands-on laboratory engagement. Mock AI variant 2.",
                "Foster ethical responsibility, innovation capability, and societal awareness to sustain long-term professional growth. Mock AI variant 3."
              ])
            }]
          }
        }]
      })
    };
  }) as any;

  try {
    const result = await missionAgent({
      programName:   "Computer Engineering",
      priorities:    ["Innovation-driven education", "Ethics and integrity"],
      count:         2,
      visionRef:     "",
      geminiApiKey:  "mock-key",
    });

    assert(result.missions.length === 2, `Agent returns exactly 2 missions (requested 2, got ${result.missions.length})`);
    assert(result.ranked.length === 2, `Ranked list has 2 entries`);
    assert(
      result.ranked[0].finalScore >= result.ranked[1].finalScore,
      "Ranked in descending order",
    );

    console.log("\n  Sample outputs:");
    result.missions.forEach((m, i) => {
      console.log(`    [${i + 1}] ranked_score=${result.ranked[i].finalScore.toFixed(1)} "${m.slice(0, 70)}…"`);
    });
  } finally {
    global.fetch = realFetch;
  }
}

// ── 4. Template tests removed ─────────────────────────────

section("4. AI Room for Rank/Dedup check");
console.log("  Skipping template builds. Logic verifies count slicing in Agent test.");

// ── Run async tests then verify grid results ──────────────────────────────────

async function main() {
  await testScoring();
  await testAgent();

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
