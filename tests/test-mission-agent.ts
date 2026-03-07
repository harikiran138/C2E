/**
 * tests/test-mission-agent.ts
 * Mission Agent integration tests.
 *
 * Run: npx tsx tests/test-mission-agent.ts
 */

import { scoreMission, MISSION_APPROVAL_THRESHOLD } from "../lib/ai/mission-scoring";
import { buildGrammarMission, getAllGrammarMissions, MISSION_TEMPLATE_COUNT } from "../lib/ai/mission-template-engine";
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

// ── 1. Grammar Templates ──────────────────────────────────────────────────────

section("1. Mission Template Engine — all 6 templates");

const PROGRAMS = ["Computer Science", "Electrical Engineering", "Electronics and Communication Engineering"];

let gridFailed = 0;
for (const prog of PROGRAMS) {
  const missions = getAllGrammarMissions(prog);
  assert(missions.length === MISSION_TEMPLATE_COUNT, `${prog}: returns ${MISSION_TEMPLATE_COUNT} missions (got ${missions.length})`);

  for (let i = 0; i < missions.length; i++) {
    const mission = missions[i];
    scoreMission(mission, "").then((s) => {
      if (s.score < MISSION_APPROVAL_THRESHOLD || s.hardFailures.length > 0) {
        gridFailed++;
        console.error(`    FAIL prog="${prog}" template=${i}: ${mission.slice(0, 80)}...`);
        console.error(`         score=${s.score} failures=${s.hardFailures.join(", ")}`);
      }
    });
  }
}

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

// ── 3. Mission Agent — template-only mode ─────────────────────────────────────

section("3. Mission Agent — template-only (no Gemini key)");

async function testAgent() {
  const result = await missionAgent({
    programName:   "Computer Engineering",
    priorities:    ["Innovation-driven education", "Ethics and integrity"],
    count:         3,
    visionRef:     "",
    geminiApiKey:  undefined,
  });

  assert(result.missions.length === 3, `Agent returns exactly 3 missions (got ${result.missions.length})`);
  assert(result.ranked.length === 3, `Ranked list has 3 entries`);
  assert(
    result.ranked[0].finalScore >= result.ranked[result.ranked.length - 1].finalScore,
    "Ranked in descending order",
  );

  for (const m of result.missions) {
    const sentences = m.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert(sentences >= 3 && sentences <= 4, `Mission has 3-4 sentences (got ${sentences}): ${m.slice(0, 60)}…`);
  }

  console.log("\n  Sample outputs:");
  result.missions.forEach((m, i) => {
    console.log(`    [${i + 1}] ranked_score=${result.ranked[i].finalScore.toFixed(1)} "${m.slice(0, 70)}…"`);
  });
}

// ── 4. Template-only mode produces valid missions ─────────────────────────────

section("4. Grammar template completeness");

async function testTemplates() {
  for (let i = 0; i < MISSION_TEMPLATE_COUNT; i++) {
    const m = buildGrammarMission("Computer Engineering", i);
    const s = await scoreMission(m, "");
    assert(
      s.score >= MISSION_APPROVAL_THRESHOLD && s.hardFailures.length === 0,
      `Template ${i} scores ≥${MISSION_APPROVAL_THRESHOLD} (got ${s.score})`,
      s.hardFailures.join(", "),
    );
  }
}

// ── Run async tests then verify grid results ──────────────────────────────────

async function main() {
  await testScoring();
  await testAgent();
  await testTemplates();

  // Verify grid results (small delay to let async scoreMission calls settle)
  await new Promise((r) => setTimeout(r, 500));
  assert(gridFailed === 0, `All ${PROGRAMS.length * MISSION_TEMPLATE_COUNT} grammar templates score ≥${MISSION_APPROVAL_THRESHOLD}`, `${gridFailed} failed`);

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
