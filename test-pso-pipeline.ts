import { psoAgent } from "./lib/ai/pso-agent";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const TEST_PROGRAMS = [
  { name: "Mechanical Engineering", count: 3 },
  { name: "Computer Science", count: 3 },
];

async function runTests() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env.local");
    return;
  }

  for (const prog of TEST_PROGRAMS) {
    console.log(`\n--- TESTING PROGRAM: ${prog.name} ---`);
    try {
      const result = await psoAgent({
        programName: prog.name,
        count: prog.count,
        geminiApiKey: apiKey
      });

      console.log(`✅ Success: ${result.results.length === prog.count}`);
      console.log(`📊 Validation Score: ${result.validation.sourceValidation.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`📝 Results:`);
      result.results.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));
      
      if (!result.validation.sourceValidation.passed) {
        console.log(`❌ Issues:`, result.validation.domainCoverage.missing);
      }
    } catch (e) {
      console.error(`❌ Error testing ${prog.name}:`, e);
    }
    
    console.log("Waiting 10s to avoid rate limits...");
    await sleep(10000);
  }
}

runTests();
