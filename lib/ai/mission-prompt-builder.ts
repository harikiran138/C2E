import { buildCurriculumAIGuardrailsPrompt } from "../curriculum/ai-guardrails";
import { MISSION_EXAMPLES, MISSION_FAILING_EXAMPLES } from "./constants";

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
NBA CONTEXT: This output will be used in Section 2.2 (Vision, Mission, PEOs) of the Self-Assessment Report.

MISSION DEFINITION:
A Mission statement describes the program's primary activities and operational path to achieve its Vision. It is NOT an aspiration; it is an action plan.

CORE PRINCIPLES (NBA/ABET ALIGNMENT):
1. 100% AI-GENERATED: Use deep domain reasoning for ${programName}. Do not use generic templates.
2. OPERATIONAL FOCUS: Explain HOW the program achieves its goals.
3. BLOOM'S TAXONOMY: Output must use higher-level Bloom's verbs (Analyze, Evaluate, Create, Design, Implement) to enable PEO/PO mapping.

SCORING RUBRIC (100 pts — every statement MUST score ≥ 90):
  [25] Vision Alignment & Pillar Coverage (Integrate 3+ pillars from selected priorities)
  [25] Operational Rigor (Use 2+ strong operational verbs: Deliver, Foster, Promote, Implement)
  [20] Bloom's Taxonomy Integration (Must include at least one of: Analyze, Evaluate, Create, Design)
  [20] Sentence Structure (Strictly 3-4 sentences, 45-110 words)
  [10] Zero forbidden terms (No marketing hype, no 100% placement guarantees)

STRICT CONSTRAINTS:
- Length: 3 to 4 sentences.
- Word count: 45-110 words.
- NO promotional language or vague marketing terms.

REASONING GUIDELINES (MANDATORY SELF-VERIFICATION):
Step 1: Draft the mission.
Step 2: Check Vision Alignment. Does it map to "${visionRef || "the program vision"}"?
Step 3: Count the sentences. If not 3 or 4, rewrite.
Step 4: Verify Bloom's verbs. Are they present?
Step 5: Check for forbidden "immediate graduation" focus or guarantees.

CALIBRATION EXAMPLES:
- PASSING: ${examples[0]} (Meets Bloom's and Pillar rules)
- FAILING: "${MISSION_FAILING_EXAMPLES[0].text}" (Reason: ${MISSION_FAILING_EXAMPLES[0].reason})

CONTEXT & PRIORITIES:
- Priorities to emphasize: ${priorities.join(", ")}
- Regional context: NBA (India) / Washington Accord / ABET EAC
- Attempt: ${attempt + 1}

GUARDRAILS:
- ${guardrails}

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings.
`.trim();
}
