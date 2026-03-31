/**
 * lib/ai/mission-agent.ts
 * Mission Agent — orchestrates hybrid generation with max-3-attempt retry loop.
 *
 * Flow:
 *   for attempt 0..2:
 *     batch = Gemini candidates (if API key) + grammar templates
 *     scored = batch.map(scoreMission) [async]
 *     qualified += scored.filter(score ≥ 90 && no hard failures).deduplicate()
 *     if qualified.length >= count → break
 *   Guarantee: fill remaining with grammar templates (always ≥90)
 *   return ranked missions
 */

import { scoreMission, MissionScore, MISSION_APPROVAL_THRESHOLD } from "./mission-scoring";
import { buildGrammarMission, getAllGrammarMissions }              from "./mission-template-engine";
import { buildMissionAgentPrompt }                                 from "./mission-prompt-builder";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

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
  if (!geminiApiKey) return [];

  const prompt = buildMissionAgentPrompt({ ...rest, attempt });

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

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
  } catch {
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

    // Collect candidates: Gemini + grammar templates (fallback)
    const aiCandidates      = await fetchGeminiMissions(params, attempt);
    const templateCandidates= aiCandidates.length >= count ? [] : getAllGrammarMissions(programName);
    const batch             = [...aiCandidates, ...templateCandidates].map(normalizeWhitespace);

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

  // Guarantee: fill with grammar templates if still short
  let is_fallback = false;
  if (qualifiedStatements.length < count) {
    is_fallback = true;
    for (let i = 0; qualifiedStatements.length < count; i++) {
      const fb = buildGrammarMission(programName, i);
      if (!qualifiedStatements.some((s) => s.toLowerCase() === fb.toLowerCase())) {
        qualifiedStatements.push(fb);
        const fbScore = await scoreMission(fb, visionRef);
        qualifiedScores.push(fbScore);
      }
      if (i >= 10) break; // safety exit
    }
  }

  const ranked  = rankMissions(qualifiedStatements, qualifiedScores, count);
  const missions = ranked.map((r) => r.statement);

  return { missions, ranked, is_fallback, attempts };
}
