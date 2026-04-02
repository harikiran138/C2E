/**
 * lib/ai/po-agent.ts
 * Program Outcomes Agent — 100% AI-driven generation using Gemini 2.0 Flash.
 *
 * This agent performs a multi-attempt retry loop to generate NBA/ABET-aligned
 * Program Outcomes (POs) with deep domain reasoning and semantic diversity.
 */

import { z } from "zod";
import { scorePO, POScore, PO_APPROVAL_THRESHOLD } from "./po-scoring";
import { buildPOAgentPrompt } from "./po-prompt-builder";
import { callAI } from "@/lib/curriculum/ai-model-router";

const MAX_ATTEMPTS = 3;

export interface POAgentParams {
  programName:      string;
  count:            number;
  priorities?:      string[];
  institutionName?: string;
  mission?:         string;
  peos?:            string[];
}

export interface RankedPO {
  statement:      string;
  qualityScore:   number;
  diversityBonus: number;
  finalScore:     number;
}

export interface POAgentResult {
  pos:         string[];
  ranked:      RankedPO[];
  is_fallback: boolean;
  attempts:    number;
  prompt:      string;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes varied AI response formats into a clean string array.
 */
const POResponseSchema = z.union([
  z.object({
    pos: z.array(z.string()).optional(),
    POs: z.array(z.string()).optional(),
    statements: z.array(z.string()).optional(),
    refined_pos: z.array(z.string()).optional(),
  }).passthrough(),
  z.array(z.string()),
  z.array(z.object({ statement: z.string() }).passthrough()),
]);

function normalizeAIResponse(parsed: any): string[] {
  const data = POResponseSchema.safeParse(parsed);
  if (!data.success) {
    console.warn("[PO Agent] Zod validation failed:", data.error);
  }

  const list = (parsed as any)?.pos || 
               (parsed as any)?.POs || 
               (parsed as any)?.statements || 
               (parsed as any)?.refined_pos || 
               (Array.isArray(parsed) ? parsed : []);

  return list.map((item: any) => {
    if (typeof item === "string") return item;
    if (item?.statement) return item.statement;
    return String(item);
  }).filter((s: string) => typeof s === "string" && s.length > 20);
}

function diversityBonus(candidate: string, selected: string[]): number {
  if (selected.length === 0) return 1.0;
  const cWords = new Set(
    candidate.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4),
  );
  let minOverlap = 1.0;
  for (const s of selected) {
    const sWords = new Set(
      s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4),
    );
    const intersection = Array.from(cWords).filter((w) => sWords.has(w)).length;
    const union        = new Set([...Array.from(cWords), ...Array.from(sWords)]).size;
    minOverlap = Math.min(minOverlap, union > 0 ? intersection / union : 0);
  }
  return 1 - minOverlap;
}

function rankPOs(candidates: string[], scores: POScore[], count: number): RankedPO[] {
  const ranked: RankedPO[] = [];
  const selected: string[] = [];

  const withScores = candidates.map((s, i) => ({ statement: s, score: scores[i] }));
  const sorted = withScores.sort((a, b) => b.score.score - a.score.score);

  for (const { statement, score } of sorted) {
    if (ranked.length >= count) break;
    const db    = diversityBonus(statement, selected);
    const final = 0.7 * score.score + 0.3 * db * 100;
    ranked.push({ statement, qualityScore: score.score, diversityBonus: db, finalScore: final });
    selected.push(statement);
  }

  return ranked.sort((a, b) => b.finalScore - a.finalScore);
}

async function fetchAIPOs(params: POAgentParams, attempt: number): Promise<string[]> {
  const prompt = buildPOAgentPrompt({
    programName: params.programName,
    count: params.count,
    priorities: params.priorities,
    institutionName: params.institutionName,
    mission: params.mission,
    peos: params.peos,
    attempt,
  });

  try {
    const text = await callAI(prompt, "po");

    try {
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return normalizeAIResponse(parsed);
    } catch {
      // Robust fallback to line-splitting if JSON fails
      return text
        .split("\n")
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l: string) => l.length > 20);
    }
  } catch (error) {
    console.error("[PO Agent] AI fetch failed:", error);
    return [];
  }
}

export async function poAgent(params: POAgentParams): Promise<POAgentResult> {
  const { count, priorities = [] } = params;
  const prompt = buildPOAgentPrompt({
    programName: params.programName,
    count,
    priorities,
    institutionName: params.institutionName,
    mission: params.mission,
    peos: params.peos,
    attempt: 0,
  });

  const qualifiedStatements: string[] = [];
  const qualifiedScores:     POScore[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;

    // Candidates: Gemini AI only (no static fallbacks)
    const aiCandidates    = await fetchAIPOs(params, attempt);
    const batch           = aiCandidates.map(normalizeWhitespace);

    for (const candidate of batch) {
      if (!candidate || candidate.length < 10) continue;

      const scored = scorePO(candidate);
      if (scored.score >= PO_APPROVAL_THRESHOLD && scored.hardFailures.length === 0) {
        const isDuplicate = qualifiedStatements.some(
          (q) => q.toLowerCase() === candidate.toLowerCase(),
        );
        if (!isDuplicate) {
          qualifiedStatements.push(candidate);
          qualifiedScores.push(scored);
        }
      }
    }

    if (qualifiedStatements.length >= count) break;
  }

  // No more static fallback filling
  const is_fallback = qualifiedStatements.length === 0;

  const ranked = rankPOs(qualifiedStatements, qualifiedScores, count);
  const pos    = ranked.map((r) => r.statement);

  return { pos, ranked, is_fallback, attempts, prompt };
}
