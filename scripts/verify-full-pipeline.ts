/**
 * scripts/verify-full-pipeline.ts
 * Verifies that all AI agents (Mission, Vision, PEO, PO, PSO) are working
 * with the new robust Zod parsing and normalization logic.
 */

import "dotenv/config";
import { missionAgent } from "../lib/ai/mission-agent";
import { visionAgent }  from "../lib/ai/vision-agent";
import { peoAgent }     from "../lib/ai/peo-agent";
import { poAgent }      from "../lib/ai/po-agent";
import { psoAgent }     from "../lib/ai/pso-agent";

async function runVerification() {
  console.log("🚀 Starting Full Pipeline Verification...");

  const testParams = {
    programName: "Computer Science and Engineering",
    institutionName: "KITS Engineering College",
    priorities: ["Technical Excellence", "Ethics", "Global Leadership"],
    count: 2,
  };

  try {
    // 1. Vision Agent
    console.log("\n--- Testing Vision Agent ---");
    const vision = await visionAgent(testParams);
    console.log(`✅ Vision Success: ${vision.visions.length} statements generated.`);
    console.log(`   Sample: "${vision.visions[0]}"`);

    // 2. Mission Agent
    console.log("\n--- Testing Mission Agent ---");
    const mission = await missionAgent({ ...testParams, visionRef: vision.visions[0] });
    console.log(`✅ Mission Success: ${mission.missions.length} statements generated.`);
    console.log(`   Sample: "${mission.missions[0]}"`);

    // 3. PEO Agent
    console.log("\n--- Testing PEO Agent ---");
    const peo = await peoAgent(testParams);
    console.log(`✅ PEO Success: ${peo.peos.length} objectives generated.`);
    console.log(`   Sample: "${peo.peos[0]}"`);

    // 4. PO Agent
    console.log("\n--- Testing PO Agent ---");
    const po = await poAgent(testParams);
    console.log(`✅ PO Success: ${po.pos.length} outcomes generated.`);
    console.log(`   Sample: "${po.pos[0]}"`);

    // 5. PSO Agent
    console.log("\n--- Testing PSO Agent ---");
    const pso = await psoAgent({ ...testParams, initialPSOs: peo.peos });
    console.log(`✅ PSO Success: ${pso.results.length} outcomes generated.`);
    console.log(`   Sample: "${pso.results[0].statement}"`);

    console.log("\n✨ ALL AGENTS VERIFIED SUCCESSFULLY ✨");
  } catch (error) {
    console.error("\n❌ Verification Failed!");
    console.error(error);
    process.exit(1);
  }
}

runVerification();
