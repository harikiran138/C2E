/**
 * lib/ai/mission-agent.ts
 * Mission Agent — 100% AI-driven generation using Gemini 2.0 Flash.
 *
 * This agent performs a multi-attempt retry loop to generate NBA/ABET-aligned
 * Mission statements with deep domain reasoning and semantic diversity.
 */

import { scoreMission, MissionScore, MISSION_APPROVAL_THRESHOLD } from "./mission-scoring";
import { buildMissionAgentPrompt } from "./mission-prompt-builder";
import { callAI } from "@/lib/curriculum/ai-model-router";

const MAX_ATTEMPTS = 3;

export interface MissionAgentParams {
  programName:      string;
  priorities:       string[];
  count:            number;
  visionRef?:       string;
  institutionName?: string;
  geminiApiKey?:    string;
}

export interface RankedMission {
  statement:      string;
  qualityScore:   number;
  diversityBonus: number;
  finalScore:     number;
}

export interface MissionAgentResult {
  missions:    string[];
  ranked:      RankedMission[];
  is_fallback: boolean;
  attempts:    number;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Simple lexical diversity bonus — fraction of unique word roots not in top-ranked missions. */
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
    const intersection = [...cWords].filter((w) => sWords.has(w)).length;
    const union        = new Set([...cWords, ...sWords]).size;
    minOverlap = Math.min(minOverlap, union > 0 ? intersection / union : 0);
  }
  return 1 - minOverlap;
}

function rankMissions(
  candidates: string[],
  scores:     MissionScore[],
  count:      number,
): RankedMission[] {
  const ranked: RankedMission[] = [];
  const selected: string[] = [];

  const withScores = candidates.map((s, i) => ({ statement: s, score: scores[i] }));
  const sorted = withScores.sort((a, b) => b.score.score - a.score.score);

  for (const { statement, score } of sorted) {
    if (ranked.length >= count) break;
    const db        = diversityBonus(statement, selected);
    const final     = 0.7 * score.score + 0.3 * db * 100;
    ranked.push({ statement, qualityScore: score.score, diversityBonus: db, finalScore: final });
    selected.push(statement);
  }

  return ranked.sort((a, b) => b.finalScore - a.finalScore);
}

async function fetchGeminiMissions(
  params:  MissionAgentParams,
  attempt: number,
): Promise<string[]> {
  const { geminiApiKey, ...rest } = params;

  const prompt = buildMissionAgentPrompt({ ...rest, attempt });

  try {
    const text = await callAI(prompt, "mission");

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
      return arr.map(String).filter((s) => s.length > 20);
    } catch {
      return text
        .split("\n")
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l: string) => l.length > 20);
    }
  } catch (error) {
    console.error("[Mission Agent] AI fetch failed:", error);
    return [];
  }
}

export async function missionAgent(params: MissionAgentParams): Promise<MissionAgentResult> {
  const { programName, count, visionRef = "" } = params;

  const qualifiedStatements: string[] = [];
  const qualifiedScores:     MissionScore[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;

    // Collect candidates: Gemini AI only (no static fallbacks)
    const aiCandidates      = await fetchGeminiMissions(params, attempt);
    const batch             = aiCandidates.map(normalizeWhitespace);

    for (const candidate of batch) {
      if (!candidate || candidate.length < 30) continue;

      const scored = await scoreMission(candidate, visionRef);
      if (scored.score >= MISSION_APPROVAL_THRESHOLD && scored.hardFailures.length === 0) {
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

  // No static fallback filling
  const is_fallback = qualifiedStatements.length === 0;

  const ranked  = rankMissions(qualifiedStatements, qualifiedScores, count);
  const missions = ranked.map((r) => r.statement);

  return { missions, ranked, is_fallback, attempts };
}
