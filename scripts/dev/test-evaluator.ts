import { psoAgent } from "./lib/ai/pso-agent";

async function testEvaluator() {
  console.log("🚀 Testing Master Evaluator v2 Pipeline...");
  
  const result = await psoAgent({
    programName: "Robotics and Automation Engineering",
    count: 2, // Testing dynamic count (should NOT force 3)
    mode: "strict"
  });

  console.log("\n--- FINAL RESULTS ---");
  console.log(`Success: ${result.success}`);
  console.log(`Final Count: ${result.results.length} (Expected: 2)`);
  console.log(`Attempts: ${result.attempts}`);
  console.log(`Final Score: ${result.meta?.score}`);
  
  result.results.forEach((p, i) => {
    console.log(`\nPSO ${i+1}: "${p.statement}"`);
  });

  if (result.validation?.globalIssues.length) {
    console.log("\nGlobal Issues Detected:");
    result.validation.globalIssues.forEach(issue => console.log(`- ${issue}`));
  }
}

testEvaluator().catch(console.error);
