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
    programCriteria: {
      statement: "Mechanical Engineering criteria",
      curriculum: ["Mechanical Design", "Thermal and Fluid Engineering", "Manufacturing and Automation"],
      faculty: "Expert faculty with research background"
    },
    focusAreas: ["AI", "Robotics", "Sustainability", "Mechatronics", "Energy Systems"],
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

  assert.match(psoPrompt, /You are a Senior Academic Auditor/);
  assert.match(psoPrompt, /- Lead: ASME/);
  assert.match(psoPrompt, /- Co-Lead: SAE International/);
  assert.match(psoPrompt, /STEP 8: SEMANTIC DIVERSITY/);
  assert.match(psoPrompt, /"PSOs":/);

  assert.match(poPrompt, /"task": "Generate Program Outcomes \(POs\)/);
  assert.match(poPrompt, /"number_of_outcomes": 12/);

  assert.match(visionPrompt, /"task": "Generate Program Vision statements/);
  assert.match(visionPrompt, /"selected_ui_priorities": \["Global Engineering Excellence","Ethics and integrity"\]/);

  assert.match(missionPrompt, /"task": "Generate Program Mission statements/);
  assert.match(missionPrompt, /"selected_program_vision":/);


  console.log("Generation prompt tests passed.");
}

main();
