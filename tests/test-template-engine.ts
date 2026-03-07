/**
 * tests/test-template-engine.ts
 * Verifies that ALL grammar template × priority combinations score 100/100.
 *
 * Run: npx ts-node --project tsconfig.json tests/test-template-engine.ts
 */

import { getAllGrammarVariants, PRIORITY_PILLAR_BANK } from "../lib/ai/template-engine";
import { scoreVision } from "../lib/ai/scoring";

const PROGRAM_NAMES = [
  "Computer Science",                          // 2 words
  "Electronics & Communication Engineering",   // 4 words, no "and"
  "Electronics and Communication Engineering", // 4 words WITH "and" — safeProgram must replace
];

const ALL_PRIORITIES = Object.keys(PRIORITY_PILLAR_BANK);

let passed  = 0;
let failed  = 0;
const errors: string[] = [];

for (const programName of PROGRAM_NAMES) {
  const variants = getAllGrammarVariants(programName, ALL_PRIORITIES);

  for (const [i, statement] of variants.entries()) {
    const result = scoreVision(statement);

    if (result.score >= 95 && result.hardFailures.length === 0) {
      passed++;
    } else {
      failed++;
      errors.push(
        `[FAIL] program="${programName}" variant=${i}\n` +
        `  Statement: ${statement}\n` +
        `  Score: ${result.score}/100\n` +
        `  HardFailures: ${result.hardFailures.join(", ") || "(none)"}\n` +
        `  Breakdown: ${JSON.stringify(result.breakdown)}`,
      );
    }
  }
}

// ── Priority-specific spot checks ─────────────────────────────────────────────
const SPOT_CHECKS: Array<{ label: string; priorities: string[]; program: string }> = [
  {
    label: "Single priority — Global Engineering Excellence",
    priorities: ["Global Engineering Excellence"],
    program: "Civil Engineering",
  },
  {
    label: "Two priorities",
    priorities: ["Ethics and integrity", "Innovation-driven education"],
    program: "Mechanical Engineering",
  },
  {
    label: "All 13 priorities (stress test)",
    priorities: ALL_PRIORITIES,
    program: "Chemical Engineering",
  },
  {
    label: "Program with 'and' — pillar-count safety",
    priorities: ["Sustainable development"],
    program: "Electronics and Communication Engineering",
  },
];

console.log("\n── Spot Checks ──────────────────────────────────────────────\n");
for (const { label, priorities, program } of SPOT_CHECKS) {
  const variants = getAllGrammarVariants(program, priorities);
  const allPass  = variants.every(
    (v) => scoreVision(v).score >= 95 && scoreVision(v).hardFailures.length === 0,
  );
  const firstScore = scoreVision(variants[0]);
  console.log(`${allPass ? "✅" : "❌"} ${label}`);
  console.log(`   [${variants.length} variants] First: "${variants[0]}"`);
  console.log(`   Score: ${firstScore.score}/100  HardFailures: [${firstScore.hardFailures.join(", ") || "none"}]\n`);
  if (!allPass) {
    for (const v of variants) {
      const s = scoreVision(v);
      if (s.score < 95 || s.hardFailures.length > 0) {
        errors.push(`Spot-check FAIL (${label}): ${v}\n  Score: ${s.score}, Failures: ${s.hardFailures.join(", ")}`);
        failed++;
      } else {
        passed++;
      }
    }
  } else {
    passed += variants.length;
  }
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("── Full Grid Results ────────────────────────────────────────");
if (errors.length > 0) {
  errors.forEach((e) => console.error(e));
}
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${passed} tests passed — grammar model is sound.`);
}
