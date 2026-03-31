/**
 * lib/ai/pso-agent.ts
 * Advanced autonomous agent for generating Program Specific Outcomes (PSOs).
 */

import { buildPSOGenerationPrompt, buildRetryPrompt, PSOGenerationMode } from "./pso-prompt-builder";
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
 */
export async function psoAgent(params: PSOAgentParams): Promise<PSOAgentResult> {
  const { programName, count = 3, selectedSocieties, focusAreas = [], mode = "standard" } = params;

  // Resolve relevant ABET program criteria (with alias mapping and domain merging)
  const programCriteria = resolveProgramCriteria(programName);

  let currentPrompt = buildPSOGenerationPrompt({
    programName,
    count,
    programCriteria: programCriteria || undefined,
    selectedSocieties,
    focusAreas,
    mode,
  });

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

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    bestResult.attempts = attempt;
    
    try {
      const rawText = await callAI(currentPrompt, "pso");
      
      if (!rawText) throw new Error("Empty response from AI model.");

      // Parse JSON (handle potential markdown blocks)
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      const psos: PSO[] = (parsed.PSOs || parsed.psos || []).map((p: any) => ({
        statement: p.statement || p.PSO_statement,
        abetMappings: p.mapped_abet_elements || p.abetMappings || [],
        focusArea: p.focus_area,
        skill: p.skill,
      }));

      // Validate and Score
      const validation = validatePSOs(psos, programName, count);
      
      bestResult.results = psos;
      bestResult.validation = validation;
      if (bestResult.meta) bestResult.meta.score = Math.round(validation.score);

      if (validation.passed) {
        bestResult.success = true;
        return bestResult;
      }

      // If not passed, build retry prompt with feedback and previous attempt data
      currentPrompt = buildRetryPrompt(currentPrompt, validation, psos);
      
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      bestResult.error = error.message;
      if (attempt === MAX_ATTEMPTS) break;
    }
  }

  // If we reach here, we either ran out of attempts or the results are "best effort" (unpassed)
  bestResult.success = bestResult.results.length > 0;
  return bestResult;
}
