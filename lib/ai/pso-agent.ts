import { z } from "zod";
import { 
  buildPSOGenerationPrompt, 
  buildRetryPrompt, 
  buildPSOEvaluatorPrompt,
  PSOGenerationMode 
} from "./pso-prompt-builder";
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

const PSOResponseSchema = z.object({
  final_psos: z.array(z.string()).optional(),
  refined_psos: z.array(z.string()).optional(),
  PSOs: z.array(z.union([z.string(), z.object({ statement: z.string() })])).optional(),
  psos: z.array(z.any()).optional(),
  fix_summary: z.object({
    issues_detected: z.array(z.string()).optional(),
    changes_made: z.array(z.string()).optional(),
    final_quality: z.string().optional()
  }).optional()
}).passthrough();

// --- UTILITIES ---

/**
 * Normalizes varied AI response formats into a clean string array.
 */
function normalizeAIResponse(parsed: any): string[] {
  const data = PSOResponseSchema.safeParse(parsed);
  if (!data.success) {
    console.warn("[PSO Agent] Zod validation failed, attempting manual extraction:", data.error);
  }

  const psoList = parsed?.final_psos || 
                  parsed?.refined_psos || 
                  parsed?.PSOs || 
                  parsed?.psos || 
                  [];

  return psoList.map((item: any) => {
    if (typeof item === "string") return item;
    if (item?.statement) return item.statement;
    if (item?.PSO_statement) return item.PSO_statement;
    return String(item);
  }).filter((s: string) => typeof s === "string" && s.length > 10); // Filter out junk
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
  const { programName, count = 3, initialPSOs, selectedSocieties, focusAreas = [], mode = "standard" } = params;

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
      
      const psoStrings = normalizeAIResponse(parsed);

      if (!psoStrings.length) {
        throw new Error("Incomplete response: No valid PSOs found.");
      }

      if (parsed?.fix_summary) {
        console.log(`[PSO Agent] Auditor Fix Summary:`, JSON.stringify(parsed.fix_summary, null, 2));
      }

      const newPSOs: PSO[] = psoStrings.map((s, i) => {
        const existing = currentPSOs[i];
        return {
          statement: s,
          abetMappings: existing?.abetMappings || [],
          focusArea: existing?.focusArea,
          skill: existing?.skill,
        };
      });

      const validation = validatePSOs(newPSOs, programName, newPSOs.length);

      currentPSOs = newPSOs;
      bestResult.results = newPSOs;
      bestResult.validation = validation;
      if (bestResult.meta) bestResult.meta.score = Math.round(validation.score);

      // HURDLE CHECK
      if (validation.score > 80 && validation.globalIssues.length === 0) {
        bestResult.success = true;
        console.log(`[PSO Agent] Target score reached: ${validation.score} (Attempt ${attempt})`);
        return bestResult;
      } else {
        console.log(`[PSO Agent] Score ${validation.score} below target 80. Retrying...`);
      }
      
    } catch (error: any) {
      console.error(`[PSO Agent] Attempt ${attempt} critical failure:`, error.message);
      bestResult.error = error.message;
      // We continue the loop to retry, potentially falling back to Generation prompt
    }
  }

  bestResult.success = (bestResult.meta?.score || 0) > 80;
  return bestResult;
}
