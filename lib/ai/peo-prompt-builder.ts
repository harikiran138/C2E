/**
 * lib/ai/peo-prompt-builder.ts
 * Structured Gemini prompt for PEO generation with full rubric embedded.
 */
import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";

export interface PEOPromptParams {
  programName:      string;
  priorities:       string[];
  count:            number;
  institutionName?: string;
  attempt?:         number;
}

/**
 * Build a structured Gemini prompt for PEO generation.
 */
export function buildPEOAgentPrompt(params: PEOPromptParams): string {
  const { programName, priorities, count, institutionName, attempt = 0 } = params;

  const attemptNote = attempt > 0
    ? `\n[Attempt ${attempt + 1}: Generate MORE DIVERSE statements — use different action verbs and domains.]`
    : "";

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);

  return `
You are an NBA/ABET accreditation consultant. Generate exactly ${count} Program Educational Objective(s) (PEOs) for the ${programName} program.${institutionName ? ` at ${institutionName}` : ""}${attemptNote}

PEOs describe what graduates achieve 3–5 years AFTER graduation (NOT at graduation). They must align with NBA/ABET Criterion 2 (Program Educational Objectives).

=== PEO SCORING RUBRIC ===

HARD FAILURES (immediately caps score at ≤79):
1. Does NOT start with exactly "Within 3 to 5 years of graduation, graduates will ..."
2. Word count below 20 or above 40 (NBA/ABET preference for concise but comprehensive statements)

REQUIRED ELEMENTS:
- Start: "Within 3 to 5 years of graduation, graduates will [action]..."
- Bloom's taxonomy verb: apply, analyze, design, evaluate, lead, manage, communicate, contribute, demonstrate, develop, implement, engage, pursue, adapt
- Specific measurable outcome (not vague aspirations)
- NBA Alignment: Must cover one of: Technical Competence, Societal Impact, Sustainable Development, or Ethics
- No vague words: excellent, best, world-class, outstanding, superior
- At most 1 comma (keep it a focused single objective)

SCORING:
- Starting phrase (30 pts): Must start with the required prefix
- Bloom's verb (20 pts): Must include an appropriate action verb
- NBA/ABET Alignment (25 pts): Must explicitly address technical capability, society, or environment
- Clarity & Specificity (15 pts): Specific, no vague words, focused
- Length (10 pts): 20–40 words

FOCUS AREAS (use these as themes): ${priorities.join(", ")}, Social Sustainability, Ethical Engineering Lifecycle, Environmental Stewardship

Program-Specific Guardrails:
${guardrails}

=== OUTPUT REQUIREMENTS ===
- Each PEO: 1 sentence, 20–40 words
- Must start with: "Within 3 to 5 years of graduation, graduates will ..."
- Generate diverse PEOs: One technical-focused, one societal-focused, and one leadership-focused
- Output ONLY a JSON array of exactly ${count} string(s). No markdown, no explanation.

Example: ["Within 3 to 5 years of graduation, graduates will lead engineering teams demonstrating technical competency, ethical judgment, and collaborative professional practice."]
`.trim();
}
