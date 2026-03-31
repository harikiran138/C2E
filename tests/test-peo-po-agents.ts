/**
 * tests/test-peo-po-agents.ts
 * PEO and PO Agent integration tests.
 *
 * Run: npx tsx tests/test-peo-po-agents.ts
 */

import { scorePEO, PEO_APPROVAL_THRESHOLD }               from "../lib/ai/peo-scoring";
import { peoAgent }                                        from "../lib/ai/peo-agent";
import { scorePO, PO_APPROVAL_THRESHOLD }                  from "../lib/ai/po-scoring";
import { poAgent }                                         from "../lib/ai/po-agent";
import { STANDARD_PO_STATEMENTS, PEO_PRIORITIES }           from "../lib/ai/constants";

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

// ─────────────────────────────────────────────────────────────────────────────
// PEO TESTS
// ─────────────────────────────────────────────────────────────────────────────

section("1. PEO Scoring — per-rule verification");

const REQUIRED_PREFIX = "within 3 to 5 years of graduation";

const GOOD_PEOS = [
  "Within 3 to 5 years of graduation, graduates will demonstrate professional engineering competency through technical leadership, ethical conduct, and career advancement.",
  "Within 3 to 5 years of graduation, graduates will lead multidisciplinary engineering teams, demonstrating collaborative skills, professional communication, and technical judgment.",
  "Within 3 to 5 years of graduation, graduates will contribute to national development goals through engineering practice, technological innovation, and technical leadership.",
];

for (const peo of GOOD_PEOS) {
  const s = scorePEO(peo);
  assert(s.score >= PEO_APPROVAL_THRESHOLD, `Known-good PEO scores ≥${PEO_APPROVAL_THRESHOLD}: ${peo.slice(0, 55)}…`, `score=${s.score}`);
  assert(s.hardFailures.length === 0, `No hard failures: ${peo.slice(0, 40)}…`, s.hardFailures.join(", "));
}

// Bad prefix
const BAD_PREFIX_PEO = "After graduating, students will apply engineering knowledge in practice.";
const badPrefixResult = scorePEO(BAD_PREFIX_PEO);
assert(
  badPrefixResult.hardFailures.some((f) => f.includes("Within 3 to 5 years")),
  "Wrong prefix triggers hard failure",
);

// Bad word count (too short)
const BAD_SHORT_PEO = "Within 3 to 5 years of graduation, graduates will apply engineering.";
const badShortResult = scorePEO(BAD_SHORT_PEO);
assert(
  badShortResult.hardFailures.some((f) => f.includes("word count below 20")),
  "Short PEO triggers word count hard failure",
);

// Bad word count (too long)
const BAD_LONG_PEO = "Within 3 to 5 years of graduation, graduates will apply engineering knowledge, lead professional teams, communicate effectively, design innovative systems, manage complex projects, and contribute to sustainable development through evidence-based practice.";
const badLongResult = scorePEO(BAD_LONG_PEO);
assert(
  badLongResult.hardFailures.some((f) => f.includes("word count above 35")),
  "Long PEO triggers word count hard failure",
);

section("2. PEO Generation — AI-only mode (Templates removed)");
console.log("  Skipping template-specific tests. Moving to agent logic check.");

section("3. PEO Agent — AI Mocked logic check");

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
                "Within 3 to 5 years of graduation, graduates will demonstrate professional engineering competency through technical leadership, ethical conduct, and career advancement.",
                "Within 3 to 5 years of graduation, graduates will lead multidisciplinary engineering teams, demonstrating collaborative skills.",
                "Within 3 to 5 years of graduation, graduates will contribute to national development goals through engineering practice."
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
      priorities:   ["Professional Practice", "Ethics and Society", "Leadership and Teamwork"],
      count:        2,
      geminiApiKey: "mock-key",
    });

    assert(result.peos.length === 2, `PEO Agent returns exactly 2 PEOs (got ${result.peos.length})`);
    assert(result.ranked.length === 2, `Ranked list has 2 entries`);

    for (const peo of result.peos) {
      assert(
        peo.toLowerCase().startsWith(REQUIRED_PREFIX),
        `PEO starts with required prefix: "${peo.slice(0, 50)}…"`,
      );
    }
  } finally {
    global.fetch = realFetch;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PO TESTS
// ─────────────────────────────────────────────────────────────────────────────

section("4. PO Scoring — per-rule verification");

const GOOD_POS = STANDARD_PO_STATEMENTS.slice(0, 5);

for (const po of GOOD_POS) {
  const s = scorePO(po);
  assert(s.score >= PO_APPROVAL_THRESHOLD, `Standard PO scores ≥${PO_APPROVAL_THRESHOLD}: ${po.slice(0, 55)}…`, `score=${s.score}`);
  assert(s.hardFailures.length === 0, `No hard failures: ${po.slice(0, 40)}…`, s.hardFailures.join(", "));
}

// Bad prefix
const BAD_PO_PREFIX = "Students should be able to design engineering systems.";
const badPOPrefixResult = scorePO(BAD_PO_PREFIX);
assert(
  badPOPrefixResult.hardFailures.some((f) => f.includes("Ability to")),
  "Wrong PO prefix triggers hard failure",
);

// Bad: too long
const BAD_PO_LONG = "Ability to design, implement, analyze, evaluate, and communicate complex engineering systems while considering ethical, social, environmental, and economic factors.";
const badPOLongResult = scorePO(BAD_PO_LONG);
assert(
  badPOLongResult.hardFailures.some((f) => f.includes("word count above 25")),
  "Long PO triggers word count hard failure",
);

section("5. PO Generation — AI-only mode (Templates removed)");
console.log("  PO-specific tests removed.");

section("6. PO Agent — AI Mocked logic check");

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
                "Ability to apply knowledge of mathematics, science, and engineering in mock AI variant.",
                "Ability to design and conduct experiments with simulated AI data.",
                "Ability to communicate effectively in professional engineering settings."
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

    assert(result.pos.length === 2, `PO Agent returns exactly 2 POs (requested 2, got ${result.pos.length})`);
    assert(result.ranked.length === 2, `Ranked list has 2 entries`);

    for (const po of result.pos) {
      assert(
        po.toLowerCase().startsWith("ability to") || po.toLowerCase().startsWith("an ability to"),
        `PO starts with valid prefix: "${po.slice(0, 50)}…"`,
      );
    }
  } finally {
    global.fetch = realFetch;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
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
