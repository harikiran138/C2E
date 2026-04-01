import { psoAgent } from "./lib/ai/pso-agent";

async function testEvaluator() {
  console.log("🚀 Testing Master Evaluator Pipeline...");
  
  const result = await psoAgent({
    programName: "Mechanical Engineering",
    count: 2,
    mode: "strict"
  });

  console.log("\n--- FINAL RESULTS ---");
  console.log(`Success: ${result.success}`);
  console.log(`Attempts: ${result.attempts}`);
  console.log(`Final Score: ${result.meta?.score}`);
  
  result.results.forEach((p, i) => {
    console.log(`\nPSO ${i+1}: "${p.statement}"`);
    console.log(`ABET: ${p.abetMappings.join(", ")}`);
  });

  if (result.validation?.globalIssues.length) {
    console.log("\nGlobal Issues:");
    result.validation.globalIssues.forEach(issue => console.log(`- ${issue}`));
  }
}

testEvaluator().catch(console.error);
