import "dotenv/config";
import { psoAgent } from "../lib/ai/pso-agent";

async function runTest(testName: string, params: any) {
  console.log(`\n=== TEST: ${testName} ===`);
  try {
    const result = await psoAgent(params);
    console.log(`Success: ${result.success}`);
    console.log(`Score: ${result.meta?.score}`);
    console.log(`Compliance: ${result.meta?.compliance}`);
    console.log(`Attempts: ${result.attempts}`);
    console.log(`Coverage Analysis:`, JSON.stringify(result.meta?.coverage, null, 2));
    
    console.log("\nFINAL PSOs:");
    result.results.forEach((p, i) => {
      console.log(`${i + 1}. [${p.abetMappings.join(", ")}] ${p.statement}`);
    });
  } catch (e: any) {
    console.error(`Test failed: ${e.message}`);
  }
}

async function main() {
  console.log("Starting PSO v4.0 Verification...");

  // Case 1: Fresh Generation for Hybrid Program
  await runTest("Mechatronics (Hybrid)", {
    programName: "Mechatronics Engineering",
    count: 3,
    mode: "strict"
  });

  // Case 2: Refinement with Domain Gap
  // Existing PSOs only cover structural domain
  await runTest("Civil Engineering (Gap Detection)", {
    programName: "Civil Engineering",
    count: 3,
    initialPSOs: [
      "Graduates will be able to design reinforced concrete and steel structures for high-rise buildings.",
      "Graduates will be able to analyze seismic behavior of residential masonry structures."
    ],
    mode: "standard"
  });

  // Case 3: Industry-Ready CSE
  await runTest("CSE (Industry Mode)", {
    programName: "Computer Science and Engineering",
    count: 3,
    mode: "industry",
    emergingAreas: ["Cloud-Native Development", "DevSecOps"]
  });
}

main().catch(console.error);
