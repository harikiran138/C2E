/**
 * lib/ai/po-prompt-builder.ts
 * Structured Gemini prompt for Program Outcome (PO) generation.
 * Integrates standard ABET/NBA Student Outcomes as benchmarks.
 */
import { buildCurriculumAIGuardrailsPrompt } from "../curriculum/ai-guardrails";
import { detectProgramDomain } from "../curriculum/domain-knowledge";
import { STANDARD_PO_STATEMENTS } from "./constants";

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
You are a Senior Academic Auditor and Accreditation Specialist (NBA/ABET Expert).
Task: Generate exactly ${count} Program Outcome(s) (POs) for the ${programName} program at ${institutionName || "our institution"}.

CORE PRINCIPLES:
1. 100% AI-GENERATED: Use deep domain reasoning for ${domain}. Do not use generic templates.
2. ACCREDITATION READY: Align with ABET EAC Student Outcomes (SO1-SO7) and Washington Accord Graduate Attributes.
3. SEMANTIC DIVERSITY: Each PO MUST cover a distinct professional capability: Domain Knowledge, Design, Ethics, Teamwork, Tool Usage, etc.
4. MEASURABLE: Use high-level Bloom's action verbs.
5. MANDATORY PREFIX: Every statement MUST start with "Ability to " or "An ability to ".

CONTEXT:
- Program: ${programName}
- Domain: ${domain}
- UI Priorities: ${priorities.length > 0 ? priorities.join(", ") : "Standard engineering spectrum"}
- Attempt: ${attempt + 1}

STANDARD PO BENCHMARKS (ABET/NBA Standards for Reference):
${STANDARD_PO_STATEMENTS.map((s, i) => `PO${i+1}: ${s}`).join("\n")}

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "POs": [
    {
      "PO_number": "PO_X",
      "statement": "Ability to [action] [context] [constraint]",
      "mapped_abet_elements": ["SO1", "SO2"]
    }
  ]
}

GUARDRAILS:
- Exactly ${count} outcomes.
- Technical depth appropriate for ${domain}.
- ${JSON.stringify(guardrails)}
`.trim();
}
