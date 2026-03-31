import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";

export interface MissionPromptParams {
  programName:     string;
  priorities:      string[];
  count:           number;
  visionRef?:      string;
  institutionName?: string;
  attempt?:        number;
}

/**
 * Build a structured Gemini prompt for mission statement generation.
 * Temperature: 0.8 for diversity while maintaining rubric compliance.
 */
export function buildMissionAgentPrompt(params: MissionPromptParams): string {
  const { programName, priorities, count, visionRef, institutionName, attempt = 0 } = params;

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);

  return `
{
  "role": "You are an expert in Outcome-Based Education (OBE), NBA accreditation planning, and ABET-aligned mission formulation for engineering programs.",
  "task": "Generate Program Mission statements for the ${programName}${institutionName ? ` program at ${institutionName}` : " program"}.",
  "input_parameters": {
    "program_name": "${programName}",
    "institution_name": "${institutionName || "Not provided"}",
    "selected_ui_priorities": ${JSON.stringify(priorities)},
    "selected_program_vision": ${JSON.stringify(visionRef || "")},
    "requested_count": ${count},
    "attempt": ${attempt + 1},
    "region_context": "India (NBA aligned, Washington Accord compliant)"
  },
  "instructions": [
    "Generate exactly ${count} mission statement(s).",
    "Mission must explain HOW the program operates to achieve its vision, not WHERE it aspires to stand.",
    "Treat the selected UI priorities as a multi-select operational brief.",
    "Across the generated set, distribute and synthesize the selected mission priorities instead of repeatedly using only one or two.",
    "Cover academic rigor, research or industry engagement, professional standards, and ethics or societal relevance across the mission.",
    "Use at least two operational verbs such as deliver, strengthen, foster, promote, implement, integrate, enable, support, sustain, and build.",
    "Keep each mission between 3 and 4 sentences and between 45 and 110 words.",
    "Avoid marketing terms, absolute guarantees, immediate graduation-outcome wording, and vision-style language."
  ],
  "output_format": {
    "missions": [
      "Sentence 1. Sentence 2. Sentence 3."
    ]
  },
  "additional_guidelines": [
    "Every mission must be implementation-focused, accreditation-ready, and structurally distinct.",
    "Do not paraphrase the selected vision directly; operationalize it.",
    "Use the program-specific guardrails to stay discipline-relevant.",
    "Return only a JSON array of strings."
  ],
  "program_specific_guardrails": ${JSON.stringify(guardrails)}
}
`.trim();
}
