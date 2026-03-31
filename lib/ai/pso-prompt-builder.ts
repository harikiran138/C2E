import { detectProgramDomain } from "@/lib/curriculum/domain-knowledge";
import type { SelectedSocietiesInput } from "@/lib/ai/pso-agent";

export interface PSOPromptBuilderParams {
  programName: string;
  count: number;
  selectedSocieties?: SelectedSocietiesInput;
  requiredDomains: string[];
  emergingAreas: string[];
  focusAreas?: string[];
}

function listOrFallback(values: string[] | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  return values.join(", ");
}

export function buildPSOGenerationPrompt(
  params: PSOPromptBuilderParams,
): string {
  const {
    programName,
    count,
    selectedSocieties,
    requiredDomains,
    emergingAreas,
    focusAreas = [],
  } = params;

  const domain = detectProgramDomain(programName);

  return `
{
  "role": "You are an expert in Outcome-Based Education (OBE), NBA accreditation (Tier-I), Washington Accord graduate attributes, and ABET Engineering Accreditation Commission (EAC) standards.",
  "task": "Generate Program Specific Outcomes (PSOs) for the ${programName} program.",
  "input_parameters": {
    "program_of_study": "${programName}",
    "detected_program_domain": "${domain}",
    "lead_society": ${JSON.stringify(selectedSocieties?.lead || [])},
    "co_lead_society": ${JSON.stringify(selectedSocieties?.co_lead || selectedSocieties?.coLead || [])},
    "cooperating_society": ${JSON.stringify(selectedSocieties?.cooperating || [])},
    "program_domains": ${JSON.stringify(requiredDomains)},
    "emerging_areas": ${JSON.stringify(emergingAreas)},
    "additional_focus_areas": ${JSON.stringify(focusAreas)},
    "requested_pso_count": ${count},
    "region_context": "India (NBA aligned, Washington Accord compliant)"
  },
  "instructions": [
    "Refer to ABET EAC Student Outcomes SO1-SO7 and discipline-specific program expectations.",
    "Incorporate lead societies as the strongest discipline signal, co-lead societies as secondary constraints, and cooperating societies as supporting context.",
    "Ensure PSOs reflect domain depth unique to the program and do not repeat generic Program Outcomes.",
    "Use measurable action verbs from Bloom's Taxonomy such as Analyze, Design, Develop, Evaluate, and Apply.",
    "Cover all major UI-driven program domains across the generated PSO set: ${requiredDomains.join(", ")}.",
    "Align PSOs with industry relevance, sustainability, ethics, interdisciplinary integration, and emerging technologies where applicable.",
    "Ensure outcomes are assessable and connected to real-world engineering applications.",
    "Limit the output to exactly ${count} PSOs and keep the language accreditation-ready."
  ],
  "output_format": {
    "PSOs": [
      {
        "PSO_number": "PSO1",
        "statement": "Design ...",
        "focus_area": "Domain or specialization",
        "mapped_abet_elements": ["SO1", "SO2"]
      }
    ]
  },
  "additional_guidelines": [
    "PSOs must demonstrate program-specific specialization and depth.",
    "Avoid generic PO-like statements and avoid repetition across the PSO set.",
    "Include interdisciplinary integration wherever relevant.",
    "Incorporate sustainability, ethics, and societal relevance in at least part of the PSO set.",
    "Keep statements concise, precise, measurable, and suitable for direct assessment."
  ]
}
`.trim();
}
