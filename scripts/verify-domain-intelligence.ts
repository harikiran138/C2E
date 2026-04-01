import { inferDomains, getDomainContextString, needsLLMClassification } from "../lib/ai/domain-inference";
import { psoAgent } from "../lib/ai/pso-agent";

async function runTests() {
  console.log("=== DOMAIN INFERENCE TEST SUITE ===");

  const testCases = [
    { name: "Civil Engineering", expected: "Civil Engineering" },
    { name: "B.Tech in CSE", expected: "Computer Science & Engineering" },
    { name: "Mechatronics", expected: ["Mechanical Engineering", "Electrical Engineering", "Robotics & Automation"] },
    { name: "Advanced Agriculture Tech", expected: "fallback" }
  ];

  for (const tc of testCases) {
    const res = inferDomains(tc.name);
    console.log(`\nProgram: "${tc.name}"`);
    console.log(`- Strategy: ${res.strategy}`);
    console.log(`- Domains: ${res.domains.join(", ")}`);
    console.log(`- Confidence: ${res.confidence}`);
    
    if (Array.isArray(tc.expected)) {
      const match = tc.expected.every(d => res.domains.includes(d));
      console.log(match ? "✅ HYBRID MATCH" : "❌ HYBRID MISMATCH");
    } else if (tc.expected === "fallback") {
      console.log(res.confidence === "fallback" ? "✅ FALLBACK SIGNALED" : "❌ FALLBACK FAILED");
    } else {
      console.log(res.domains.includes(tc.expected) ? "✅ EXACT/FUZZY MATCH" : "❌ MATCH FAILED");
    }
  }

  console.log("\n=== PSO AGENT HYBRID TEST ===");
  const hybridResult = await psoAgent({
    programName: "Mechatronics",
    count: 3,
    mode: "standard"
  });

  console.log(`\nPSO Agent Hybrid Result (Mechatronics):`);
  console.log(`Success: ${hybridResult.success}`);
  console.log(`Score: ${hybridResult.meta?.score}`);
  hybridResult.results.forEach((r, i) => {
    console.log(`PSO ${i+1}: ${r.statement}`);
  });
}

runTests().catch(console.error);
