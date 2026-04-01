import { z } from "zod";
import { 
  buildPSOGenerationPrompt, 
  buildPSOEnforcementPrompt, 
  buildRetryPrompt, 
  buildPSOEvaluatorPrompt,
  buildCoverageAnalysisPrompt,
  PSOGenerationMode 
} from "./pso-prompt-builder";
import { 
  needsLLMClassification, 
  buildDomainClassificationPrompt 
} from "./domain-inference";
import { validatePSOs, PSOValidationResult } from "./pso-scoring";
import { resolveProgramCriteria } from "../curriculum/program-mapping";
import { callAI } from "../curriculum/ai-model-router";

// --- TYPES ---

export interface PSO {
  statement: string;
  abetMappings: string[];
  focusArea?: string;
  bloomLevel?: string;
  wkAttribute?: string;
  abetOutcome?: string;
}

export interface SelectedSocietiesInput {
  lead: string[];
  co_lead: string[];
  cooperating: string[];
}

export interface PSOAgentParams {
  programName: string;
  count?: number;
  vision?: string;
  mission?: string;
  peos?: string[];
  initialPSOs?: string[]; // Pre-seed PSOs for refinement testing
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  mode?: PSOGenerationMode;
  // NEW v4: Domain hints
  expectedDomains?: string[];
  emergingAreas?: string[];
}

export interface PSOAgentResult {
  success: boolean;
  results: PSO[];
  validation: PSOValidationResult | null;
  attempts: number;
  meta?: {
    mode: PSOGenerationMode;
    compliance: string;
    score: number;
    coverage?: any;
  };
  error?: string;
}

const MAX_ATTEMPTS = 4;

// --- SCHEMAS ---

const PSOObjectSchema = z.object({
  PSO_number: z.string().optional(),
  statement: z.string(),
  focus_area: z.string().optional(),
  bloom_level: z.string().optional(),
  wk_attribute: z.string().optional(),
  abet_outcome: z.string().optional(),
  abet_mappings: z.array(z.string()).optional()
});

const PSOResponseSchema = z.object({
  "final_psos": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "raw_psos": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "refined_psos": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "PSOs": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "psos": z.array(z.any()).optional(),
  "coverage_analysis": z.object({
    covered_domains: z.array(z.string()).optional(),
    missing_domains: z.array(z.string()).optional(),
    over_represented: z.array(z.string()).optional(),
    generic_psos: z.array(z.string()).optional(),
    emerging_covered: z.boolean().optional(),
    holistic_score: z.number().optional(),
    nba_sar_2025_compliant: z.boolean().optional(),
    remarks: z.string().optional()
  }).optional(),
  "gap_instructions": z.array(z.string()).optional(),
  "fix_summary": z.object({
    issues_detected: z.array(z.string()).optional(),
    changes_made: z.array(z.string()).optional(),
    verb_map: z.record(z.string(), z.string()).optional(),
    wk_map: z.record(z.string(), z.string()).optional(),
    final_quality: z.string().optional()
  }).optional()
}).passthrough();

// --- UTILITIES ---

/**
 * Normalizes varied AI response formats into a clean PSO array.
 */
function normalizeAIResponseToPSO(parsed: any): PSO[] {
  const data = PSOResponseSchema.safeParse(parsed);
  if (!data.success) {
    console.warn("[PSO Agent] Zod validation failed, attempting manual extraction:", data.error);
  }

  const psoList = parsed?.final_psos || 
                  parsed?.raw_psos || 
                  parsed?.refined_psos || 
                  parsed?.PSOs || 
                  parsed?.psos || 
                  [];

  return psoList.map((item: any) => {
    if (typeof item === "string") {
      return { statement: item, abetMappings: [] };
    }
    return {
      statement: item.statement || item.PSO_statement || String(item),
      abetMappings: item.abet_mappings || (item.abet_outcome ? [item.abet_outcome] : [])
    };
  }).filter((p: PSO) => p.statement.length > 10);
}

/**
 * Backend cleaning logic for PSOs.
 */
function cleanPSOs(psos: PSO[]): PSO[] {
  return psos.map(p => ({
    ...p,
    statement: p.statement
      .replace(/etc\./g, "")
      .replace(/including but not limited to/gi, "including")
      .trim()
  }));
}

/**
 * Orchestrates the generation, scoring, and refinement of PSOs.
 */
export async function psoAgent(params: PSOAgentParams): Promise<PSOAgentResult> {
  let { 
    programName, 
    count = 3, 
    vision,
    mission,
    peos,
    initialPSOs, 
    selectedSocieties, 
    focusAreas = [], 
    mode = "standard",
    expectedDomains,
    emergingAreas
  } = params;

  // 1. Domain Inference & LLM Fallback
  if (needsLLMClassification(programName)) {
    console.log(`[PSO Agent] Domain unknown for "${programName}". Running LLM classification...`);
    const classifyPrompt = buildDomainClassificationPrompt(programName);
    const classifyRaw = await callAI(classifyPrompt, "pso");
    
    try {
      const cleanJson = classifyRaw.replace(/```json/g, "").replace(/```/g, "").trim();
      const { domains } = JSON.parse(cleanJson);
      if (domains && Array.isArray(domains)) {
        focusAreas = [...new Set([...focusAreas, ...domains])];
        console.log(`[PSO Agent] LLM classified "${programName}" as components of: ${domains.join(", ")}`);
      }
    } catch (e) {
      console.warn("[PSO Agent] LLM classification failed or returned invalid JSON. Using general engineering.");
    }
  }

  const programCriteria = resolveProgramCriteria(programName);

  let bestResult: PSOAgentResult = {
    success: false,
    results: [],
    validation: null,
    attempts: 0,
    meta: { mode, compliance: "NBA Tier-I + SAR 2025", score: 0 }
  };

  let currentPSOs: PSO[] = [];
  let coverageGaps: string[] = [];

  // 0. STAGE 0: Coverage Analysis (New v4)
  // Run if initial PSOs are provided to identify what's missing
  if (initialPSOs && initialPSOs.length > 0) {
    console.log(`[PSO Agent] Stage 0: Running Coverage Analysis on existing PSOs...`);
    const coveragePrompt = buildCoverageAnalysisPrompt({
      programName,
      vision,
      mission,
      peos,
      existingPSOs: initialPSOs,
      expectedDomains,
      emergingAreas
    });

    try {
      const coverageRaw = await callAI(coveragePrompt, "pso");
      const cleanJson = coverageRaw.replace(/```json/g, "").replace(/```/g, "").trim();
      const coverageParsed = JSON.parse(cleanJson);
      
      if (coverageParsed?.gap_instructions) {
        coverageGaps = coverageParsed.gap_instructions;
        console.log(`[PSO Agent] Coverage Gaps detected:`, coverageGaps.join(" | "));
      }
      
      currentPSOs = initialPSOs.map(s => ({ statement: s, abetMappings: [] }));
      bestResult.results = currentPSOs;
      bestResult.validation = validatePSOs(currentPSOs, programName, count);
      if (bestResult.meta) {
        bestResult.meta.score = Math.round(bestResult.validation.score);
        bestResult.meta.coverage = coverageParsed.coverage_analysis;
      }
    } catch (e) {
      console.warn("[PSO Agent] Coverage Analysis failed. Proceeding to refinement.");
    }
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    bestResult.attempts = attempt;
    
    let prompt: string;
    
    // DECISION LOGIC: Generate or Refine?
    const needsInitialGen = !initialPSOs && attempt === 1;
    const previousFailed = attempt > 1 && (!bestResult.validation || currentPSOs.length === 0);

    if (needsInitialGen || previousFailed) {
      prompt = buildPSOGenerationPrompt({
        programName,
        count,
        vision,
        mission,
        peos,
        programCriteria: programCriteria || undefined,
        selectedSocieties,
        focusAreas,
        mode,
        expectedDomains,
        emergingAreas
      });
    } else {
      currentPSOs = cleanPSOs(currentPSOs);
      prompt = buildPSOEvaluatorPrompt({
        programName,
        vision,
        mission,
        peos,
        existingPSOs: currentPSOs,
        feedback: bestResult.validation || {
          passed: false,
          score: 0,
          psoAnalyses: [],
          globalIssues: ["Previous validation missing"],
          detailedDrawbacks: ["System error: lost context"]
        },
        expectedDomains,
        emergingAreas
      });
    }

    try {
      const rawText = await callAI(prompt, "pso");
      if (!rawText) throw new Error("Empty response from AI model.");

      let parsed: any;
      try {
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        console.error("[PSO Agent] JSON Parse Error. Raw response:", rawText);
        throw new Error("Invalid format: AI did not return valid JSON.");
      }
      
      let psoObjects = normalizeAIResponseToPSO(parsed);

      if (!psoObjects.length) {
        throw new Error("Incomplete response: No valid PSOs found.");
      }

      // STAGE 2 ENFORCEMENT: If this was a raw generation, immediately run enforcement
      if (parsed?.raw_psos && !parsed?.final_psos) {
        console.log(`[PSO Agent] Stage 1 complete. Running Stage 2 Enforcement audit...`);
        const enforcementPrompt = buildPSOEnforcementPrompt({
          programName,
          rawPSOs: psoObjects.map(p => p.statement),
          vision,
          mission,
          peos,
          mode,
          selectedSocieties,
          expectedDomains,
          emergingAreas,
          coverageGaps
        });

        const enforcementRaw = await callAI(enforcementPrompt, "pso");
        const enforcementClean = enforcementRaw.replace(/```json/g, "").replace(/```/g, "").trim();
        const enforcementParsed = JSON.parse(enforcementClean);
        
        psoObjects = normalizeAIResponseToPSO(enforcementParsed);
        if (enforcementParsed?.fix_summary) {
          console.log(`[PSO Agent] Enforcement Fix Summary:`, JSON.stringify(enforcementParsed.fix_summary, null, 2));
        }
        if (enforcementParsed?.coverage_analysis) {
          console.log(`[PSO Agent] Final Coverage Analysis:`, JSON.stringify(enforcementParsed.coverage_analysis, null, 2));
          if (bestResult.meta) bestResult.meta.coverage = enforcementParsed.coverage_analysis;
        }
      }

      if (parsed?.fix_summary) {
        console.log(`[PSO Agent] Auditor Fix Summary:`, JSON.stringify(parsed.fix_summary, null, 2));
      }

      const newPSOs = cleanPSOs(psoObjects);
      const validation = validatePSOs(newPSOs, programName, count);

      currentPSOs = newPSOs;
      bestResult.results = newPSOs;
      bestResult.validation = validation;
      bestResult.meta = { 
        ...bestResult.meta,
        mode, 
        compliance: validation.passed ? "High (NBA SAR 2025)" : "Needs Review",
        score: validation.score 
      };

      // v4: Agent orchestration completion logic
      // Prioritize the Stage 2 AI auditor's "Accreditation Ready" status over rule-based heuristics.
      const isAcceptableCount = Math.abs(newPSOs.length - count) <= 4; 
      const isHighQuality = validation.score >= 65; 
      const isAccreditationReady = rawText.includes("Accreditation Ready");

      if (validation.passed || (isHighQuality && isAcceptableCount) || (isAccreditationReady && isHighQuality)) {
        console.log(`[PSO Agent] Quality Target Met (Score: ${validation.score}, Count: ${newPSOs.length}/${count}). Completing orchestration.`);
        bestResult.success = true;
        break;
      }

      console.log(`[PSO Agent] Validation Failed (Score: ${validation.score}, Passed: ${validation.passed}). Retrying (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
      
    } catch (error: any) {
      console.error(`[PSO Agent] Attempt ${attempt} critical failure:`, error.message);
      bestResult.error = error.message;
    }
  }

  bestResult.success = (bestResult.meta?.score || 0) > 80;
  return bestResult;
}
