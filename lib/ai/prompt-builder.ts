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

  return `{
  "role": "You are an expert in Outcome-Based Education (OBE), NBA accreditation strategy, and ABET-aligned program positioning for engineering education.",
  "task": "Generate Program Vision statements for the ${programLabel} program.",
  "input_parameters": {
    "program_name": "${programName}",
    "institution_name": "${institutionName || "Not provided"}",
    "selected_ui_priorities": ${JSON.stringify(priorities)},
    "existing_vision_exclusions": ${JSON.stringify(existingVisions)},
    "requested_count": ${count},
    "attempt": ${attempt + 1},
    "region_context": "India (NBA aligned, Washington Accord compliant)"
  },
  "instructions": [
    "Generate exactly ${count} vision statements.",
    "Treat the selected UI priorities as a multi-select design brief, not a single preferred option.",
    "Across the full generated set, ensure meaningful coverage of the selected priorities instead of collapsing everything into one repeated phrase.",
    "Vision must express the future standing of the program, not operational teaching processes.",
    "Use 1 to 3 strategic pillars derived from the selected UI priorities.",
    "Do not reuse or closely paraphrase excluded statements.",
    "Maintain lexical diversity and distinct framing across the full set.",
    "Follow this scoring rubric strictly: ${RUBRIC.replace(/\n/g, " ")}"
  ],
  "safe_examples": ${JSON.stringify(SAFE_EXAMPLES)},
  "additional_guidelines": [
    "Allowed openings are restricted to the approved vision starters only.",
    "Each statement must remain aspirational, concise, and accreditation-ready.",
    "Avoid operational terms, marketing phrases, synonym stacking, and repeated roots.",
    "Use the selected UI priorities as thematic evidence, not as a raw copy-paste list."
  ],
  "output_format": {
    "visions": [
      "To be globally recognized for ..."
    ]
  }
}`;
}
