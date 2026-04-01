// PSO Prompt Builder - High-fidelity accreditation-aligned prompts
import type { SelectedSocietiesInput } from "@/lib/ai/pso-agent";
import type { PSOValidationResult } from "./pso-scoring";
import { PSO_PHRASE_BANK, PSO_EXAMPLES, PSO_FAILING_EXAMPLES } from "./constants";

export type PSOGenerationMode = "standard" | "strict" | "industry" | "research";

export interface PSOPromptBuilderParams {
  programName: string;
  count: number;
  programCriteria?: {
    statement: string;
    curriculum: string[];
    faculty: string;
  };
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  mode?: PSOGenerationMode;
}

export function buildPSOGenerationPrompt(
  params: PSOPromptBuilderParams,
): string {
  const {
    programName,
    count,
    programCriteria,
    selectedSocieties,
    focusAreas = [],
    mode = "standard",
  } = params;

  const criteriaText = programCriteria 
    ? `Program Criteria: ${programCriteria.statement}\nFocus Areas: ${programCriteria.curriculum.join(", ")}`
    : "Not provided (Use ABET General Student Outcomes SO1-SO7)";

  // Find relevant benchmark phrases
  let benchmarkPhrases: string[] = [];
  for (const [domain, phrases] of Object.entries(PSO_PHRASE_BANK)) {
    if (programName.toLowerCase().includes(domain.toLowerCase()) || 
        domain.toLowerCase().includes(programName.toLowerCase())) {
      benchmarkPhrases = phrases;
      break;
    }
  }
  if (benchmarkPhrases.length === 0) benchmarkPhrases = PSO_PHRASE_BANK["General Engineering"];

  const benchmarksText = benchmarkPhrases.map(p => `- ${p}`).join("\n");

  // Mode-specific instructions
  let modeInstructions = "";
  if (mode === "strict") {
    modeInstructions = "STRATEGY: Maximum ABET/NBA alignment. Force complex engineering constraints (safety, ethics, standards) into every statement.";
  } else if (mode === "industry") {
    modeInstructions = "STRATEGY: Industry-readiness. Focus on modern industrial tools, workflow simulation, and deployment-ready professional systems.";
  } else if (mode === "research") {
    modeInstructions = "STRATEGY: Research & Innovation. Focus on mathematical modeling, system simulation, and optimization of complex theoretical frameworks.";
  }

  const failingExamplesText = PSO_FAILING_EXAMPLES
    .map(ex => `❌ BAD: "${ex.text}"\n   REASON: ${ex.reason}`)
    .join("\n\n");

  return `
🧠 🔥 ACCREDITATION-READY PSO GENERATION
Role: Expert in Outcome-Based Education (OBE), NBA accreditation (India), Washington Accord standards, and ABET Engineering Accreditation Commission (EAC) frameworks.
Task: Analyze, refine, and enhance Program Specific Outcomes (PSOs) for: ${programName}.

---
🎯 CONTEXT & INPUTS
- Program Name: ${programName}
- ABET Criteria: ${criteriaText}
- Lead Societies: ${selectedSocieties?.lead?.join(", ") || "None"}
- Additional Focus Areas: ${focusAreas.join(", ")}
- GENERATION MODE: ${mode.toUpperCase()}
${modeInstructions ? `- ${modeInstructions}` : ""}

---
🔴 NEGATIVE CALIBRATION (DO NOT REPEAT THESE MISTAKES)
${failingExamplesText}

---
💎 HIGH-QUALITY BENCHMARKS (REFERENCE STYLE)
Use these high-scoring technical phrases as inspiration for depth and tone:
${benchmarksText}

---
🚀 OBJECTIVES
1. Ensure each PSO is outcome-oriented, measurable, and assessable.
2. Align PSOs with ABET EAC Student Outcomes (SO1–SO7).
3. Ensure compliance with NBA (India) expectations for PSOs (SAR Section 2.5).
4. Strengthen program-specific depth and avoid generic engineering statements.
5. Remove redundancy and overlap across PSOs.
6. Limit cognitive overload by avoiding multiple outcomes in a single PSO.
7. Use precise and measurable action verbs from Bloom’s Taxonomy (Analyze, Design, optimize, etc.).
8. Ensure each PSO can be mapped clearly to courses, labs, and assessments.

---
📝 INSTRUCTIONS
1. Start each PSO with 'Graduates will be able to...'.
2. STRUCTURAL FORMULA: [Strong Verb] + [Specific Technical Object] + [Real-world Constraint/Standard/Tool].
3. COGNITIVE LEVEL: Use Bloom's Taxonomy Levels 4-6 (Analyze, Evaluate, Create).
4. VERB RESTRICTION: Avoid 'understand', 'enhance', 'optimize', 'efficient', unless tied to measurable criteria.
5. DOMAIN DEPTH: Use discipline-specific technical keywords (ASME, IEEE, ISO, specific algorithms/methods).
6. CONCISENESS: Keep PSOs between 20–30 words (one sentence).
7. INTEGRATION: Subtly integrate sustainability, ethics, or societal relevance where technically appropriate.
8. DISTINCT COMPETENCY: Ensure each of the ${count} PSOs represents a distinct technical competency area.

---
🧠 INTERNAL SELF-VERIFICATION
Before producing output, internally verify:
1. Does each PSO start with a strong measurable verb?
2. Is the technical granularity deep enough for ${programName}?
3. Does each PSO reflect a real-world engineering constraint?
4. Is the ABET SO mapping logically consistent with the statement text?
5. Do the ${count} PSOs together provide broad program coverage without repetition?

DO NOT output this reasoning block.

---
📦 OUTPUT FORMAT (STRICT JSON)
{
  "PSOs": [
    {
      "statement": "Graduates will be able to [Strong Verb] [Deep Technical Subspace] within the context of [Real-world Constraint]...",
      "focus_area": "Technical subspace",
      "mapped_abet_elements": ["SO1", "SO2"]
    }
  ],
  "compliance_check": {
    "obe_alignment": "Explanation of how outcome-orientation is achieved",
    "nba_alignment": "Justification for Section 2.5 compliance",
    "abet_alignment": "Summary mapping to SO1-SO7"
  },
  "meta": {
    "mode": "${mode}",
    "compliance": "NBA Tier-I + ABET EAC"
  }
}
`.trim();
}

/**
 * Generates a feedback-aware prompt for retrying PSO generation.
 */
export function buildRetryPrompt(
  basePrompt: string, 
  feedback: PSOValidationResult,
  previousResults: any[] = []
): string {
  const issues = [
    ...feedback.globalIssues,
    ...feedback.psos.flatMap(p => p.score.issues)
  ].filter((v, i, a) => a.indexOf(v) === i);

  const prevText = previousResults.length > 0 
    ? `\nPREVIOUS FAILED ATTEMPT:\n${JSON.stringify(previousResults, null, 2)}`
    : "";

  return `
${basePrompt}

${prevText}

⚠️ THE PREVIOUS ATTEMPT FAILED QUALITY CHECKS WITH THESE ISSUES:
${issues.map(issue => `- ❌ ${issue}`).join("\n")}

STRICT RETRY INSTRUCTIONS:
1. Fix all ❌ issues mentioned above.
2. Maintain the technical complexity for ${feedback.psos.length} outcomes.
3. Ensure deeper granularity — avoid repeating any patterns from the previous failed attempt.
4. If an ABET mapping was flagged as incorrect, re-map correctly (e.g. Design -> SO2).
5. Output ONLY the corrected valid JSON.
`.trim();
}
