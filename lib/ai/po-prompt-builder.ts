/**
 * lib/ai/po-prompt-builder.ts
 * Structured Gemini prompt for Program Outcome (PO) generation.
 * Integrates standard ABET/NBA Student Outcomes as benchmarks.
 */
import { buildCurriculumAIGuardrailsPrompt } from "../curriculum/ai-guardrails";
import { detectProgramDomain } from "../curriculum/domain-knowledge";
import { STANDARD_PO_STATEMENTS } from "./constants";

export interface POPromptParams {
  programName:      string;
  count:            number;
  priorities?:      string[];
  institutionName?: string;
  mission?:         string;
  peos?:            string[];
  attempt?:         number;
}

export function buildPOAgentPrompt(params: POPromptParams): string {
  const {
    programName,
    count,
    priorities = [],
    institutionName,
    mission,
    peos = [],
    attempt = 0,
  } = params;

  const guardrails = buildCurriculumAIGuardrailsPrompt(programName);
  const domain = detectProgramDomain(programName);

  return `
You are a Senior Academic Auditor and Accreditation Specialist (NBA/ABET Expert).
Task: Generate exactly ${count} Program Outcome(s) (POs) for the ${programName} program${institutionName ? ` at ${institutionName}` : ""}.

ACADEMIC CONTEXT (MANDATORY ALIGNMENT):
- Program Mission: ${mission || "Standard academic and professional development"}
- Program Educational Objectives (PEOs):
${peos.length > 0 ? peos.map((p, i) => `  PEO${i + 1}: ${p}`).join("\n") : "  Standard professional achievements."}

CORE PRINCIPLES (NBA/ABET CRITERION 3):
1. MISSION & PEO ALIGNMENT: POs MUST directly support the provided PEOs and Mission. Each PO should be a measurable outcome that contributes to attaining the PEOs.
2. 100% AI-GENERATED: Use deep domain reasoning for ${domain}. Do not use generic templates.
3. ACCREDITATION READY: Align with ABET EAC Student Outcomes (SO1-SO7) and Washington Accord Graduate Attributes.
4. SEMANTIC DIVERSITY: Each PO MUST cover a distinct professional capability: Domain Knowledge, Design, Ethics, Teamwork, Tool Usage, etc.
5. MEASURABLE: Use high-level Bloom's action verbs.
6. MANDATORY PREFIX: Every statement MUST start with "Ability to " or "An ability to ".

CONTEXT:
- Program: ${programName}
- Domain: ${domain}
- UI Priorities: ${priorities.length > 0 ? priorities.join(", ") : "Standard engineering spectrum"}
- Attempt: ${attempt + 1}

STANDARD PO BENCHMARKS (ABET/NBA Standards for Reference):
${STANDARD_PO_STATEMENTS.map((s, i) => `PO${i + 1}: ${s}`).join("\n")}

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
- ${guardrails}
`.trim();
}
