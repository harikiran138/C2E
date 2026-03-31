/**
 * lib/ai/peo-agent.ts
 * PEO Agent — 100% AI-driven generation using Gemini 2.0 Flash.
 *
 * This agent performs a multi-attempt retry loop to generate NBA/ABET-aligned
 * Program Educational Objectives (PEOs) with deep domain reasoning and semantic diversity.
 */

import { scorePEO, PEOScore, PEO_APPROVAL_THRESHOLD } from "./peo-scoring";
import { buildPEOAgentPrompt } from "./peo-prompt-builder";
import { callAI } from "@/lib/curriculum/ai-model-router";

const MAX_ATTEMPTS = 3;

export interface PEOAgentParams {
  programName:      string;
  priorities?:      string[];
  count:            number;
  institutionName?: string;
  geminiApiKey?:    string;
}

export interface RankedPEO {
  statement:      string;
  qualityScore:   number;
  diversityBonus: number;
  finalScore:     number;
}

export interface PEOAgentResult {
  peos:        string[];
  ranked:      RankedPEO[];
  is_fallback: boolean;
  attempts:    number;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
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

function rankPEOs(candidates: string[], scores: PEOScore[], count: number): RankedPEO[] {
  const ranked: RankedPEO[] = [];
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

async function fetchGeminiPEOs(params: PEOAgentParams, attempt: number): Promise<string[]> {
  const { geminiApiKey, ...rest } = params;

  const priorities = rest.priorities?.length ? rest.priorities : ["Career Growth", "Technical Excellence", "Leadership", "Ethical Responsibility"];
  const prompt     = buildPEOAgentPrompt({ ...rest, priorities, attempt });

  try {
    const text = await callAI(prompt, "peo");

    try {
      const cleaned = text.replace(/```(?:json)?|```/g, "").trim();
      const parsed  = JSON.parse(cleaned);
      let arr: any[] = [];
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else if (parsed && typeof parsed === "object") {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) { arr = parsed[key]; break; }
        }
      }
      return arr.map(String).filter((s) => s.length > 10);
    } catch {
      return text
        .split("\n")
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l: string) => l.length > 20);
    }
  } catch (error) {
    console.error("[PEO Agent] AI fetch failed:", error);
    return [];
  }
}

export async function peoAgent(params: PEOAgentParams): Promise<PEOAgentResult> {
  const { programName, count } = params;
  const priorities = params.priorities?.length ? params.priorities : [];

  const qualifiedStatements: string[] = [];
  const qualifiedScores:     PEOScore[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;

    const aiCandidates       = await fetchGeminiPEOs({ ...params, priorities }, attempt);
    const batch              = aiCandidates.map(normalizeWhitespace);

    for (const candidate of batch) {
      if (!candidate || candidate.length < 20) continue;

      const scored = scorePEO(candidate);
      if (scored.score >= PEO_APPROVAL_THRESHOLD && scored.hardFailures.length === 0) {
        const isDuplicate = qualifiedStatements.some(
          (q) => q.toLowerCase() === candidate.toLowerCase(),
        );
        if (!isDuplicate) {
          qualifiedStatements.push(candidate);
          qualifiedScores.push(scored);
        }
      } else {
        console.log(`[DEBUG] Rejected PEO: "${candidate}" | Score: ${scored.score} | Fails: ${scored.hardFailures.join(", ")}`);
      }
    }

    if (qualifiedStatements.length >= count) break;
  }

  // No static fallback filling
  const is_fallback = qualifiedStatements.length === 0;

  const ranked = rankPEOs(qualifiedStatements, qualifiedScores, count);
  const peos   = ranked.map((r) => r.statement);

  return { peos, ranked, is_fallback, attempts };
}
