// PSO Prompt Builder - High-fidelity accreditation-aligned prompts
import type { SelectedSocietiesInput } from "@/lib/ai/pso-agent";
import type { ValidationResult } from "./pso-validator";

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
  } = params;

  const criteriaText = programCriteria 
    ? `Program Criteria: ${programCriteria.statement}\nFocus Areas: ${programCriteria.curriculum.join(", ")}`
    : "Not provided (Use ABET General Student Outcomes SO1-SO7)";

  return `
🧠 🔥 PERFECT PSO GENERATION PROMPT (FINAL VERSION)

You are a Senior Academic Auditor and Accreditation Specialist with expertise in Outcome-Based Education (OBE), NBA Tier-I accreditation, and ABET Engineering Accreditation Commission (EAC) standards.

Your task is to generate high-quality, accreditation-ready Program Specific Outcomes (PSOs).

⸻

🎯 INPUT
- Program Name: ${programName}
- Program Criteria (if available): ${criteriaText}
- Selected Professional Societies:
  - Lead: ${selectedSocieties?.lead?.join(", ") || "None"}
  - Co-Lead: ${selectedSocieties?.co_lead?.join(", ") || "None"}
  - Cooperating: ${selectedSocieties?.cooperating?.join(", ") || "None"}

⸻

🧠 CORE EXECUTION LOGIC (STRICTLY FOLLOW)

STEP 1: PROGRAM IDENTIFICATION
- Analyze the program name carefully: "${programName}".
- If it matches a known engineering discipline (Mechanical, Civil, Electrical, etc.), use domain-specific knowledge.
- If not:
→ Infer domain using keywords:
  - AI / ML → intelligent systems, data-driven models
  - Software → applications, cloud, systems
  - Electronics → embedded systems, IoT, circuits
  - Mechanical → design, thermal, manufacturing
  - Civil → infrastructure, construction
  - General → use core engineering principles

⸻

STEP 2: APPLY ABET CRITERIA

If Program Criteria is provided:
- Extract key curriculum + capability requirements
- Ensure ALL PSOs reflect those requirements

If NOT provided:
Use ABET Student Outcomes (MANDATORY BASE):
SO1 → Solve complex engineering problems
SO2 → Engineering design under constraints
SO3 → Communication
SO4 → Ethics & societal impact
SO5 → Teamwork
SO6 → Experimentation & data analysis
SO7 → Lifelong learning

⸻

STEP 3: DOMAIN ENFORCEMENT

Each PSO MUST:
- Include domain-specific technical keywords
(e.g., thermal systems, CAD/CAM, AI models, embedded systems, infrastructure, etc.)
- Avoid generic phrases like:
❌ “apply engineering knowledge”
❌ “solve problems”
- Instead:
✅ “analyze thermal-fluid systems”
✅ “design intelligent data-driven models”

⸻

STEP 4: REAL-WORLD CONTEXT (MANDATORY)

Each PSO MUST include at least one:
- Industry application
- Real-world system
- Practical engineering scenario

Examples:
- energy systems
- smart infrastructure
- manufacturing systems
- healthcare systems
- automation

⸻

STEP 5: ACTION VERB CONTROL

ONLY use these verbs:
Apply, Design, Analyze, Develop, Evaluate, Integrate, Optimize, Implement

Each PSO must start with one of these.

⸻

STEP 6: ABET MAPPING (STRICT)

For each PSO:
- Map ONLY relevant ABET outcomes (SO1–SO7)
- DO NOT guess
- Include 1–2 mappings MAX

⸻

STEP 7: OUTPUT FORMAT (STRICT — NO DEVIATION)

Output ONLY valid JSON. No explanations.

Format:
{
  "PSOs": [
    {
      "PSO_number": "PSO1",
      "statement": "<clear, domain-specific, real-world PSO>",
      "focus_area": "Specific Domain Focus",
      "action_verb": "One of the approved action verbs",
      "skill": "Technical skill or capability",
      "tool_phrase": "Tools or methodologies used",
      "application_context": "Industry or real-world application",
      "mapped_abet_elements": ["SOX", "SOY"]
    }
  ]
}

⸻

STEP 8: SEMANTIC DIVERSITY (CRITICAL)
- Ensure each PSO covers a distinctly different dimension of the program.
- Example for CSE:
  1. System Architecture
  2. Software Development
  3. AI/Data Science deployment
- DO NOT repeat the same core competence with different wording.
- DO NOT generate semantically similar PSOs.

⸻

🚨 HARD CONSTRAINTS (NON-NEGOTIABLE)
- MUST generate exactly ${count} PSOs
- MUST be domain-specific (no generic wording)
- MUST be semantically unique (NO repetition of ideas)
- MUST include real-world context
- MUST include correct ABET mapping
- MUST be valid JSON (parsable)
- NO extra text before or after JSON

⸻

✅ FINAL QUALITY CHECK (SELF-VALIDATE BEFORE OUTPUT)

Ensure:
✔ Domain depth is visible
✔ ABET alignment is logical
✔ Statements are measurable and outcome-based
✔ NO SEMANTIC REPETITION
✔ No vague terms

⸻

Now generate ${count} PSOs for: ${programName}—
`.trim();
}

/**
 * Generates a feedback-aware prompt for retrying PSO generation.
 */
export function buildRetryPrompt(basePrompt: string, feedback: ValidationResult): string {
  return `
${basePrompt}

⚠️ PREVIOUS OUTPUT HAD ISSUES:
${feedback.issues.map(issue => `- ${issue}`).join("\n")}

💡 IMPROVEMENT SUGGESTIONS:
${feedback.suggestions.map(suggestion => `- ${suggestion}`).join("\n")}

STRICT INSTRUCTIONS FOR THE RETRY:
- Tighten the domain-specific depth by adding technical keywords (e.g., thermal-fluids, CAD/CAM, algorithms).
- Include more explicit real-world context and engineering constraints.
- Correct the ABET mapping (SO1-SO7) based on the issues listed above.
- Ensure only prescribed action verbs are used at the start of each statement.
- Output ONLY the corrected valid JSON.
`.trim();
}
