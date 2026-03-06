/**
 * lib/ai/prompt-builder.ts
 * Builds the structured Gemini prompt for vision generation.
 * Embeds the 100-point rubric so the model self-evaluates.
 */

export interface PromptParams {
  programName:       string;
  priorities:        string[];
  count:             number;
  institutionName?:  string;
  existingVisions?:  string[];
  attempt?:          number;
}

const RUBRIC = `
SCORING RUBRIC (100 pts — every statement MUST score ≥ 90):
  [20] Word count 18–24 words (count carefully before writing)
  [20] Starts with one of: "To be globally recognized for" | "To emerge as" |
       "To achieve distinction in" | "To advance as a leading" | "To be globally respected for"
  [20] Exactly ONE global concept (globally recognized / globally respected /
       internationally benchmarked / global leadership / distinction / advance as a leading)
  [30] ZERO operational/educational terms: education, teaching, learning, curriculum,
       pedagogy, classroom, provide, deliver, develop, cultivate, train, prepare, implement, foster
  [20] ZERO marketing terms: destination, hub, world-class, best-in-class, unmatched
  [15] ≤ 3 pillars (pillars = commas + "and" in sentence, max 3 pillars total)
  [15] No repeated root words
  [20] No synonym stacking (≤ 2 from: distinction/excellence/premier/leading/leadership/recognized/respected)
`.trim();

const SAFE_EXAMPLES = [
  `To be globally recognized for long-term Computer Engineering distinction through institutional academic standards, applied innovation practice, and sustainable societal contribution.`,
  `To achieve distinction in Electrical Engineering through sustained ethical institutional standards, research-driven technological advancement, and long-term professional competitiveness.`,
  `To be globally respected for sustained Civil Engineering excellence through standards-driven professional practice, meaningful societal advancement, and responsible technological innovation.`,
];

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

  const priorityList = priorities.length > 0
    ? priorities.map((p, i) => `  ${i + 1}. ${p}`).join("\n")
    : "  (none specified — use professional engineering standards)";

  const exclusionBlock = existingVisions.length > 0
    ? `\nDO NOT reuse or closely paraphrase these already-generated statements:\n${existingVisions.map((v) => `  - ${v}`).join("\n")}\n`
    : "";

  const diversityHint = attempt > 0
    ? `\nATTEMPT ${attempt + 1}: Previous attempt produced insufficient quality. Use different sentence structures and pillar phrases.\n`
    : "";

  return `You are an accreditation consultant generating vision statements for the ${programLabel} program.

TASK: Generate exactly ${count} vision statements (numbered 1 to ${count}).

FOCUS AREAS (use 1–3 of these as thematic pillars):
${priorityList}
${exclusionBlock}${diversityHint}
${RUBRIC}

SAFE EXAMPLES (study the structure, do NOT copy verbatim):
${SAFE_EXAMPLES.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}

CRITICAL CONSTRAINTS:
- Replace "and" with "&" in "${programName}" if the program name contains "and"
- Pillar count = total commas + total "and" in the sentence — keep ≤ 3
- Each pillar phrase must be 2–4 words with NO "and" inside the phrase
- No global tokens (global/globally/international/internationally/world) inside pillar phrases
- Each statement must be lexically distinct from others in the batch

OUTPUT FORMAT — return ONLY a numbered list, no commentary:
1. <vision statement>
2. <vision statement>
...`;
}
