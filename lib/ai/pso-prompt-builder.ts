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
🧠 🔥 EXPERT ACCREDITATION AUDITOR: PSO GENERATION
Role: Expert in Outcome-Based Education (OBE), NBA accreditation (India), Washington Accord standards, and ABET Engineering Accreditation Commission (EAC) frameworks.
Task: Clean, Fix, and Optimize Program Specific Outcomes (PSOs) for: ${programName}.

---
🎯 OBJECTIVE
Improve the PSO set so that it is:
- Non-redundant
- Domain-specific
- Single-competency focused
- Measurable and clear
- Accreditation-ready

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
🧠 CORE FIX RULES (CRITICAL)
1. REDUNDANCY / OVERLAP REMOVAL: Detect PSOs with similar meaning. Merge or refine to differentiate.
2. REMOVE GENERIC / PO-LIKE PSOs: Remove/Fix ethics-only or generic engineering statements (e.g. "understand engineering principles"). Convert to domain-specific PSOs.
3. SINGLE ACTION VERB ENFORCEMENT: Each PSO MUST contain EXACTLY ONE primary action verb.
4. HIDDEN MULTI-ACTION CLEANUP: Detect "by applying", "and ensuring", "to improve". Simplify to ONE clear measurable outcome.
5. WEAK VERB CORRECTION: Replace "enhance, improve, support, facilitate" with "analyze, design, evaluate, develop, implement".
6. DOMAIN ENFORCEMENT: Include discipline-specific keywords. Avoid "engineering systems"; use "power systems", "embedded systems", etc.
7. TOOL GENERALIZATION: Replace specific tools (MATLAB, Python) with "appropriate engineering tools", unless domain-critical.

---
📝 INSTRUCTIONS
1. Start each PSO with 'Graduates will be able to...'.
2. COGNITIVE LEVEL: Use Bloom's Taxonomy Levels 4-6 (Analyze, Evaluate, Create).
3. CONCISENESS: Keep PSOs between 20–30 words (one sentence).
4. DISTINCT COMPETENCY: Ensure each of the ${count} PSOs represents a distinct technical competency area.

---
📦 OUTPUT FORMAT (STRICT JSON)
{
  "final_psos": [
    "Graduates will be able to [Strong Verb] [Deep Technical Subspace] within the context of [Real-world Constraint]..."
  ],
  "fix_summary": {
    "issues_detected": ["List of detected issues"],
    "changes_made": ["Detailed list of changes"],
    "final_quality": "Accreditation Ready"
  }
}

IMPORTANT: RESPONSE MUST BE VALID JSON ONLY. NO PREAMBLE. NO EXPLANATION. NO MARKDOWN CODE BLOCKS. START THE RESPONSE WITH '{' AND END WITH '}'.
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
    ...feedback.detailedDrawbacks,
    ...feedback.psoAnalyses.flatMap(pa => pa.issues)
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
2. Maintain the technical complexity for ${feedback.psoAnalyses.length} outcomes.
3. Ensure deeper granularity — avoid repeating any patterns from the previous failed attempt.
4. If an ABET mapping was flagged as incorrect, re-map correctly (e.g. Design -> SO2).
5. Output ONLY the corrected valid JSON. NO PREAMBLE. NO MARKDOWN.
`.trim();
}

/**
 * Master PSO Refinement Engine v2
 * Functions as an intelligent audit and cleaning engine.
 */
export function buildPSOEvaluatorPrompt(params: {
  programName: string;
  existingPSOs: any[];
  feedback: PSOValidationResult;
}): string {
  const { programName, existingPSOs, feedback } = params;

  return `
🧠 🔥 EXPERT ACCREDITATION AUDITOR: PSO REFINEMENT
Role: Expert Evaluator and Auditor in OBE, NBA accreditation (India), Washington Accord, and ABET EAC standards.
Task: CLEAN, FIX, and OPTIMIZE the given Program Specific Outcomes (PSOs) for: ${programName}.

---
🎯 OBJECTIVE
Improve the PSO set so that it is:
- Non-redundant
- Domain-specific
- Single-competency focused
- Measurable and clear
- Accreditation-ready

---
🚨 NON-DESTRUCTIVE RULE (CRITICAL)
- DO NOT rewrite strong PSOs (Score ≥ 85) unnecessarily.
- ONLY modify when quality improvement is clearly needed.
- PRESERVE original technical intent always.

---
🧠 CORE FIX RULES (STRICT ENFORCEMENT)
1. REDUNDANCY / OVERLAP REMOVAL: Detect PSOs with similar meaning. If overlap exists, merge or refine to differentiate. Remove generic duplicates.
2. REMOVE GENERIC / PO-LIKE PSOs: Detect and fix/remove generic engineering statements or ethics-only PSOs without domain context. Convert to domain-specific PSOs.
3. SINGLE ACTION VERB ENFORCEMENT: Each PSO MUST contain EXACTLY ONE primary action verb.
4. HIDDEN MULTI-ACTION CLEANUP: Detect "by applying", "and ensuring", "to improve". Simplify to ONE clear measurable outcome.
5. WEAK VERB CORRECTION: Replace "enhance, improve, support, facilitate" with "analyze, design, evaluate, develop, implement".
6. DOMAIN ENFORCEMENT: Include discipline-specific keywords. Avoid "engineering systems"; use "power systems", "embedded systems", etc.
7. TOOL GENERALIZATION: Replace specific tools (MATLAB, Python) with "appropriate engineering tools", unless domain-critical.

---
🔴 FEEDBACK FROM MASTER EVALUATOR
${(feedback?.detailedDrawbacks || []).map(d => `- ❌ ${d}`).join("\n")}

---
📥 INPUT PSOs:
${JSON.stringify((feedback?.psoAnalyses || []).map(pa => ({
  id: (pa?.index || 0) + 1,
  statement: pa?.statement || "",
  score: pa?.score || 0,
  issues: pa?.issues || []
})), null, 2)}

---
📦 OUTPUT FORMAT (STRICT JSON)
{
  "final_psos": [
    "Refined Statement 1...",
    "Refined Statement 2..."
  ],
  "fix_summary": {
    "issues_detected": ["List exactly what was wrong based on the 7 rules"],
    "changes_made": ["What specifically was changed for each PSO"],
    "final_quality": "Accreditation Ready"
  }
}

IMPORTANT: RESPONSE MUST BE VALID JSON ONLY. NO PREAMBLE. NO EXPLANATION. NO MARKDOWN CODE BLOCKS. START THE RESPONSE WITH '{' AND END WITH '}'.
`.trim();
}
