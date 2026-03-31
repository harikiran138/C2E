import { detectProgramDomain, type ProgramDomain } from "@/lib/curriculum/domain-knowledge";
import { buildPSOGenerationPrompt, buildRetryPrompt } from "@/lib/ai/pso-prompt-builder";
import { ABET_CRITERIA_DATA } from "@/lib/curriculum/abet-criteria";
import { validatePSOs, PSO, ValidationResult } from "./pso-validator";

const APPROVED_ACTION_VERBS = [
  "Apply",
  "Design",
  "Analyze",
  "Develop",
  "Evaluate",
  "Integrate",
  "Optimize",
  "Implement",
] as const;

type ApprovedActionVerb = (typeof APPROVED_ACTION_VERBS)[number];
type ABETStudentOutcome =
  | "SO1"
  | "SO2"
  | "SO3"
  | "SO4"
  | "SO5"
  | "SO6"
  | "SO7";

export interface SelectedSocietiesInput {
  lead?: string[];
  co_lead?: string[];
  coLead?: string[];
  cooperating?: string[];
}

export interface PSOAgentParams {
  programName: string;
  count: number;
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  geminiApiKey?: string;
}


export interface GeneratedPSODetail {
  statement: string;
  domain: string;
  skill: string;
  applicationContext: string;
  toolPhrase: string;
  actionVerb: ApprovedActionVerb;
  abetMappings: ABETStudentOutcome[];
  criteriaBasis: string[];
  sourceSocieties: string[];
  emergingAreas: string[];
  validation: {
    actionVerbPass: boolean;
    hasAbetMapping: boolean;
    uniqueToProgram: boolean;
  };
}

export interface PSOValidationSummary {
  sourceValidation: {
    passed: boolean;
    message: string;
    criteriaBasis: string[];
    societies: string[];
  };
  domainCoverage: {
    passed: boolean;
    required: string[];
    covered: string[];
    missing: string[];
  };
  actionVerbCheck: {
    passed: boolean;
    approvedVerbs: readonly string[];
    failures: string[];
  };
  abetMappingCheck: {
    passed: boolean;
    unmapped: string[];
  };
  uniquenessCheck: {
    passed: boolean;
    genericStatements: string[];
    highSimilarityPairs: string[];
  };
}

export interface PSOAgentResult {
  results: string[];
  details: GeneratedPSODetail[];
  validation: PSOValidationSummary;
  sources: {
    programCriteria: string[];
    societies: string[];
    emergingAreas: string[];
  };
  selectionContext: {
    lead: string[];
    coLead: string[];
    cooperating: string[];
    count: number;
  };
  prompt: string;
}

function findMatchingCriteria(programName: string) {
  const normalizedName = programName.toLowerCase();
  
  // High priority: Exact match name or contains name
  for (const p of ABET_CRITERIA_DATA.programs) {
    if (normalizedName.includes(p.name.toLowerCase())) {
      return p;
    }
  }

  // Medium priority: Keyword match
  for (const p of ABET_CRITERIA_DATA.programs) {
    if (p.match_keywords.some(kw => normalizedName.includes(kw.toLowerCase()))) {
      return p;
    }
  }

  return null;
}

function normalizeWhitespace(text: string): string {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeToken(text: string): string {
  return normalizeWhitespace(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeWhitespace).filter(Boolean)));
}

function flattenSocieties(selectedSocieties?: SelectedSocietiesInput): string[] {
  if (!selectedSocieties) return [];
  return uniqueStrings([
    ...(selectedSocieties.lead || []),
    ...(selectedSocieties.co_lead || []),
    ...(selectedSocieties.coLead || []),
    ...(selectedSocieties.cooperating || []),
  ]);
}

function normalizeSelectedSocieties(selectedSocieties?: SelectedSocietiesInput): Required<SelectedSocietiesInput> {
  return {
    lead: uniqueStrings(selectedSocieties?.lead || []),
    co_lead: uniqueStrings(selectedSocieties?.co_lead || selectedSocieties?.coLead || []),
    coLead: uniqueStrings(selectedSocieties?.coLead || selectedSocieties?.co_lead || []),
    cooperating: uniqueStrings(selectedSocieties?.cooperating || []),
  };
}


function similarityScore(left: string, right: string): number {
  const leftTokens = new Set(
    normalizeToken(left).split(/\s+/).filter((token) => token.length >= 4),
  );
  const rightTokens = new Set(
    normalizeToken(right).split(/\s+/).filter((token) => token.length >= 4),
  );

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;

  return union === 0 ? 0 : intersection / union;
}


const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function fetchGeminiPSOs(
  params: PSOAgentParams,
  criteria?: {
    statement: string;
    curriculum: string[];
    faculty: string;
  },
  customPrompt?: string,
  societyNames: string[] = []
): Promise<GeneratedPSODetail[]> {
  const { geminiApiKey, programName, count, selectedSocieties, focusAreas } =
    params;
  if (!geminiApiKey) return [];

  // Use custom prompt if provided, otherwise build from params
  const requestedCount = Math.max(count * 2, 5);
  const prompt = customPrompt || buildPSOGenerationPrompt({
    programName,
    count: requestedCount,
    programCriteria: criteria,
    selectedSocieties,
    focusAreas,
  });

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      console.error("Gemini API Error (PSO):", await res.text());
      return [];
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) return [];

    try {
      const cleaned = text.replace(/```(?:json)?|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      let generatedPSOs = [];
      if (Array.isArray(parsed.PSOs)) {
        generatedPSOs = parsed.PSOs;
      } else if (Array.isArray(parsed)) {
        generatedPSOs = parsed;
      } else if (parsed && typeof parsed === "object") {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) {
             generatedPSOs = parsed[key];
             break;
          }
        }
      }

      return generatedPSOs.map((p: any) => ({
        statement: p.statement || "",
        domain: p.focus_area || "General",
        skill: p.skill || "Engineering Analysis",
        applicationContext: p.application_context || "Industrial Practice",
        toolPhrase: p.tool_phrase || "appropriate tools",
        actionVerb: (p.action_verb || (p.statement ? p.statement.split(" ")[0] : "Apply")) as ApprovedActionVerb,
        abetMappings: Array.isArray(p.mapped_abet_elements) ? p.mapped_abet_elements : [],
        criteriaBasis: criteria ? [criteria.statement] : [],
        sourceSocieties: societyNames,
        emergingAreas: focusAreas || [],
        validation: {
          actionVerbPass: true,
          hasAbetMapping: true,
          uniqueToProgram: true,
        },
      }));
    } catch (parseError) {
      console.error("Failed to parse Gemini PSO response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Gemini fetch error (PSO):", error);
    return [];
  }
}

/**
 * Main PSO Agent Pipeline with Validation & Retry
 */
export async function psoAgent(params: PSOAgentParams): Promise<PSOAgentResult> {
  const MAX_RETRIES = 3;
  const count = Math.max(1, Math.min(10, Number(params.count || 3)));
  const matchingCriteria = findMatchingCriteria(params.programName);
  const societySelection = normalizeSelectedSocieties(params.selectedSocieties);
  const societies = flattenSocieties(societySelection);
  const focusAreas = uniqueStrings(params.focusAreas || []);

  const basePromptParams = {
    programName: params.programName,
    count,
    selectedSocieties: societySelection,
    programCriteria: matchingCriteria || undefined,
    focusAreas,
  };

  const basePrompt = buildPSOGenerationPrompt(basePromptParams);
  let currentPrompt = basePrompt;
  let lastValidation: ValidationResult | null = null;
  let lastDetails: GeneratedPSODetail[] = [];

  // --- RETRY LOOP ---
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[PSO Agent] Generation Attempt ${attempt}/${MAX_RETRIES}...`);
    
    // 1. Generate PSOs
    const details = await fetchGeminiPSOs(
      params, 
      matchingCriteria || undefined, 
      currentPrompt,
      societies
    );
    
    // 2. Uniqueness & Similarity Filter
    const seenStatements = new Set<string>();
    const uniqueDetails: GeneratedPSODetail[] = [];
    for (const detail of details) {
      if (uniqueDetails.length >= count) break;
      const normalized = detail.statement.toLowerCase().trim();
      if (seenStatements.has(normalized)) continue;
      const isTooSimilar = uniqueDetails.some(
        (existing) => similarityScore(existing.statement, detail.statement) > 0.7,
      );
      if (isTooSimilar) continue;
      seenStatements.add(normalized);
      uniqueDetails.push(detail);
    }

    lastDetails = uniqueDetails;

    // 3. Validate
    const psoValidators: PSO[] = uniqueDetails.map(d => ({
      statement: d.statement,
      sos: d.abetMappings,
      focus_area: d.domain
    }));

    const validation = validatePSOs(psoValidators, params.programName, count);
    lastValidation = validation;

    console.log(`[PSO Agent] Attempt ${attempt} Score: ${validation.score}/100`);

    if (validation.passed) {
      console.log(`[PSO Agent] Validation passed!`);
      break;
    }

    if (attempt < MAX_RETRIES) {
      console.log(`[PSO Agent] Validation failed. Retrying with feedback...`);
      currentPrompt = buildRetryPrompt(basePrompt, validation);
      // Update params for next fetch call (if it uses prompt internally)
      // Actually fetchGeminiPSOs calls buildPSOGenerationPrompt again, 
      // so we need a way to pass the retry prompt in.
      // Refactoring fetchGeminiPSOs to accept optional custom prompt.
    }
  }

  // Final Results
  const finalDetails = lastDetails;
  const psoOutputValidation: PSOValidationSummary = {
    sourceValidation: {
      passed: lastValidation?.passed ?? false,
      message: matchingCriteria ? `Aligned with ABET ${matchingCriteria.name} criteria.` : "Aligned with general ABET criteria (fallback).",
      criteriaBasis: matchingCriteria ? [matchingCriteria.statement] : [ABET_CRITERIA_DATA.fallback.statement],
      societies,
    },
    domainCoverage: {
      passed: lastValidation?.passed ?? false,
      required: matchingCriteria?.curriculum || [],
      covered: uniqueStrings(finalDetails.map(d => d.domain)),
      missing: lastValidation?.issues.filter(i => i.includes("domain")) || [],
    },
    actionVerbCheck: {
      passed: lastValidation?.passed ?? false,
      approvedVerbs: APPROVED_ACTION_VERBS,
      failures: lastValidation?.issues.filter(i => i.includes("verb")) || [],
    },
    abetMappingCheck: {
      passed: lastValidation?.passed ?? false,
      unmapped: lastValidation?.issues.filter(i => i.includes("mapping")) || [],
    },
    uniquenessCheck: {
      passed: true,
      genericStatements: [],
      highSimilarityPairs: [],
    },
  };

  return {
    results: finalDetails.map((item) => item.statement),
    details: finalDetails,
    validation: psoOutputValidation,
    sources: {
      programCriteria: matchingCriteria ? [matchingCriteria.statement] : [ABET_CRITERIA_DATA.fallback.statement],
      societies,
      emergingAreas: matchingCriteria?.curriculum || [],
    },
    selectionContext: {
      lead: societySelection.lead || [],
      coLead: societySelection.co_lead || [],
      cooperating: societySelection.cooperating || [],
      count,
    },
    prompt: currentPrompt,
  };
}
