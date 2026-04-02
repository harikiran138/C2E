import "dotenv/config";
import { visionAgent } from "../lib/ai/vision-agent";
import { peoAgent } from "../lib/ai/peo-agent";
import { resolveProgramAcademicContext } from "../lib/curriculum/program-context";
import { callAI } from "../lib/curriculum/ai-model-router";

async function runTestCase(id: string, programName: string, programId: string) {
  console.log(`\n🚀 Testing Case Study: ${id} (${programName})`);
  
  try {
    // 1. Context Resolution
    console.log(`--- Step 1: Resolving Academic Context ---`);
    const { context, errors } = await resolveProgramAcademicContext(programId);
    if (errors.length > 0) {
      console.warn(`⚠️ Context resolved with errors for ${programId}:`, errors);
    }
    console.log(`✅ Contact attributes found:`, Object.keys(context || {}));

    // 2. Vision Generation
    console.log(`--- Step 2: Testing Vision Agent ---`);
    const vision = await visionAgent({
      programName,
      institution_id: "test-inst",
      program_id: programId,
      count: 1
    });
    console.log(`✅ Vision Sample: "${vision.visions[0]?.statement}"`);

    // 3. PEO Generation
    console.log(`--- Step 3: Testing PEO Agent ---`);
    const peo = await peoAgent({
      programName,
      count: 1
    });
    console.log(`✅ PEO Sample: "${peo.peos[0]}"`);

    console.log(`✨ Case Study ${id} Verified!`);
  } catch (error: any) {
    console.error(`❌ Case Study ${id} Failed:`, error.message);
  }
}

async function main() {
  console.log("🛠️ Starting AI Lifecycle Final Verification...");

  // 0. Connectivity check
  console.log("\n--- Step 0: Testing OpenRouter Connectivity ---");
  try {
    const ping = await callAI("Hello AI", "bulk");
    console.log(`✅ AI Response: "${ping}"`);
  } catch (err: any) {
    console.error(`❌ Connectivity Failed:`, err.message);
    console.warn("⚠️ Warning: OpenRouter credits might be 0. Results below may be 'undefined'.");
  }

  // Case Studies from DB
  const CASES = [
    { id: "AI_ENGINEERING", name: "B.Tech Artificial Intelligence and Data Science", uuid: "d75389ad-0218-47fc-998b-4e7bb3391a9d" },
    { id: "SUSTAINABLE_ARCH", name: "B.Arch Sustainable Architecture", uuid: "53472bd5-4e68-494d-826b-8ed78dcc4337" },
    { id: "DIGITAL_JOURNALISM", name: "B.A. Digital Journalism", uuid: "122f0257-e0e8-4515-b575-de58f688a399" }
  ];

  for (const cs of CASES) {
    await runTestCase(cs.id, cs.name, cs.uuid);
  }

  console.log("\n🏁 Final Verification Complete.");
}

main().catch(console.error);
