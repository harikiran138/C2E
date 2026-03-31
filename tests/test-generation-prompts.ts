import assert from "node:assert/strict";
import { buildPSOGenerationPrompt } from "../lib/ai/pso-prompt-builder";
import { buildPOAgentPrompt } from "../lib/ai/po-prompt-builder";
import { buildVisionAgentPrompt } from "../lib/ai/prompt-builder";
import { buildMissionAgentPrompt } from "../lib/ai/mission-prompt-builder";

function main() {
  const psoPrompt = buildPSOGenerationPrompt({
    programName: "B.Tech Mechanical Engineering",
    count: 3,
    selectedSocieties: {
      lead: ["ASME"],
      co_lead: ["SAE International"],
      cooperating: ["Society of Manufacturing Engineers"],
    },
    requiredDomains: ["Mechanical Design", "Thermal and Fluid Engineering", "Manufacturing and Automation"],
    emergingAreas: ["AI", "Robotics", "Sustainability"],
    focusAreas: ["Mechatronics", "Energy Systems"],
  });

  const poPrompt = buildPOAgentPrompt({
    programName: "B.Tech Mechanical Engineering",
    count: 12,
    priorities: ["Professional engineering standards", "Sustainable development"],
    institutionName: "NSRIT",
  });

  const visionPrompt = buildVisionAgentPrompt({
    programName: "Mechanical Engineering",
    priorities: ["Global Engineering Excellence", "Ethics and integrity"],
    count: 3,
    institutionName: "NSRIT",
  });

  const missionPrompt = buildMissionAgentPrompt({
    programName: "Mechanical Engineering",
    priorities: ["Outcome Based Education", "Industry-aligned curriculum"],
    count: 3,
    visionRef: "To be globally recognized for long-term mechanical engineering distinction through innovation, ethics, and societal contribution.",
    institutionName: "NSRIT",
  });

  assert.match(psoPrompt, /"role": "You are an expert in Outcome-Based Education/);
  assert.match(psoPrompt, /"lead_society": \["ASME"\]/);
  assert.match(psoPrompt, /"program_domains": \["Mechanical Design"/);
  assert.match(psoPrompt, /"output_format":/);

  assert.match(poPrompt, /"task": "Generate Program Outcomes \(POs\)/);
  assert.match(poPrompt, /"number_of_outcomes": 12/);
  assert.match(poPrompt, /"region_context": "India \(NBA aligned, Washington Accord compliant\)"/);

  assert.match(visionPrompt, /"task": "Generate Program Vision statements/);
  assert.match(visionPrompt, /"selected_ui_priorities": \["Global Engineering Excellence","Ethics and integrity"\]/);
  assert.match(visionPrompt, /"output_format":/);

  assert.match(missionPrompt, /"task": "Generate Program Mission statements/);
  assert.match(missionPrompt, /"selected_program_vision":/);
  assert.match(missionPrompt, /"program_specific_guardrails":/);

  console.log("Generation prompt tests passed.");
}

main();
