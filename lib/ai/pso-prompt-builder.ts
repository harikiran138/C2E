import { detectProgramDomain } from "@/lib/curriculum/domain-knowledge";
import type { SelectedSocietiesInput } from "@/lib/ai/pso-agent";

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

  const criteriaSection = programCriteria 
    ? `
Use the following ABET program criteria:
${programCriteria.statement}
Curriculum includes: ${programCriteria.curriculum.join(", ")}
Faculty expectations: ${programCriteria.faculty}`
    : `
Use general ABET engineering outcomes and domain inference for PSO generation.
Apply ABET General Student Outcomes (SO1-SO7) including problem solving, design, communication, ethics, teamwork, experimentation, and lifelong learning.`;

  return `
You are an expert in Outcome-Based Education (OBE), NBA Tier-I accreditation, and ABET Engineering Accreditation Commission (EAC) criteria.

Your task is to generate high-quality Program Specific Outcomes (PSOs) for a given engineering program.

---

INPUT:
- Program Name: ${programName}
- Selected Societies: ${JSON.stringify(selectedSocieties || {})}
- Additional Focus Areas: ${JSON.stringify(focusAreas)}

---

CORE LOGIC (STRICTLY FOLLOW):

Step 1: Program Identification
- Analyze the program name: "${programName}".
- If it matches a known engineering discipline (e.g., Mechanical, Civil, CSE, Electrical, etc.), use domain-specific knowledge.
- If it includes modifiers (e.g., AI, Data, Robotics, Mechatronics), infer the domain intelligently.

Step 2: Criteria Usage
${criteriaSection}

Step 3: Unknown / New Program Handling
If the program is not directly recognized:
- Infer domain using keywords:
  * AI/ML -> intelligent systems, data-driven solutions
  * Software -> applications, systems, cloud
  * Electronics -> embedded, circuits, IoT
  * Mechanical -> design, thermal, manufacturing
  * Civil -> infrastructure, construction
- Generate PSOs based on inferred domain + ABET fundamentals.

---

PSO GENERATION RULES:

Each PSO must:
- Be specific to the program/domain
- Start with action verbs (Apply, Design, Develop, Analyze, Use, etc.)
- Reflect real-world engineering applications
- Include modern tools/technologies
- Consider societal, environmental, and ethical aspects
- Be measurable and outcome-focused

---

OUTPUT FORMAT:

Generate exactly ${count} PSOs.

Format the output as a JSON object with a "PSOs" array:
{
  "PSOs": [
    {
      "PSO_number": "PSO1",
      "statement": "Apply core engineering principles to solve domain-specific real-world problems.",
      "focus_area": "The specific domain focus",
      "mapped_abet_elements": ["SO1", "SO2"]
    }
  ]
}

---

QUALITY CHECK (MANDATORY BEFORE FINAL OUTPUT):

Ensure:
- Aligned with ABET/NBA expectations
- Domain-specific (not generic)
- No vague phrases
- Covers skills + application + impact
- Suitable for accreditation documentation

---

Example of expected PSO style:
PSO 1: Apply core engineering principles to solve domain-specific real-world problems.
PSO 2: Design and develop systems using modern tools and technologies relevant to the program.
PSO 3: Analyze data and processes to improve efficiency, sustainability, and performance.

Now generate exactly ${count} PSOs for the program: ${programName}.
`.trim();
}
