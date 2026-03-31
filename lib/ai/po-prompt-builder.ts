import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";
import { detectProgramDomain } from "@/lib/curriculum/domain-knowledge";

export interface POPromptParams {
  programName: string;
  count: number;
  priorities?: string[];
  institutionName?: string;
  attempt?: number;
}

export function buildPOAgentPrompt(params: POPromptParams): string {
  const {
    programName,
    count,
    priorities = [],
    institutionName,
    attempt = 0,
  } = params;

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);
  const domain = detectProgramDomain(programName);

  return `
{
  "role": "You are an expert in Outcome-Based Education (OBE), NBA accreditation, Washington Accord graduate attributes, and ABET Engineering Accreditation Commission (EAC) standards.",
  "task": "Generate Program Outcomes (POs) for the ${programName}${institutionName ? ` program at ${institutionName}` : " program"}.",
  "input_parameters": {
    "program_of_study": "${programName}",
    "program_domain": "${domain}",
    "number_of_outcomes": ${count},
    "priority_inputs_from_ui": ${JSON.stringify(priorities)},
    "institution_context": "${institutionName || "Not provided"}",
    "region_context": "India (NBA aligned, Washington Accord compliant)",
    "attempt": ${attempt + 1}
  },
  "instructions": [
    "Refer to ABET EAC Student Outcomes SO1-SO7 and NBA Tier-I/Tier-II PO expectations as the governing benchmark.",
    "Generate outcomes at the time of graduation, not post-graduation objectives.",
    "Keep the outcomes broad enough to function as program-level outcomes, but still aligned with the selected program domain and UI priorities.",
    "Use measurable action-oriented openings such as Ability to apply, Ability to analyze, Ability to design, Ability to conduct, Ability to use, Ability to evaluate, Ability to communicate, and Ability to function.",
    "Ensure the full set covers problem solving, design, investigation, modern tools, ethics, sustainability, teamwork, communication, project management, and lifelong learning where relevant.",
    "Avoid promotional language, vague words, and repetition.",
    "Keep each outcome accreditation-ready, assessable, and suitable for direct PO-CO mapping."
  ],
  "output_format": {
    "POs": [
      {
        "PO_number": "PO1",
        "statement": "Ability to ...",
        "mapped_abet_elements": ["SO1"]
      }
    ]
  },
  "additional_guidelines": [
    "Return exactly ${count} POs as a JSON array of strings only, because the UI stores PO statements directly.",
    "Every PO must begin with Ability to or An ability to.",
    "Avoid generic duplication across statements.",
    "Use these selected priorities as emphasis signals where appropriate: ${priorities.length > 0 ? priorities.join(", ") : "No additional UI priorities selected"}."
  },
  "program_specific_guardrails": ${JSON.stringify(guardrails)}
}
`.trim();
}
