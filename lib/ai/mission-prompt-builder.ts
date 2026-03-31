import { buildCurriculumAIGuardrailsPrompt } from "../curriculum/ai-guardrails";
import { MISSION_EXAMPLES } from "./constants";

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
 */
export function buildMissionAgentPrompt(params: MissionPromptParams): string {
  const { programName, priorities, count, visionRef, institutionName, attempt = 0 } = params;

  const examples = MISSION_EXAMPLES.map(ex => ex.replace(/{prog}/g, programName));

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);

  return `
You are a Senior Strategic Academic Consultant and NBA Accreditation Specialist.
Task: Generate exactly ${count} Program Mission statement(s) for the ${programName} program${institutionName ? ` at ${institutionName}` : ""}.

MISSION DEFINITION:
A Mission statement describes the program's primary activities and operational path to achieve its Vision. It is NOT an aspiration; it is an action plan.

CORE PRINCIPLES (NBA/ABET ALIGNMENT):
1. 100% AI-GENERATED: Use deep domain reasoning for ${programName}. Do not use generic templates.
2. OPERATIONAL FOCUS: Explain HOW the program achieves its goals (e.g., through curriculum excellence, research labs, industry partnerships).
3. SEMANTIC DIVERSITY: Across the ${count} missions, explore different operational dimensions (Academic Rigor, Professional Standards, Research Innovation, Societal Relevance).
4. VISION ALIGNMENT: Reference and operationalize this Vision if provided: "${visionRef || "Not provided"}".

STRICT FORMATTING & STYLE:
- Length: 3 to 4 sentences.
- Word count: 45-110 words.
- Use strong operational verbs: Deliver, Foster, Promote, Implement, Integrate, Enable, Support, Sustain.
- Avoid promotional language, absolute guarantees, or vague marketing terms.
- Outcomes must be measurable and suitable for PEO/PO mapping.

CONTEXT & PRIORITIES:
- Priorities to emphasize: ${priorities.join(", ")}
- Regional context: NBA (India) / Washington Accord / ABET EAC
- Attempt: ${attempt + 1}

MISSION BENCHMARKS (High-Scoring Examples for Style Reference):
${examples.join("\n\n")}

GUARDRAILS:
- ${guardrails}

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings.
Example: ["To deliver a curriculum that focuses on research and innovation. We foster professional excellence through industry partnerships."]
`.trim();
}
