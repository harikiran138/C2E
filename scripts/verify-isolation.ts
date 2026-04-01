import { resolveProgramAcademicContext } from "../lib/curriculum/program-context";
import { peoAgent } from "../lib/ai/peo-agent";
import { poAgent } from "../lib/ai/po-agent";
import { psoAgent } from "../lib/ai/pso-agent";

async function testFullPipeline() {
  const testProgramId = "96d4b29f-8557-4b71-b01f-0e122709f196"; // Use a real ID from your DB if possible
  console.log(`Starting full pipeline verification for Program ID: ${testProgramId}`);

  // 1. Resolve Context
  const { context, errors } = await resolveProgramAcademicContext(testProgramId);
  if (errors.length > 0) {
    console.error("Context resolution errors:", errors);
    return;
  }
  if (!context) {
    console.error("Context not found.");
    return;
  }

  console.log("Resolved context:", {
    programName: context.programName,
    vision: context.vision.substring(0, 50) + "...",
    mission: context.mission.substring(0, 50) + "...",
    peoCount: context.peos.length,
    poCount: context.pos.length
  });

  // 2. Test PEO Agent
  console.log("\n--- Testing PEO Agent ---");
  const peoResult = await peoAgent({
    programName: context.programName,
    count: 3,
    priorities: ["Innovation", "Ethics"],
    vision: context.vision,
    mission: context.mission
  });
  console.log(`PEO Agent success: ${peoResult.peos.length} PEOs generated.`);

  // 3. Test PO Agent
  console.log("\n--- Testing PO Agent ---");
  const poResult = await poAgent({
    programName: context.programName,
    count: 12,
    priorities: ["Design", "Analysis"],
    mission: context.mission,
    peos: context.peos
  });
  console.log(`PO Agent success: ${poResult.pos.length} POs generated.`);

  // 4. Test PSO Agent
  console.log("\n--- Testing PSO Agent ---");
  const psoResult = await psoAgent({
    programName: context.programName,
    count: 3,
    selectedSocieties: { lead: ["IEEE"], co_lead: [], cooperating: [] },
    vision: context.vision,
    mission: context.mission,
    peos: context.peos
  });
  console.log(`PSO Agent success: ${psoResult.results.length} PSOs generated.`);
}

testFullPipeline().catch(console.error);
