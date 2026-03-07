import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
}

function buildUserPrompt(
  programType: string,
  industryFocus: string,
  specialization: string,
  totalCredits: number,
  semesterCount: number,
): string {
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
- Tailor recommendations to ${programType} program with ${industryFocus} industry focus`;
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

function extractGeminiText(response: Record<string, unknown>): string {
  const candidates = (response as Record<string, unknown>)?.candidates;
  if (!Array.isArray(candidates)) return "";
  const parts = (candidates[0] as Record<string, unknown>)?.content;
  if (!parts) return "";
  const partsArr = (parts as Record<string, unknown>)?.parts;
  if (!Array.isArray(partsArr)) return "";
  return partsArr
    .map((part) => String((part as Record<string, unknown>)?.text || ""))
    .join("\n")
    .trim();
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

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI advisor is not configured. GEMINI_API_KEY missing." },
      { status: 503 },
    );
  }

  const userPrompt = buildUserPrompt(
    programType,
    industryFocus,
    specialization,
    totalCredits,
    semesterCount,
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini advisor API error:", errorBody);
      return NextResponse.json(
        { error: `AI advisor request failed (${geminiResponse.status}).` },
        { status: 502 },
      );
    }

    const data = (await geminiResponse.json()) as Record<string, unknown>;
    const rawText = extractGeminiText(data);

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
