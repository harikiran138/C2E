import { z } from "zod";
import { 
  buildPSOGenerationPrompt, 
  buildPSOEnforcementPrompt, 
  buildRetryPrompt, 
  buildPSOEvaluatorPrompt,
  PSOGenerationMode 
} from "./pso-prompt-builder";
import { 
  needsLLMClassification, 
  buildDomainClassificationPrompt 
} from "./domain-inference";
import { validatePSOs, PSOValidationResult, PSO } from "./pso-scoring";
import { resolveProgramCriteria } from "../curriculum/program-mapping";
import { callAI } from "@/lib/curriculum/ai-model-router";

// --- TYPES ---

export interface SelectedSocietiesInput {
  lead: string[];
  co_lead: string[];
  cooperating: string[];
}

export interface PSOAgentParams {
  programName: string;
  count?: number;
  initialPSOs?: string[]; // Pre-seed PSOs for refinement testing
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  mode?: PSOGenerationMode;
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
  };
  error?: string;
}

const MAX_ATTEMPTS = 4;

// --- SCHEMAS ---

const PSOObjectSchema = z.object({
  statement: z.string(),
  abet_mappings: z.array(z.string()).optional()
});

const PSOResponseSchema = z.object({
  "final_psos": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "raw_psos": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "refined_psos": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "PSOs": z.array(z.union([z.string(), PSOObjectSchema])).optional(),
  "psos": z.array(z.any()).optional(),
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
      abetMappings: item.abet_mappings || item.abetMappings || []
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
  let { programName, count = 3, initialPSOs, selectedSocieties, focusAreas = [], mode = "standard" } = params;

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
    meta: { mode, compliance: "NBA Tier-I + ABET EAC", score: 0 }
  };

  let currentPSOs: PSO[] = [];

  // 1. Initial Seeding
  if (initialPSOs && initialPSOs.length > 0) {
    currentPSOs = initialPSOs.map(s => ({
      statement: s,
      abetMappings: [],
    }));
    bestResult.results = currentPSOs;
    bestResult.validation = validatePSOs(currentPSOs, programName, currentPSOs.length);
    if (bestResult.meta) bestResult.meta.score = Math.round(bestResult.validation.score);
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
        programCriteria: programCriteria || undefined,
        selectedSocieties,
        focusAreas,
        mode,
      });
    } else {
      currentPSOs = cleanPSOs(currentPSOs);
      prompt = buildPSOEvaluatorPrompt({
        programName,
        existingPSOs: currentPSOs,
        feedback: bestResult.validation || {
          passed: false,
          score: 0,
          psoAnalyses: [],
          globalIssues: ["Previous validation missing"],
          detailedDrawbacks: ["System error: lost context"]
        }
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
          mode,
          selectedSocieties
        });

        const enforcementRaw = await callAI(enforcementPrompt, "pso");
        const enforcementClean = enforcementRaw.replace(/```json/g, "").replace(/```/g, "").trim();
        const enforcementParsed = JSON.parse(enforcementClean);
        
        psoObjects = normalizeAIResponseToPSO(enforcementParsed);
        if (enforcementParsed?.fix_summary) {
          console.log(`[PSO Agent] Enforcement Fix Summary:`, JSON.stringify(enforcementParsed.fix_summary, null, 2));
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
        mode, 
        compliance: validation.passed ? "High" : "Needs Review",
        score: validation.score 
      };

      if (validation.passed) {
        bestResult.success = true;
        break;
      }

      console.log(`[PSO Agent] Score ${validation.score} below target 80. Retrying...`);
      
    } catch (error: any) {
      console.error(`[PSO Agent] Attempt ${attempt} critical failure:`, error.message);
      bestResult.error = error.message;
      // We continue the loop to retry, potentially falling back to Generation prompt
    }
  }

  bestResult.success = (bestResult.meta?.score || 0) > 80;
  return bestResult;
}
