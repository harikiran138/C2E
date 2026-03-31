/**
 * lib/ai/po-agent.ts
 * Program Outcomes Agent — orchestrates hybrid generation with max-3-attempt retry.
 *
 * For POs, the standard NBA/ABET 12 outcomes are always available as guaranteed
 * fallbacks. The agent tries Gemini first, then fills from standard POs.
 */

import { scorePO, POScore, PO_APPROVAL_THRESHOLD }           from "./po-scoring";
import { buildStandardPO, STANDARD_PO_STATEMENTS, getCustomPOs } from "./po-template-engine";
import { buildPOAgentPrompt } from "./po-prompt-builder";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const MAX_ATTEMPTS = 3;

export interface POAgentParams {
  programName:      string;
  count:            number;
  priorities?:      string[];
  institutionName?: string;
  geminiApiKey?:    string;
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

async function fetchGeminiPOs(params: POAgentParams, attempt: number): Promise<string[]> {
  const { geminiApiKey } = params;
  if (!geminiApiKey) return [];

  const prompt = buildPOAgentPrompt({
    programName: params.programName,
    count: params.count,
    priorities: params.priorities,
    institutionName: params.institutionName,
    attempt,
  });

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
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
      return arr.map(String).filter((s) => s.length > 10);
    } catch {
      return text
        .split("\n")
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l: string) => l.length > 10);
    }
  } catch {
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
    attempt: 0,
  });

  const qualifiedStatements: string[] = [];
  const qualifiedScores:     POScore[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;

    // Candidates: Gemini + custom theme POs (fallback)
    const aiCandidates    = await fetchGeminiPOs(params, attempt);
    const customCandidates= aiCandidates.length >= count ? [] : getCustomPOs(priorities);
    const batch           = [...aiCandidates, ...customCandidates].map(normalizeWhitespace);

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

  // Guarantee: fill with standard NBA/ABET POs
  let is_fallback = false;
  if (qualifiedStatements.length < count) {
    is_fallback = true;
    let si = 0;
    while (qualifiedStatements.length < count && si < STANDARD_PO_STATEMENTS.length) {
      const fb = buildStandardPO(si);
      if (!qualifiedStatements.some((s) => s.toLowerCase() === fb.toLowerCase())) {
        qualifiedStatements.push(fb);
        qualifiedScores.push(scorePO(fb));
      }
      si++;
    }
  }

  const ranked = rankPOs(qualifiedStatements, qualifiedScores, count);
  const pos    = ranked.map((r) => r.statement);

  return { pos, ranked, is_fallback, attempts, prompt };
}
