import { NextRequest, NextResponse } from "next/server";
import { getTechnologyTrendSnapshot } from "@/lib/curriculum/technology-trend-engine";
import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";
import { callAI } from "@/lib/curriculum/ai-model-router";

const SYSTEM_PROMPT = `You are an expert academic curriculum advisor for Indian engineering universities. Recommend curriculum distribution aligned with NEP 2020, AICTE guidelines, and industry trends.

You must return valid JSON only — no markdown, no explanations outside the JSON structure.

Constraints:
- categoryDistribution percentages (BS, ES, HSS, PC, PE, OE, MC, AE, SE, PR) must sum to exactly 100
- MC (Mandatory/Audit Courses) should be 0
- Recommendations must be realistic for Indian engineering programs
- Align with NEP 2020 multidisciplinary and credit framework requirements
- Align with AICTE model curriculum guidelines`;

interface AdvisorRequestBody {
  programType?: string;
  industryFocus?: string;
  specialization?: string;
  totalCredits?: number;
  semesterCount?: number;
}

interface CategoryDistribution {
  BS: number;
  ES: number;
  HSS: number;
  PC: number;
  PE: number;
  OE: number;
  MC: number;
  AE: number;
  SE: number;
  PR: number;
}

interface AdvisorRecommendations {
  categoryDistribution: CategoryDistribution;
  recommendedElectives: string[];
  modernSubjects: Record<string, string[]>;
  advisorNotes: string;
  trendSnapshot?: {
    domain: string;
    generatedAt: string;
    coreTrendSkills: Array<{ topic: string; relevance: "high" | "medium" }>;
    suggestedElectives: string[];
    suggestedSkillModules: string[];
    sources: Array<{ name: string; note: string }>;
  };
}

function normalizeDistributionToHundred(
  dist: CategoryDistribution,
): CategoryDistribution {
  const keys: Array<keyof CategoryDistribution> = [
    "BS",
    "ES",
    "HSS",
    "PC",
    "PE",
    "OE",
    "AE",
    "SE",
    "PR",
  ];

  const normalized: CategoryDistribution = {
    BS: Math.max(0, Math.round(Number(dist.BS || 0))),
    ES: Math.max(0, Math.round(Number(dist.ES || 0))),
    HSS: Math.max(0, Math.round(Number(dist.HSS || 0))),
    PC: Math.max(0, Math.round(Number(dist.PC || 0))),
    PE: Math.max(0, Math.round(Number(dist.PE || 0))),
    OE: Math.max(0, Math.round(Number(dist.OE || 0))),
    MC: 0,
    AE: Math.max(0, Math.round(Number(dist.AE || 0))),
    SE: Math.max(0, Math.round(Number(dist.SE || 0))),
    PR: Math.max(0, Math.round(Number(dist.PR || 0))),
  };

  const currentTotal = keys.reduce((sum, key) => sum + normalized[key], 0);
  const delta = 100 - currentTotal;
  if (delta === 0) return normalized;

  const largestKey = keys.sort((a, b) => normalized[b] - normalized[a])[0] || "PC";
  normalized[largestKey] = Math.max(0, normalized[largestKey] + delta);
  return normalized;
}

function buildUserPrompt(
  programType: string,
  industryFocus: string,
  specialization: string,
  totalCredits: number,
  semesterCount: number,
): string {
  const guardrails = buildCurriculumAIGuardrailsPrompt(`${programType} ${specialization}`);

  return `Recommend a curriculum distribution for the following engineering program:

Program Type: ${programType}
Industry Focus: ${industryFocus}
Specialization: ${specialization}
Total Credits: ${totalCredits}
Semester Count: ${semesterCount}

Return a JSON object with this exact structure:
{
  "categoryDistribution": {
    "BS": <number>,
    "ES": <number>,
    "HSS": <number>,
    "PC": <number>,
    "PE": <number>,
    "OE": <number>,
    "MC": 0,
    "AE": <number>,
    "SE": <number>,
    "PR": <number>
  },
  "recommendedElectives": [<array of 6-10 elective course names as strings>],
  "modernSubjects": {
    "BS": [<2-4 modern/emerging subjects suitable for this category>],
    "ES": [<2-4 modern/emerging subjects>],
    "PC": [<3-5 core subjects specific to ${programType}>],
    "PE": [<4-6 professional elective subjects for ${specialization}>],
    "SE": [<2-4 skill enhancement lab subjects>]
  },
  "advisorNotes": "<2-3 sentences of key curriculum advice for this program type, industry focus, and specialization>"
}

Requirements:
- All categoryDistribution values must be non-negative integers that sum to exactly 100
- MC must be 0
- BS should be 20-25%
- HSS should be 8-15%
- PC should be 25-35% for technical programs
- PE should be 6-12%
- PR should be 4-10%
- Tailor recommendations to ${programType} program with ${industryFocus} industry focus

Program-specific curriculum guardrails:
${guardrails}`;
}

function validateCategoryDistribution(dist: Record<string, unknown>): dist is CategoryDistribution & Record<string, number> {
  const required = ["BS", "ES", "HSS", "PC", "PE", "OE", "MC", "AE", "SE", "PR"];
  for (const key of required) {
    if (typeof dist[key] !== "number" || !Number.isFinite(dist[key])) {
      return false;
    }
  }
  return true;
}


function safeJsonParse(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseGeminiPayload(raw: string): AdvisorRecommendations | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed = safeJsonParse(cleaned);

  if (!parsed) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      parsed = safeJsonParse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }

  if (!parsed) return null;

  const dist = parsed.categoryDistribution as Record<string, unknown>;
  if (!dist || !validateCategoryDistribution(dist)) return null;

  const electives = Array.isArray(parsed.recommendedElectives)
    ? (parsed.recommendedElectives as unknown[]).filter((e) => typeof e === "string").map(String)
    : [];

  const modernSubjects: Record<string, string[]> = {};
  if (parsed.modernSubjects && typeof parsed.modernSubjects === "object") {
    for (const [key, val] of Object.entries(parsed.modernSubjects as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        modernSubjects[key] = val.filter((v) => typeof v === "string").map(String);
      }
    }
  }

  return {
    categoryDistribution: dist,
    recommendedElectives: electives,
    modernSubjects,
    advisorNotes: typeof parsed.advisorNotes === "string" ? parsed.advisorNotes : "",
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: AdvisorRequestBody;
  try {
    body = (await request.json()) as AdvisorRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const programType = String(body.programType || "").trim();
  const industryFocus = String(body.industryFocus || "").trim();
  const specialization = String(body.specialization || "").trim();

  if (!programType) {
    return NextResponse.json({ error: "programType is required." }, { status: 400 });
  }
  if (!industryFocus) {
    return NextResponse.json({ error: "industryFocus is required." }, { status: 400 });
  }

  const totalCredits = Math.min(
    240,
    Math.max(120, Math.floor(Number(body.totalCredits || 160))),
  );
  const semesterCount = Math.min(
    12,
    Math.max(4, Math.floor(Number(body.semesterCount || 8))),
  );

  const userPrompt = buildUserPrompt(
    programType,
    industryFocus,
    specialization,
    totalCredits,
    semesterCount,
  );

  try {
    let rawText = "";

    try {
      rawText = await callAI(`${SYSTEM_PROMPT}\n\n${userPrompt}`, "bulk");
    } catch (err) {
      console.error("AI advisor API error:", err);
      return NextResponse.json(
        { error: "AI advisor request failed." },
        { status: 502 },
      );
    }

    if (!rawText) {
      return NextResponse.json(
        { error: "AI advisor returned an empty response." },
        { status: 502 },
      );
    }

    const recommendations = parseGeminiPayload(rawText);

    if (!recommendations) {
      return NextResponse.json(
        { error: "AI advisor returned an unparseable response." },
        { status: 502 },
      );
    }

    // Validate that distribution sums close to 100
    const distSum = Object.values(recommendations.categoryDistribution).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0,
    );

    if (Math.abs(distSum - 100) > 5) {
      return NextResponse.json(
        {
          error: `AI advisor returned an invalid distribution (sum=${distSum}). Please try again.`,
        },
        { status: 502 },
      );
    }

    recommendations.categoryDistribution = normalizeDistributionToHundred(
      recommendations.categoryDistribution,
    );

    const trendSnapshot = getTechnologyTrendSnapshot(`${programType} ${specialization}`);
    const trendElectives = trendSnapshot.suggestedElectives.slice(0, 4);
    const mergedElectives = Array.from(
      new Set([...(recommendations.recommendedElectives || []), ...trendElectives]),
    );

    recommendations.recommendedElectives = mergedElectives.slice(0, 12);
    recommendations.modernSubjects = {
      ...recommendations.modernSubjects,
      TRENDING: trendSnapshot.coreTrendSkills.map((item) => item.topic),
      SE: Array.from(
        new Set([
          ...(recommendations.modernSubjects.SE || []),
          ...trendSnapshot.suggestedSkillModules,
        ]),
      ).slice(0, 6),
    };
    recommendations.trendSnapshot = trendSnapshot;

    return NextResponse.json({ recommendations }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Curriculum advisor error:", message);
    return NextResponse.json(
      { error: "AI advisor request failed due to a network or runtime error." },
      { status: 500 },
    );
  }
}
