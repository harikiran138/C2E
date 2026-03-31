import assert from "node:assert/strict";
import { psoAgent } from "../lib/ai/pso-agent";

async function main() {
  const result = await psoAgent({
    programName: "Mechanical Engineering",
    count: 3,
    selectedSocieties: {
      lead: ["American Society of Mechanical Engineers"],
      co_lead: [],
      cooperating: ["Society of Manufacturing Engineers"],
    },
  });

  assert.equal(result.results.length, 3, "should generate the requested number of PSOs");
  assert.equal(result.validation?.passed, true, "source validation should pass");

  console.log("PSO agent test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
