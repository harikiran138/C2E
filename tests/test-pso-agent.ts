import assert from "node:assert/strict";
import { psoAgent } from "../lib/ai/pso-agent";

async function main() {
  const result = await psoAgent({
    programName: "Mechanical Engineering",
    count: 3,
    selectedSocieties: {
      lead: ["American Society of Mechanical Engineers"],
      cooperating: ["Society of Manufacturing Engineers"],
    },
  });

  assert.equal(result.results.length, 3, "should generate the requested number of PSOs");
  assert.equal(result.validation.sourceValidation.passed, true, "source validation should pass");
  assert.equal(result.validation.domainCoverage.passed, true, "domain coverage should pass");
  assert.equal(result.validation.actionVerbCheck.passed, true, "action verb check should pass");
  assert.equal(result.validation.abetMappingCheck.passed, true, "ABET mapping check should pass");
  assert.equal(result.validation.uniquenessCheck.passed, true, "uniqueness check should pass");
  assert.equal(result.selectionContext.lead.length, 1, "lead society selection should be preserved");
  assert.equal(result.selectionContext.cooperating.length, 1, "cooperating society selection should be preserved");
  assert.equal(result.selectionContext.count, 3, "requested PSO count should be preserved");
  assert.match(result.prompt, /"lead_society": \["American Society of Mechanical Engineers"\]/, "prompt should include lead societies");
  assert.match(result.prompt, /"cooperating_society": \["Society of Manufacturing Engineers"\]/, "prompt should include cooperating societies");
  assert.match(result.prompt, /"requested_pso_count": 3/, "prompt should include requested count");

  const thermal = result.details.some((detail) =>
    detail.domain === "Thermal and Fluid Engineering",
  );
  const manufacturing = result.details.some((detail) =>
    detail.domain === "Manufacturing and Automation",
  );
  const design = result.details.some((detail) =>
    detail.domain === "Mechanical Design",
  );

  assert.equal(thermal, true, "should cover thermal domain");
  assert.equal(manufacturing, true, "should cover manufacturing domain");
  assert.equal(design, true, "should cover mechanical design domain");

  console.log("PSO agent test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
