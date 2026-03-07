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

  const attemptNote = attempt > 0
    ? `\n[Attempt ${attempt + 1}: Generate MORE DIVERSE statements — avoid repeating structure from previous attempt.]`
    : "";

  const visionContext = visionRef
    ? `\nVision Reference (avoid paraphrasing this in the mission): "${visionRef}"`
    : "";

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);

  return `
You are an NBA/ABET accreditation consultant. Generate exactly ${count} mission statement(s) for the ${programName} program.${institutionName ? ` at ${institutionName}` : ""}${attemptNote}${visionContext}

=== MISSION SCORING RUBRIC (100 points) ===

HARD FAILURES (immediately caps score at ≤79):
1. Fewer than 2 operational verbs from: deliver, strengthen, foster, promote, advance, implement, integrate, enable, support, sustain, build
2. Not exactly 3–4 sentences
3. Fewer than 3 pillar types covered (see pillars below)
4. Any repeated root words across the statement
5. Synonym stacking (3+ words from: distinction/excellence/premier/leading/leadership/recognized/respected)
6. Marketing terms: destination, hub, world-class, best-in-class, unmatched
7. Restricted terms: guarantee, ensure all, 100%, master, excel in all
8. Immediate outcomes: "at graduation", "on graduation", "students will be able to"
9. Vision leakage: mission sounds like a vision (aspirational positioning rather than operational process)

REQUIRED PILLARS (cover at least 3 of 4):
- Academic: curriculum, outcome-based, learning, continuous improvement, rigor, academic
- Research/Industry: research, industry, innovation, laboratory, hands-on, collaboration
- Professional Standards: quality standards, engineering standards, professional standards
- Ethics/Society: ethical, ethics, societal, community, sustainable, responsibility

SCORING DIMENSIONS:
- Alignment (25 pts): Mission complements the vision reference without repeating it
- Operational (20 pts): Sufficient operational verbs + pillar coverage + sentence count
- Redundancy (15 pts): No repeated root words, no synonym stacking
- Accreditation (20 pts): No marketing/restricted/immediate-outcome terms
- Coherence (20 pts): 3–4 sentences, 45–110 words total, no vision leakage

FOCUS AREAS: ${priorities.join(", ")}

Program-Specific Guardrails:
${guardrails}

=== OUTPUT REQUIREMENTS ===
- Each mission: 3–4 sentences, 45–110 words
- Mission describes HOW the program operates (process, not position)
- Use different sentence structures and operational verbs for each statement
- Output ONLY a JSON array of exactly ${count} string(s). No markdown, no explanation.

Example format: ["Statement 1", "Statement 2"]
`.trim();
}
