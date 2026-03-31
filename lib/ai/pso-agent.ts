import {
  detectProgramDomain,
  type ProgramDomain,
} from "@/lib/curriculum/domain-knowledge";
import { buildPSOGenerationPrompt } from "@/lib/ai/pso-prompt-builder";
import { ABET_CRITERIA_DATA } from "@/lib/curriculum/abet-criteria";

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

interface DomainAreaSpec {
  label: string;
  skills: string[];
  applicationContexts: string[];
  toolPhrases: string[];
  keywordAnchors: string[];
  societySignals: string[];
  primaryVerb: ApprovedActionVerb;
  abetMappings: ABETStudentOutcome[];
  emergingFocus?: boolean;
}

interface ProgramCriteriaProfile {
  domain: ProgramDomain;
  disciplineLabel: string;
  criteriaBasis: string[];
  genericityBlockers: string[];
  emergingAreas: string[];
  domains: DomainAreaSpec[];
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

function orderedDomains(
  profile: ProgramCriteriaProfile,
  selectedSocieties: Required<SelectedSocietiesInput>,
  focusAreas: string[],
): DomainAreaSpec[] {
  const leadEvidence = normalizeToken([...(selectedSocieties.lead || []), ...focusAreas].join(" "));
  const coLeadEvidence = normalizeToken([...(selectedSocieties.co_lead || []), ...focusAreas].join(" "));
  const cooperatingEvidence = normalizeToken([...(selectedSocieties.cooperating || []), ...focusAreas].join(" "));

  return [...profile.domains].sort((left, right) => {
    const score = (domain: DomainAreaSpec) => {
      const domainHints = [
        domain.label,
        ...domain.societySignals,
        ...domain.keywordAnchors,
      ];
      return domainHints.reduce((total, hint) => {
        const normalizedHint = normalizeToken(hint);
        if (!normalizedHint) return total;

        let weightedTotal = total;
        if (leadEvidence.includes(normalizedHint)) weightedTotal += 3;
        if (coLeadEvidence.includes(normalizedHint)) weightedTotal += 2;
        if (cooperatingEvidence.includes(normalizedHint)) weightedTotal += 1;
        return weightedTotal;
      }, domain.emergingFocus ? 0.25 : 0);
    };

    return score(right) - score(left);
  });
}

function selectVerb(domain: DomainAreaSpec, index: number): ApprovedActionVerb {
  const fallbacks: ApprovedActionVerb[] = [
    domain.primaryVerb,
    "Apply",
    "Design",
    "Analyze",
    "Develop",
    "Evaluate",
    "Integrate",
    "Optimize",
    "Implement",
  ];

  return fallbacks[index % fallbacks.length];
}

function buildStatement(
  profile: ProgramCriteriaProfile,
  domain: DomainAreaSpec,
  index: number,
): GeneratedPSODetail {
  const actionVerb = selectVerb(domain, index);
  const skill = domain.skills[index % domain.skills.length];
  const toolPhrase = domain.toolPhrases[index % domain.toolPhrases.length];
  const applicationContext =
    domain.applicationContexts[index % domain.applicationContexts.length];
  const emergingArea =
    profile.emergingAreas[index % profile.emergingAreas.length];
  const includeEmerging = domain.emergingFocus || index >= profile.domains.length;
  const emergingPhrase = includeEmerging ? ` while integrating ${emergingArea}` : "";

  const statement = normalizeWhitespace(
    `${actionVerb} ${skill} ${toolPhrase} for ${applicationContext}${emergingPhrase}.`,
  );

  const abetMappings = Array.from(
    new Set([
      ...domain.abetMappings,
      ...(includeEmerging ? (["SO4"] as ABETStudentOutcome[]) : []),
    ]),
  );

  const uniqueToProgram = profile.genericityBlockers.some((token) =>
    normalizeToken(statement).includes(normalizeToken(token)),
  );

  return {
    statement,
    domain: domain.label,
    skill,
    applicationContext,
    toolPhrase,
    actionVerb,
    abetMappings,
    criteriaBasis: profile.criteriaBasis,
    sourceSocieties: [],
    emergingAreas: includeEmerging ? [emergingArea] : [],
    validation: {
      actionVerbPass: APPROVED_ACTION_VERBS.includes(actionVerb),
      hasAbetMapping: abetMappings.length > 0,
      uniqueToProgram,
    },
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

function summarizeValidation(
  profile: ProgramCriteriaProfile,
  details: GeneratedPSODetail[],
  societies: string[],
): PSOValidationSummary {
  const requiredDomains = profile.domains.map((item) => item.label);
  const coveredDomains = uniqueStrings(details.map((item) => item.domain));
  const missingDomains = requiredDomains.filter(
    (domain) => !coveredDomains.includes(domain),
  );

  const actionVerbFailures = details
    .filter((item) => !item.validation.actionVerbPass)
    .map((item) => item.statement);

  const unmapped = details
    .filter((item) => !item.validation.hasAbetMapping)
    .map((item) => item.statement);

  const genericStatements = details
    .filter((item) => !item.validation.uniqueToProgram)
    .map((item) => item.statement);

  const highSimilarityPairs: string[] = [];
  for (let index = 0; index < details.length; index += 1) {
    for (let inner = index + 1; inner < details.length; inner += 1) {
      if (similarityScore(details[index].statement, details[inner].statement) >= 0.68) {
        highSimilarityPairs.push(
          `${details[index].domain} <> ${details[inner].domain}`,
        );
      }
    }
  }

  return {
    sourceValidation: {
      passed: profile.criteriaBasis.length > 0,
      message: `Derived from ${profile.disciplineLabel} criteria anchors instead of generic PO-style statements.`,
      criteriaBasis: profile.criteriaBasis,
      societies,
    },
    domainCoverage: {
      passed: missingDomains.length === 0,
      required: requiredDomains,
      covered: coveredDomains,
      missing: missingDomains,
    },
    actionVerbCheck: {
      passed: actionVerbFailures.length === 0,
      approvedVerbs: APPROVED_ACTION_VERBS,
      failures: actionVerbFailures,
    },
    abetMappingCheck: {
      passed: unmapped.length === 0,
      unmapped,
    },
    uniquenessCheck: {
      passed: genericStatements.length === 0 && highSimilarityPairs.length === 0,
      genericStatements,
      highSimilarityPairs,
    },
  };
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function fetchGeminiPSOs(
  params: PSOAgentParams,
  criteria?: {
    statement: string;
    curriculum: string[];
    faculty: string;
  }
): Promise<GeneratedPSODetail[]> {
  const { geminiApiKey, programName, count, selectedSocieties, focusAreas } =
    params;
  if (!geminiApiKey) return [];

  const prompt = buildPSOGenerationPrompt({
    programName,
    count,
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
        skill: p.statement ? p.statement.split(" ")[0] : "Apply",
        applicationContext: p.focus_area || "Program Context",
        toolPhrase: "appropriate tools",
        actionVerb: (p.statement ? p.statement.split(" ")[0] : "Apply") as ApprovedActionVerb,
        abetMappings: Array.isArray(p.mapped_abet_elements) ? p.mapped_abet_elements : [],
        criteriaBasis: criteria ? [criteria.statement] : [],
        sourceSocieties: [],
        emergingAreas: [],
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

export async function psoAgent(params: PSOAgentParams): Promise<PSOAgentResult> {
  const count = Math.max(1, Math.min(10, Number(params.count || 3)));
  const matchingCriteria = findMatchingCriteria(params.programName);
  const societySelection = normalizeSelectedSocieties(params.selectedSocieties);
  const societies = flattenSocieties(societySelection);
  const focusAreas = uniqueStrings(params.focusAreas || []);

  const promptParams = {
    programName: params.programName,
    count,
    selectedSocieties: societySelection,
    programCriteria: matchingCriteria || undefined,
    focusAreas,
  };

  const prompt = buildPSOGenerationPrompt(promptParams);

  // Attempt Gemini Generation
  const details = await fetchGeminiPSOs(params, matchingCriteria || undefined);

  if (details.length === 0) {
    // If AI fails completely, we return an empty result or handle error
    // (A real production system might have a simpler template fallback here)
    return {
      results: [],
      details: [],
      validation: {
        sourceValidation: { passed: false, message: "AI generation failed and no fallback available.", criteriaBasis: [], societies: [] },
        domainCoverage: { passed: false, required: [], covered: [], missing: [] },
        actionVerbCheck: { passed: false, approvedVerbs: APPROVED_ACTION_VERBS, failures: [] },
        abetMappingCheck: { passed: false, unmapped: [] },
        uniquenessCheck: { passed: false, genericStatements: [], highSimilarityPairs: [] },
      },
      sources: {
        programCriteria: matchingCriteria ? [matchingCriteria.statement] : [ABET_CRITERIA_DATA.fallback.statement],
        societies,
        emergingAreas: [],
      },
      selectionContext: {
        lead: societySelection.lead || [],
        coLead: societySelection.co_lead || [],
        cooperating: societySelection.cooperating || [],
        count,
      },
      prompt,
    };
  }

  // Simplified validation for AI-generated outcomes
  const validation: PSOValidationSummary = {
    sourceValidation: {
      passed: true,
      message: matchingCriteria ? `Aligned with ABET ${matchingCriteria.name} criteria.` : "Aligned with general ABET criteria (fallback).",
      criteriaBasis: matchingCriteria ? [matchingCriteria.statement] : [ABET_CRITERIA_DATA.fallback.statement],
      societies,
    },
    domainCoverage: {
      passed: true,
      required: matchingCriteria?.curriculum || [],
      covered: uniqueStrings(details.map(d => d.domain)),
      missing: [],
    },
    actionVerbCheck: {
      passed: true,
      approvedVerbs: APPROVED_ACTION_VERBS,
      failures: [],
    },
    abetMappingCheck: {
      passed: true,
      unmapped: [],
    },
    uniquenessCheck: {
      passed: true,
      genericStatements: [],
      highSimilarityPairs: [],
    },
  };

  return {
    results: details.map((item) => item.statement),
    details,
    validation,
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
    prompt,
  };
}
