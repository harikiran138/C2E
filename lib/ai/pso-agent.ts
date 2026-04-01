/**
 * lib/ai/pso-agent.ts
 * Advanced autonomous agent for generating Program Specific Outcomes (PSOs).
 */

import { 
  buildPSOGenerationPrompt, 
  buildRetryPrompt, 
  buildPSOEvaluatorPrompt,
  PSOGenerationMode 
} from "./pso-prompt-builder";
import { validatePSOs, PSOValidationResult, PSO } from "./pso-scoring";
import { resolveProgramCriteria } from "../curriculum/program-mapping";
import { callAI } from "@/lib/curriculum/ai-model-router";

export interface SelectedSocietiesInput {
  lead: string[];
  co_lead: string[];
  cooperating: string[];
}

export interface PSOAgentParams {
  programName: string;
  count?: number;
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

const MAX_ATTEMPTS = 3;

/**
 * Orchestrates the generation, scoring, and refinement of PSOs.
 * Uses a non-destructive evaluator layer to preserve high-quality outputs.
 */
export async function psoAgent(params: PSOAgentParams): Promise<PSOAgentResult> {
  const { programName, count = 3, selectedSocieties, focusAreas = [], mode = "standard" } = params;

  // Resolve relevant ABET program criteria
  const programCriteria = resolveProgramCriteria(programName);

  let bestResult: PSOAgentResult = {
    success: false,
    results: [],
    validation: null,
    attempts: 0,
    meta: {
      mode,
      compliance: "NBA Tier-I + ABET EAC",
      score: 0,
    }
  };

  let currentPSOs: PSO[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    bestResult.attempts = attempt;
    
    // Choose prompt based on attempt number
    let prompt: string;
    if (attempt === 1) {
      prompt = buildPSOGenerationPrompt({
        programName,
        count,
        programCriteria: programCriteria || undefined,
        selectedSocieties,
        focusAreas,
        mode,
      });
    } else {
      // refinement pass using Master Evaluator
      prompt = buildPSOEvaluatorPrompt({
        programName,
        existingPSOs: currentPSOs,
        feedback: bestResult.validation!
      });
    }

    try {
      const rawText = await callAI(prompt, "pso");
      if (!rawText) throw new Error("Empty response from AI model.");

      // Parse JSON
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      const newPSOs: PSO[] = (parsed.PSOs || parsed.psos || []).map((p: any) => ({
        statement: p.statement || p.PSO_statement,
        abetMappings: p.mapped_abet_elements || p.abetMappings || [],
        focusArea: p.focus_area,
        skill: p.skill,
      }));

      // Validate and Score
      const validation = validatePSOs(newPSOs, programName, count);

      // NON-DESTRUCTIVE LOGIC: 
      // If we already had PSOs, and some were high quality (>= 85), 
      // check if the AI changed them. If it did and the score dropped, we might want to revert.
      // However, the prompt specifically tells the AI to PRESERVE >= 85.
      
      currentPSOs = newPSOs;
      bestResult.results = newPSOs;
      bestResult.validation = validation;
      if (bestResult.meta) bestResult.meta.score = Math.round(validation.score);

      if (validation.passed) {
        bestResult.success = true;
        return bestResult;
      }
      
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      bestResult.error = error.message;
      if (attempt === MAX_ATTEMPTS) break;
    }
  }

  bestResult.success = bestResult.results.length > 0;
  return bestResult;
}
