/**
 * lib/ai/prompt-builder.ts
 * Builds the structured Gemini prompt for vision generation.
 * Embeds the 100-point rubric so the model self-evaluates.
 */

export interface PromptParams {
  institution_id:    string; // v5.1 Mandatory Scope
  program_id:        string; // v5.1 Mandatory Scope
  programName:       string;
  priorities:        string[];
  count:             number;
  institutionName?:  string;
  existingVisions?:  string[];
  attempt?:          number;
}

import { 
  VISION_PRIORITY_PILLAR_BANK, 
  VISION_EXAMPLES,
  VISION_STARTERS,
  VISION_FAILING_EXAMPLES
} from "./constants";

const RUBRIC = `
SCORING RUBRIC (100 pts — every statement MUST score ≥ 95):
  [25] Word count exactly 18–24 words
  [25] Starts with one of approved starters
  [20] Exactly ONE global concept (no global stacking)
  [20] ZERO operational/educational terms (no teaching/learning)
  [10] ZERO marketing hype and zero synonym stacking
`.trim();

const SAFE_EXAMPLES = VISION_EXAMPLES;

export function buildVisionAgentPrompt(params: PromptParams): string {
  const {
    programName,
    priorities,
    count,
    institutionName,
    existingVisions = [],
    attempt = 0,
  } = params;

  const programLabel = institutionName
    ? `${programName} at ${institutionName}`
    : programName;

  const exclusionBlock = existingVisions.length > 0
    ? `\nDO NOT reuse or closely paraphrase these already-generated statements:\n${existingVisions.map((v) => `  - ${v}`).join("\n")}`
    : "";

  const priorityNote = priorities.length > 0
    ? `Selected UI Priorities (Must integrate as the core pillars): ${priorities.join(", ")}`
    : "Use general professional engineering pillars.";

  return `
You are a Senior Strategic Academic Consultant and NBA Accreditation Specialist.
Task: Generate exactly ${count} Program Vision statements for the ${programLabel} program.
NBA CONTEXT: This output will be used in Section 2.1 (Vision, Mission, PEOs) of the Self-Assessment Report.

VISION DEFINITION:
A Vision statement describes the future standing and aspiration of the program. It is NOT an operational plan; it is a destination.

CORE PRINCIPLES (NBA/ABET ALIGNMENT):
1. 100% AI-GENERATED: Use deep domain reasoning for ${programName}. Do not use generic templates.
2. ASPIRATIONAL STANDING: Focus on where the program will be internationally respected or globally recognized.
3. SEMANTIC DIVERSITY: Across the ${count} visions, explore different strategic anchors (Innovation, Infrastructure, Ethics, Professional Distinction).
4. STRICT RUBRIC COMPLIANCE: Every vision MUST score ≥ 95 on the embedded rubric.

${RUBRIC}

STRICT CONSTRAINTS:
- Word count MUST be between 18 and 24 words.
- Use only approved starters: ${VISION_STARTERS.join(" | ")}.
- NO operational terms (teaching, learning, education, etc.).
- NO marketing hype (best-in-class, world-class, etc.).
- Exactly 1 global concept and no more than 3 strategic pillars.

REASONING GUIDELINES (MANDATORY SELF-VERIFICATION):
Before providing the final JSON, use your internal thinking process to:
Step 1: Draft a candidate vision.
Step 2: Explicitly count the words. If < 18 or > 24, rewrite.
Step 3: Check the starter. If not in approved list, rewrite.
Step 4: Check global concepts. count exactly one.
Step 5: Check for forbidden operational/marketing terms.
Step 6: Ensure exactly 3 or fewer pillars.

CALIBRATION EXAMPLES:
- PASSING: ${SAFE_EXAMPLES[0].replace("{prog}", programName)} (Meets all rules)
- FAILING: "${VISION_FAILING_EXAMPLES[0].text}" (Reason: ${VISION_FAILING_EXAMPLES[0].reason})

${priorityNote}
${exclusionBlock}
Attempt: ${attempt + 1}

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "visions": ["Vision Statement 1", "Vision Statement 2"]
}
`.trim();
}
