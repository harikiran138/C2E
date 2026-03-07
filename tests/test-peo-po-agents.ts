/**
 * tests/test-peo-po-agents.ts
 * PEO and PO Agent integration tests.
 *
 * Run: npx tsx tests/test-peo-po-agents.ts
 */

import { scorePEO, PEO_APPROVAL_THRESHOLD }               from "../lib/ai/peo-scoring";
import { buildPEOGrammar, getAllPEOVariants, PEO_PRIORITY_BANK, PEO_PRIORITIES } from "../lib/ai/peo-template-engine";
import { peoAgent }                                        from "../lib/ai/peo-agent";
import { scorePO, PO_APPROVAL_THRESHOLD }                  from "../lib/ai/po-scoring";
import { buildStandardPO, STANDARD_PO_STATEMENTS, CUSTOM_PO_TEMPLATES } from "../lib/ai/po-template-engine";
import { poAgent }                                         from "../lib/ai/po-agent";

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

section("2. PEO Template Engine — all priorities");

let peoFailed = 0;
for (const priority of PEO_PRIORITIES) {
  const phrases = PEO_PRIORITY_BANK[priority];
  for (let v = 0; v < phrases.length; v++) {
    const peo = buildPEOGrammar(priority, v);
    const s   = scorePEO(peo);
    assert(
      peo.toLowerCase().startsWith(REQUIRED_PREFIX),
      `Priority="${priority}" v=${v} starts with required prefix`,
    );
    if (s.score < PEO_APPROVAL_THRESHOLD || s.hardFailures.length > 0) {
      peoFailed++;
      console.error(`    FAIL priority="${priority}" variant=${v}: ${peo}`);
      console.error(`         score=${s.score} failures=${s.hardFailures.join(", ")}`);
    }
  }
}
assert(peoFailed === 0, `All PEO grammar variants score ≥${PEO_APPROVAL_THRESHOLD} (${peoFailed} failed)`);

section("3. PEO Agent — template-only mode");

async function testPEOAgent() {
  const result = await peoAgent({
    programName:  "Computer Engineering",
    priorities:   ["Professional Practice", "Ethics and Society", "Leadership and Teamwork"],
    count:        3,
    geminiApiKey: undefined,
  });

  assert(result.peos.length === 3, `PEO Agent returns 3 PEOs (got ${result.peos.length})`);
  assert(result.ranked.length === 3, `Ranked list has 3 entries`);
  assert(
    result.ranked[0].finalScore >= result.ranked[result.ranked.length - 1].finalScore,
    "PEOs ranked in descending order",
  );

  for (const peo of result.peos) {
    assert(
      peo.toLowerCase().startsWith(REQUIRED_PREFIX),
      `PEO starts with required prefix: "${peo.slice(0, 50)}…"`,
    );
    const words = peo.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean).length;
    assert(
      words >= 20 && words <= 35,
      `PEO word count 20–35 (got ${words}): "${peo.slice(0, 50)}…"`,
    );
    const s = scorePEO(peo);
    assert(s.score >= PEO_APPROVAL_THRESHOLD, `PEO score ≥${PEO_APPROVAL_THRESHOLD} (got ${s.score})`);
  }

  console.log("\n  PEO outputs:");
  result.peos.forEach((p, i) => {
    console.log(`    [${i + 1}] score=${scorePEO(p).score} "${p.slice(0, 75)}…"`);
  });
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

section("5. PO Template Engine — all 12 standard POs");

for (let i = 0; i < STANDARD_PO_STATEMENTS.length; i++) {
  const po = buildStandardPO(i);
  const s  = scorePO(po);
  assert(
    s.score >= PO_APPROVAL_THRESHOLD && s.hardFailures.length === 0,
    `Standard PO ${i + 1} scores ≥${PO_APPROVAL_THRESHOLD} (got ${s.score})`,
    s.hardFailures.join(", "),
  );
  assert(
    po.toLowerCase().startsWith("ability to"),
    `Standard PO ${i + 1} starts with "Ability to"`,
  );
  const words = po.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean).length;
  assert(words <= 25, `Standard PO ${i + 1} ≤25 words (got ${words})`);
}

// Custom templates
for (const [theme, statements] of Object.entries(CUSTOM_PO_TEMPLATES)) {
  for (const po of statements) {
    const s = scorePO(po);
    assert(
      s.score >= PO_APPROVAL_THRESHOLD,
      `Custom PO theme="${theme}" scores ≥${PO_APPROVAL_THRESHOLD} (got ${s.score})`,
      `"${po.slice(0, 50)}…" failures: ${s.hardFailures.join(", ")}`,
    );
  }
}

section("6. PO Agent — template-only mode");

async function testPOAgent() {
  const result = await poAgent({
    programName:  "Computer Engineering",
    count:        5,
    geminiApiKey: undefined,
  });

  assert(result.pos.length === 5, `PO Agent returns 5 POs (got ${result.pos.length})`);
  assert(result.ranked.length === 5, `Ranked list has 5 entries`);

  for (const po of result.pos) {
    assert(
      po.toLowerCase().startsWith("ability to") || po.toLowerCase().startsWith("an ability to"),
      `PO starts with valid prefix: "${po.slice(0, 50)}…"`,
    );
    const words = po.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean).length;
    assert(words <= 25, `PO ≤25 words (got ${words}): "${po.slice(0, 50)}…"`);
    const s = scorePO(po);
    assert(s.score >= PO_APPROVAL_THRESHOLD, `PO score ≥${PO_APPROVAL_THRESHOLD} (got ${s.score})`);
  }

  console.log("\n  PO outputs:");
  result.pos.forEach((p, i) => {
    console.log(`    [${i + 1}] score=${scorePO(p).score} "${p}"`);
  });
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
