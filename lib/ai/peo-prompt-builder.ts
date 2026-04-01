/**
 * lib/ai/peo-prompt-builder.ts
 * Structured Gemini prompt for PEO generation with integrated legacy benchmarks.
 */
import { buildCurriculumAIGuardrailsPrompt } from "../curriculum/ai-guardrails";
import { PEO_PHRASE_BANK, PEO_REQUIRED_PREFIX } from "./constants";

export interface PEOPromptParams {
  programName:      string;
  priorities:       string[];
  count:            number;
  institutionName?: string;
  vision?:          string;
  mission?:         string;
  attempt?:         number;
}

/**
 * Build a structured Gemini prompt for PEO generation.
 */
export function buildPEOAgentPrompt(params: PEOPromptParams): string {
  const { programName, priorities, count, institutionName, vision, mission, attempt = 0 } = params;

  // Selective benchmarks based on priorities
  const benchmarks: string[] = [];
  priorities.forEach(p => {
    const completions = PEO_PHRASE_BANK[p];
    if (completions) {
      completions.forEach(c => benchmarks.push(`${PEO_REQUIRED_PREFIX} ${c}`));
    }
  });

  const attemptNote = attempt > 0
    ? `\n[Attempt ${attempt + 1}: Generate MORE DIVERSE statements — use different action verbs and domains.]`
    : "";

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);

  return `
You are a Senior Academic Auditor and NBA/ABET Accreditation Specialist.
Task: Generate exactly ${count} Program Educational Objective(s) (PEOs) for the ${programName} program${institutionName ? ` at ${institutionName}` : ""}.

ACADEMIC CONTEXT (MANDATORY ALIGNMENT):
- Program Vision: ${vision || "Standard professional excellence"}
- Program Mission: ${mission || "Standard academic and professional development"}

PEO DEFINITION:
PEOs are broad statements that describe what graduates are expected to attain within 3 to 5 years of graduation.

CORE PRINCIPLES (NBA/ABET CRITERION 2):
1. MISSION ALIGNMENT: PEOs MUST directly support the program Mission. Each PEO should be a mechanism to achieve specific components of the Mission.
2. 100% AI-GENERATED: Use deep domain reasoning for ${programName}. Do not use generic templates.
3. CAREER-LONG ACHIEVEMENTS: Focus on professional accomplishments 3-5 years POST-GRADUATION.
4. SEMANTIC DIVERSITY: Ensure PEOs cover distinct dimensions: Technical Competence, Leadership, Ethics, and Lifelong Growth.
5. ACTION ORIENTATION: Each PEO must focus on achievement, not state of being.

STRICT ACCREDITATION RULES:
- Every PEO statement MUST start exactly with: "${PEO_REQUIRED_PREFIX} ..."
- Word count: 20-40 words per statement.
- Only a single focused sentence per PEO.
- High-level action verbs: Analyze, Design, Lead, Evaluate, Manage, Implement, Pursue.
- No vague, promotional adjectives (e.g., "world-class", "excellent").

CONTEXT & PRIORITIES:
- Priorities to emphasize: ${priorities.join(", ")}
- Regional context: NBA (India) / Washington Accord / ABET EAC
- Attempt: ${attempt + 1}
${attemptNote}

PEO BENCHMARKS (Reference Examples for Desired Depth & Structure):
${benchmarks.length > 0 ? benchmarks.join("\n") : "Use standard professional engineering achievements."}

GUARDRAILS:
- ${guardrails}

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings.
Example: ["${PEO_REQUIRED_PREFIX} lead engineering teams in developing sustainable infrastructure solutions through ethical professional practice and lifelong learning."]
`.trim();
}
