import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const PEO_TIME_HORIZON = "Within 3 to 5 years of graduation";
const PEO_TIME_HORIZON_LOWER = PEO_TIME_HORIZON.toLowerCase();

const ABSOLUTE_TERMS = [
  "all graduates",
  "every graduate",
  "always",
  "guarantee",
  "100%",
];
const OUTCOME_STYLE_TERMS = [
  "at graduation",
  "on graduation",
  "student will be able to",
  "students will be able to",
  "immediate capability",
  "develop applications",
  "build applications",
];
const MEASURABLE_CUES = [
  "advance",
  "progress",
  "contribute",
  "engage",
  "lead",
  "professional growth",
  "career",
  "value",
];
const ALUMNI_MEASURABLE_CUES = [
  "leadership role",
  "career advancement",
  "professional licensure",
  "promotion",
  "advanced degree",
  "entrepreneurial",
  "management",
  "senior",
  "recognized",
];
const RELEVANCE_CUES = [
  "engineering",
  "industry",
  "professional",
  "ethical",
  "sustainable",
  "societal",
  "community",
];
const MISSION_ALIGNMENT_CUES = [
  "mission",
  "institutional",
  "program priorities",
  "department priorities",
  "constituency",
  "community needs",
];

function normalizeCount(value: unknown, fallback = 4) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(20, Math.max(1, Math.floor(parsed)));
}

function parsePeoArray(rawText: string) {
  const cleaned = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fallback below
  }

  return cleaned
    .split("\n")
    .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line: string) => line.length > 10);
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripPrefix(text: string) {
  return text
    .replace(/^option\s*\d+\s*:\s*/i, "")
    .replace(/^peo\s*\d+\s*:\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function containsAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function ensureSentence(text: string) {
  const trimmed = normalizeWhitespace(text).replace(/[.?!]+$/, "");
  return trimmed.length > 0 ? `${trimmed}.` : trimmed;
}

function canonicalKey(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildFallbackPeo(priority: string, programName: string) {
  return ensureSentence(
    `${PEO_TIME_HORIZON}, graduates will progress in professional ${programName} roles by applying ${priority} to solve complex engineering challenges in ways that are consistent with program and institutional mission priorities, while upholding ethical and sustainable practice`,
  );
}

function enforcePeoQuality(
  rawStatement: string,
  priority: string,
  programName: string,
) {
  let statement = normalizeWhitespace(stripPrefix(rawStatement));

  statement = statement.replace(/\ball graduates\b/gi, "graduates");
  statement = statement.replace(/\bevery graduate\b/gi, "graduates");
  statement = statement.replace(
    /\bexcellence in\b/gi,
    "professional growth in",
  );
  statement = statement.replace(/\bexcellence\b/gi, "professional growth");
  statement = statement.replace(/\bexcel in\b/gi, "progress in");
  statement = statement.replace(/\bexcel\b/gi, "progress");
  statement = statement.replace(/\bwill excel\b/gi, "will progress");
  statement = statement.replace(
    /\bestablish(?:ing)? their own ventures\b/gi,
    "pursue entrepreneurial and intrapreneurial pathways",
  );

  for (const term of ABSOLUTE_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    statement = statement.replace(new RegExp(escaped, "gi"), "graduates");
  }

  if (containsAny(statement, OUTCOME_STYLE_TERMS)) {
    statement = statement
      .replace(/\bat graduation\b/gi, "within 4 to 5 years of graduation")
      .replace(/\bon graduation\b/gi, "within 4 to 5 years of graduation")
      .replace(/\bstudent[s]?\s+will be able to\b/gi, "graduates will");
  }

  statement = statement.replace(
    /\bwithin a few years of graduation\b/gi,
    "",
  );
  statement = statement.replace(
    /\bwithin four to five years of graduation\b/gi,
    "",
  );
  statement = statement.replace(
    /\bwithin 3 to 5 years of graduation\b/gi,
    "",
  );
  statement = statement.replace(
    /\bwithin 4-5 years of graduation\b/gi,
    "",
  );
  statement = statement.replace(
    /within \d+ to \d+ years of graduation/gi,
    "",
  );

  // Clean up any double commas or weird spaces left behind
  statement = statement.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();

  // Strip it if it was safely at the start
  if (/^,?\s*graduates will/i.test(statement)) {
    statement = statement.replace(/^,?\s*graduates will/i, "graduates will");
  }

  statement = `${PEO_TIME_HORIZON}, ${statement.replace(/^graduates will\s*/i, "graduates will ")}`;

  if (!containsAny(statement, MEASURABLE_CUES)) {
    statement = `${statement.replace(/[.?!]+$/, "")} and contribute measurable value in their organizations and communities`;
  }

  if (!containsAny(statement, RELEVANCE_CUES)) {
    statement = `${statement.replace(/[.?!]+$/, "")} through ethical, sustainable, and industry-relevant engineering practice`;
  }

  if (!containsAny(statement, MISSION_ALIGNMENT_CUES)) {
    statement = `${statement.replace(/[.?!]+$/, "")} in alignment with program and institutional mission priorities`;
  }

  const words = statement.split(/\s+/);
  if (words.length > 35) {
    statement = words.slice(0, 35).join(" ");
  }

  if (words.length < 18) {
    statement = `${statement.replace(/[.?!]+$/, "")} by applying ${priority} in professional ${programName} contexts`;
  }

  return ensureSentence(statement);
}

function scoreSmartAbet(statement: string) {
  const lower = statement.toLowerCase();

  const words = statement.split(/\s+/);
  const specific = words.length >= 20 && words.length <= 35;
  const careerKeywords = [
    "career",
    "professional",
    "leadership",
    "innovation",
    "sustainability",
    "research",
  ];
  const hasCareerFocus = containsAny(lower, careerKeywords);
  const measurable = containsAny(lower, MEASURABLE_CUES);
  const attainable = !containsAny(lower, ABSOLUTE_TERMS);
  const relevant = containsAny(lower, RELEVANCE_CUES);
  const timeBound = lower.startsWith(PEO_TIME_HORIZON_LOWER);
  const abetStyle = !containsAny(lower, OUTCOME_STYLE_TERMS);
  const missionAligned = containsAny(lower, MISSION_ALIGNMENT_CUES);
  const alumniMeasurable = containsAny(lower, ALUMNI_MEASURABLE_CUES);

  const criteria = [
    {
      key: "specific",
      label: "Specific",
      passed: specific,
      guidance: "Length should be 20-35 words.",
    },
    {
      key: "careerFocus",
      label: "Career Focus",
      passed: hasCareerFocus,
      guidance:
        "Must mention career, professional, leadership, innovation, etc.",
    },
    {
      key: "measurable",
      label: "Measurable",
      passed: measurable,
      guidance: "Use language that can be assessed indirectly.",
    },
    {
      key: "alumniMeasurable",
      label: "Alumni Survey Ready",
      passed: alumniMeasurable,
      guidance: "Include specific targets assessable via alumni surveys (e.g., leadership, licensure).",
    },
    {
      key: "attainable",
      label: "Attainable",
      passed: attainable,
      guidance: "Avoid absolute or unrealistic guarantees.",
    },
    {
      key: "relevant",
      label: "Relevant",
      passed: relevant,
      guidance: "Reflect discipline and professional context.",
    },
    {
      key: "timeBound",
      label: "Time-Bound",
      passed: timeBound,
      guidance: `Use "${PEO_TIME_HORIZON}" framing.`,
    },
    {
      key: "abetStyle",
      label: "ABET Style",
      passed: abetStyle,
      guidance: "Avoid student-outcome phrasing at graduation.",
    },
    {
      key: "missionAligned",
      label: "Mission Aligned",
      passed: missionAligned,
      guidance: "Explicitly align with program/institution mission.",
    },
  ];

  const score = criteria.filter((item) => item.passed).length;
  const maxScore = criteria.length;
  const percentage = Math.round((score / maxScore) * 100);
  const rating =
    percentage >= 86
      ? "Strong"
      : percentage >= 71
        ? "Good"
        : percentage >= 56
          ? "Developing"
          : "Needs improvement";
  const gaps = criteria
    .filter((item) => !item.passed)
    .map((item) => item.label);

  return {
    score,
    maxScore,
    percentage,
    rating,
    specific,
    measurable,
    attainable,
    relevant,
    timeBound,
    abetStyle,
    missionAligned,
    alumniMeasurable,
    criteria,
    gaps,
  };
}

function rankPeoStatements(statements: string[]) {
  const ranked = statements.map((statement) => ({
    statement,
    quality: scoreSmartAbet(statement),
  }));

  ranked.sort((a, b) => {
    if (b.quality.score !== a.quality.score) {
      return b.quality.score - a.quality.score;
    }
    return (b.quality.percentage ?? 0) - (a.quality.percentage ?? 0);
  });

  return ranked;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("PEO Request Body:", JSON.stringify(body));
    const { priorities, count, institutionContext, programName } = body;
    const normalizedCount = normalizeCount(count);

    if (!priorities || priorities.length === 0) {
      console.warn("PEO Request missing priorities");
      return NextResponse.json(
        { error: "Priorities are required" },
        { status: 400 },
      );
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.",
        );
      }
      console.warn("GEMINI_API_KEY is missing. Using mock generation.");
      const mockResults = Array.from({ length: normalizedCount }).map(
        (_, i) => {
          const p1 = String(
            priorities[i % priorities.length] || "professional practice",
          );
          return buildFallbackPeo(p1, String(programName || "engineering"));
        },
      );
      const rankedMockResults = rankPeoStatements(mockResults);
      return NextResponse.json({
        results: rankedMockResults.map((item) => item.statement),
        quality: rankedMockResults.map((item) => item.quality),
      });
    }

    // Call Gemini API via Fetch
    const prompt = `
      You are an Accreditation-Aware Academic Policy Designer.
      
      Program: "${programName}".
      Context: ${institutionContext || "N/A"}
      Priority Anchors: ${priorities.join(", ")}.

      Task: Generate exactly ${normalizedCount} distinct Program Educational Objectives (PEOs) for this program.

      PEO Requirements:
      1. Generate 3 to 4 PEO statements.
      2. Each PEO must describe achievements 3–5 years after graduation.
      3. PEOs must be career-oriented, not classroom outcomes.
      4. PEOs must be measurable via alumni or employer feedback.
      5. Avoid immediate graduation outcomes.
      6. Avoid operational teaching language.
      7. Ensure diversity across:
         - Professional competence
         - Leadership & teamwork
         - Societal responsibility
         - Innovation & lifelong learning
      8. Maintain accreditation-safe tone (NBA / ABET compatible).
      9. Avoid repetition.
      10. Use “Graduates will…” structure for the core sentence.
      11. Mandatory Prefix: Each PEO must begin with "${PEO_TIME_HORIZON}, graduates will..."
      12. Word length: Each statement must be between 20 and 35 words.

      Lead Society strategic focus (integrated into PEOs):
      - Technical excellence
      - Leadership development
      - Societal impact
      - Innovation & entrepreneurship
      - Ethical responsibility
      - Community engagement

      Output format:
      - Return strictly a JSON array of strings.
      - No markdown.
      - No explanation.
      `;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error details:", errText);
      throw new Error(`Gemini API Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    const parsedResults = parsePeoArray(generatedText)
      .slice(0, normalizedCount)
      .map((statement) => statement.replace(/^PEO\d+\s*:\s*/i, "").trim());

    const refined: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < parsedResults.length; i += 1) {
      const priority = String(
        priorities[i % priorities.length] || "professional practice",
      );
      const refinedStatement = enforcePeoQuality(
        parsedResults[i],
        priority,
        String(programName || "engineering"),
      );
      const key = canonicalKey(refinedStatement);
      if (!seen.has(key)) {
        seen.add(key);
        refined.push(refinedStatement);
      }
    }

    let fallbackIndex = 0;
    while (refined.length < normalizedCount) {
      const priority = String(
        priorities[fallbackIndex % priorities.length] ||
        "professional practice",
      );
      const fallback = buildFallbackPeo(
        priority,
        String(programName || "engineering"),
      );
      const key = canonicalKey(fallback);
      if (!seen.has(key)) {
        seen.add(key);
        refined.push(fallback);
      }
      fallbackIndex += 1;
      if (fallbackIndex > normalizedCount * 3) break;
    }

    const rankedResults = rankPeoStatements(refined);

    return NextResponse.json({
      results: rankedResults.map((item) => item.statement),
      quality: rankedResults.map((item) => item.quality),
    });
  } catch (error: any) {
    console.error("PEO Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
