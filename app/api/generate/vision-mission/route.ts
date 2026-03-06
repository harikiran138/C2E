import { NextResponse } from "next/server";
import { computeSemanticSimilarity, calculateLexicalRichness } from "@/lib/ai-validation";
import { visionAgent } from "@/lib/ai/vision-agent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Simple in-memory cache for AI results
const aiCache = new Map<string, string[]>();

const VISION_APPROVAL_THRESHOLD = 90;
const VISION_SIMILARITY_THRESHOLD = 0.75;
const MISSION_APPROVAL_THRESHOLD = 90;
const VISION_GLOBAL_PATTERNS: Array<{ concept: string; regex: RegExp }> = [
  { concept: "globally recognized", regex: /\bglobally recognized\b/i },
  { concept: "globally respected", regex: /\bglobally respected\b/i },
  {
    concept: "internationally benchmarked",
    regex: /\binternationally benchmarked\b/i,
  },
  { concept: "global leadership", regex: /\bglobal leadership\b/i },
  {
    concept: "global distinction",
    regex: /\b(global distinction|achieve distinction|distinction in)\b/i,
  },
  { concept: "leading advancement", regex: /\badvance as a leading\b/i },
];
const VISION_OPERATIONAL_TERMS = [
  "education",
  "teaching",
  "learning",
  "curriculum",
  "pedagogy",
  "classroom",
  "provide",
  "deliver",
  "develop",
  "cultivate",
  "train",
  "prepare",
  "implement",
  "foster",
];
const VISION_MARKETING_TERMS = [
  "destination",
  "hub",
  "world-class",
  "best-in-class",
  "unmatched",
];
const REDUNDANCY_SUFFIXES = [
  "ization",
  "ation",
  "ition",
  "tion",
  "sion",
  "ment",
  "ness",
  "ity",
  "ship",
  "ing",
  "ed",
  "es",
  "s",
];
const REDUNDANCY_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "through",
  "toward",
  "towards",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "by",
  "be",
  "or",
  "is",
  "are",
  "as",
  "at",
  "program",
  "engineering",
  "institutional",
  "strategic",
  "global",
  "globally",
  "international",
  "internationally",
  "sustained",
  "long",
  "term",
  "future",
]);
const MISSION_OPERATIONAL_VERBS = [
  "deliver",
  "strengthen",
  "foster",
  "promote",
  "advance",
  "implement",
  "integrate",
  "enable",
  "support",
  "sustain",
  "build",
];
const MISSION_MARKETING_TERMS = VISION_MARKETING_TERMS;
const MISSION_RESTRICTED_TERMS = [
  "guarantee",
  "ensure all",
  "100%",
  "master",
  "excel in all",
];
const MISSION_IMMEDIATE_TERMS = [
  "at graduation",
  "on graduation",
  "students will be able to",
  "student will be able to",
];
const MISSION_PILLAR_SIGNALS = {
  academic: [
    "curriculum",
    "outcome-based",
    "outcome based",
    "academic",
    "learning",
    "continuous improvement",
    "rigor",
  ],
  research_industry: [
    "research",
    "industry",
    "innovation",
    "laboratory",
    "hands-on",
    "internship",
    "collaboration",
  ],
  professional_standards: [
    "professional standards",
    "engineering standards",
    "standards alignment",
    "quality standards",
  ],
  ethics_society: [
    "ethical",
    "ethics",
    "societal",
    "community",
    "sustainable",
    "responsibility",
    "public",
  ],
} as const;
const VISION_STARTERS = [
  "To be globally recognized for",
  "To emerge as",
  "To achieve distinction in",
  "To advance as a leading",
  "To be globally respected for",
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function extractTokens(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function normalizeRoot(word: string) {
  let root = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!root || root.length <= 4) return root;
  for (const suffix of REDUNDANCY_SUFFIXES) {
    if (root.endsWith(suffix) && root.length - suffix.length >= 4) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }
  return root;
}

function getRepeatedRoots(statement: string) {
  const tokens = extractTokens(statement).filter(
    (token) => !REDUNDANCY_STOP_WORDS.has(token),
  );
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const root = normalizeRoot(token);
    if (!root || REDUNDANCY_STOP_WORDS.has(root)) continue;
    counts.set(root, (counts.get(root) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([root]) => root);
}

function getSynonymStacking(statement: string) {
  const lower = statement.toLowerCase();
  const groups = [
    [
      "distinction",
      "excellence",
      "premier",
      "leading",
      "leadership",
      "recognized",
      "respected",
    ],
    ["innovation", "innovative", "transformative", "foresight", "advancement"],
  ];
  return groups.some(
    (group) =>
      group.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(lower))
        .length >= 3,
  );
}

function missionPillarCoverage(statement: string) {
  const lower = statement.toLowerCase();
  const hits = {
    academic: MISSION_PILLAR_SIGNALS.academic.some((term) =>
      containsTerm(lower, term),
    ),
    research_industry: MISSION_PILLAR_SIGNALS.research_industry.some((term) =>
      containsTerm(lower, term),
    ),
    professional_standards: MISSION_PILLAR_SIGNALS.professional_standards.some(
      (term) => containsTerm(lower, term),
    ),
    ethics_society: MISSION_PILLAR_SIGNALS.ethics_society.some((term) =>
      containsTerm(lower, term),
    ),
  };
  return {
    ...hits,
    total: Object.values(hits).filter(Boolean).length,
  };
}

async function scoreMissionCandidate(statement: string, referenceVision = "") {
  const normalized = normalizeWhitespace(statement);
  const lower = normalized.toLowerCase();
  const words = normalized
    .replace(/[.?!]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  const sentenceCount = normalized
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean).length;
  const operationalHits = MISSION_OPERATIONAL_VERBS.filter((term) =>
    containsTerm(lower, term),
  );
  const marketingHits = MISSION_MARKETING_TERMS.filter((term) =>
    containsTerm(lower, term),
  );
  const restrictedHits = MISSION_RESTRICTED_TERMS.filter((term) =>
    lower.includes(term),
  );
  const immediateHits = MISSION_IMMEDIATE_TERMS.filter((term) =>
    lower.includes(term),
  );
  const repeatedRoots = getRepeatedRoots(normalized);
  const synonymStacking = getSynonymStacking(normalized);
  const pillars = missionPillarCoverage(normalized);

  const overlap = referenceVision
    ? await computeSemanticSimilarity(referenceVision, normalized)
    : 0.35;
  const leakage = referenceVision
    ? await computeSemanticSimilarity(referenceVision, normalized)
    : 0;

  const lexicalRichness = calculateLexicalRichness(normalized);

  const hardFailures = [
    ...(lexicalRichness < 40 ? ["insufficient lexical flexibility"] : []),
    ...(operationalHits.length < 2 ? ["insufficient operational verbs"] : []),
    ...(sentenceCount < 3 || sentenceCount > 4
      ? ["mission sentence count"]
      : []),
    ...(pillars.total < 3 ? ["pillar coverage"] : []),
    ...(repeatedRoots.length > 0
      ? [`repeated roots: ${repeatedRoots.join(", ")}`]
      : []),
    ...(synonymStacking ? ["synonym stacking"] : []),
    ...(marketingHits.length > 0 ? ["marketing language"] : []),
    ...(restrictedHits.length > 0 ? ["restricted wording"] : []),
    ...(immediateHits.length > 0 ? ["immediate outcomes"] : []),
    ...(leakage > 0.82 ? ["vision leakage"] : []),
  ];

  let alignment = 100;
  if (referenceVision) {
    const pillarScore = Math.min(100, Math.round((pillars.total / 4) * 100));
    alignment = Math.round(
      Math.min(100, overlap * 100) * 0.65 + pillarScore * 0.35,
    );
  }
  let operational = 100;
  if (operationalHits.length < 2) operational -= 45;
  if (pillars.total < 3) operational -= 35;
  if (sentenceCount < 3 || sentenceCount > 4) operational -= 25;

  let redundancy = 100;
  if (repeatedRoots.length > 0)
    redundancy -= Math.min(60, repeatedRoots.length * 20);
  if (synonymStacking) redundancy -= 35;

  let accreditation = 100;
  if (marketingHits.length > 0) accreditation -= 45;
  if (restrictedHits.length > 0) accreditation -= 35;
  if (immediateHits.length > 0) accreditation -= 40;

  let coherence = 100;
  if (sentenceCount < 3 || sentenceCount > 4) coherence -= 35;
  if (words.length < 45 || words.length > 110) coherence -= 25;
  if (pillars.total < 3) coherence -= 25;
  if (leakage > 0.72) coherence -= 30;

  let score = Math.round(
    alignment * 0.25 +
    operational * 0.2 +
    redundancy * 0.15 +
    accreditation * 0.2 +
    coherence * 0.2,
  );
  score = Math.max(0, Math.min(100, score));
  if (hardFailures.length > 0) score = Math.min(score, 79);

  return {
    score,
    hardFailures,
  };
}

function extractVisionGlobalConcepts(statement: string) {
  return VISION_GLOBAL_PATTERNS.filter(({ regex }) =>
    regex.test(statement),
  ).map(({ concept }) => concept);
}

function getVisionStarter(statement: string) {
  const normalized = normalizeWhitespace(statement).toLowerCase();
  const ordered = [...VISION_STARTERS].sort((a, b) => b.length - a.length);
  return (
    ordered.find((starter) => normalized.startsWith(starter.toLowerCase())) ||
    ""
  );
}

function stripVisionStarter(statement: string) {
  let cleaned = normalizeWhitespace(statement).replace(/[.?!]+$/, "");
  const ordered = [...VISION_STARTERS].sort((a, b) => b.length - a.length);
  for (const starter of ordered) {
    if (cleaned.toLowerCase().startsWith(starter.toLowerCase())) {
      cleaned = cleaned.slice(starter.length).trim();
      break;
    }
  }
  return cleaned;
}

function rewriteVisionStarter(statement: string, starter: string) {
  const body =
    stripVisionStarter(statement) ||
    "long-term institutional distinction through innovation leadership and sustainable societal contribution";
  return normalizeWhitespace(`${starter} ${body}.`);
}

function containsTerm(statement: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(statement);
}

function scoreVisionCandidate(statement: string) {
  const normalized = normalizeWhitespace(statement);
  const lower = normalized.toLowerCase();
  const words = normalized
    .replace(/[.?!]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  const globalConcepts = [...new Set(extractVisionGlobalConcepts(lower))];
  const globalTokenHits =
    lower.match(/\b(global|globally|international|internationally|world)\b/g)
      ?.length || 0;
  const operationalHits = VISION_OPERATIONAL_TERMS.filter((term) =>
    containsTerm(lower, term),
  );
  const marketingHits = VISION_MARKETING_TERMS.filter((term) =>
    containsTerm(lower, term),
  );
  const repeatedRoots = getRepeatedRoots(normalized);
  const synonymStacking = getSynonymStacking(normalized);
  const estimatedPillars = Math.max(
    1,
    (normalized.match(/,/g)?.length || 0) +
    (normalized.match(/\band\b/gi)?.length || 0),
  );

  const hardFailures = [
    ...(operationalHits.length > 0 ? ["operational leakage"] : []),
    ...(marketingHits.length > 0 ? ["marketing language"] : []),
    ...(globalConcepts.length !== 1 ? ["global concept count"] : []),
    ...(globalTokenHits > 1 ? ["global phrase stacking"] : []),
    ...(estimatedPillars > 3 ? ["pillar count"] : []),
    ...(repeatedRoots.length > 0
      ? [`repeated roots: ${repeatedRoots.join(", ")}`]
      : []),
    ...(synonymStacking ? ["synonym stacking"] : []),
  ];

  let score = 100;
  if (words.length < 18 || words.length > 24) score -= 20;
  if (
    !VISION_STARTERS.some((starter) => lower.startsWith(starter.toLowerCase()))
  )
    score -= 20;
  if (globalConcepts.length !== 1) score -= 20;
  if (operationalHits.length > 0) score -= 30;
  if (marketingHits.length > 0) score -= 20;
  if (estimatedPillars > 3) score -= 15;
  if (repeatedRoots.length > 0)
    score -= Math.min(30, repeatedRoots.length * 15);
  if (synonymStacking) score -= 20;

  return {
    score: Math.max(0, Math.min(100, score)),
    hardFailures,
  };
}

function buildDeterministicVision(
  programName: string,
  priorities: string[],
  index: number,
) {
  const selected = priorities
    .slice(0, 3)
    .map((p) =>
      normalizeWhitespace(String(p).toLowerCase())
        // Replace outcome-oriented phrases — avoid "leadership" (it's in the synonym cluster)
        .replace(
          /\b(outcome based|outcome-based|outcome oriented|outcome-oriented)\b/g,
          "institutional standards",
        )
        .replace(
          /\b(education|teaching|learning|curriculum|pedagogy|classroom)\b/g,
          "scholarly standards",
        )
        .replace(
          /\b(innovation|technology|entrepreneurship|entrepreneur)\b/g,
          "innovation capability",
        )
        .replace(
          /\b(ethic|ethical|integrity|professional|responsibility)\b/g,
          "ethical standards",
        )
        .replace(
          /\b(develop|provide|deliver|cultivate|train|prepare|implement|foster)\b/g,
          "advance",
        )
        // Remove cluster-1 words that cause synonym stacking when combined with template phrases
        .replace(/\b(leadership|excellence|premier|distinction)\b/g, "standards"),
    )
    .filter(Boolean);
  const pillarText =
    selected.length > 0
      ? selected.join(", ").replace(/, ([^,]*)$/, ", and $1")
      : "institutional standards, innovation capability, and sustainable societal contribution";

  // Templates: fixed text must not contain 2+ cluster-1 words (recognized/respected/distinction/leadership/excellence/premier)
  // so that pillarText can safely add up to 2 cluster-1 words before stacking triggers at 3
  const templates = [
    `To be globally recognized for long-term ${programName} distinction through ${pillarText} with sustained societal and professional relevance.`,
    `To emerge as a long-horizon ${programName} benchmark for globally respected distinction through ${pillarText} and enduring strategic relevance.`,
    `To achieve distinction in ${programName} through sustained ${pillarText} and long-term institutional contribution.`,
    // T4: "advance as a leading" has "leading" (cluster-1) — keep suffix cluster-free
    `To advance as a leading ${programName} program through sustained ${pillarText} and enduring strategic contribution.`,
    `To be globally respected for sustained ${programName} excellence through ${pillarText} with long-horizon societal relevance.`,
  ];

  return templates[index % templates.length];
}

function buildDeterministicMission(programName: string, index: number) {
  const variants = [
    `Deliver a rigorous ${programName} curriculum through outcome-based education, continuous assessment, and evidence-driven academic improvement.`,
    "Strengthen research engagement, industry collaboration, and hands-on practice to align graduate preparation with professional engineering standards.",
    "Foster ethical responsibility, innovation capability, and societal awareness to sustain long-term professional growth and community impact.",
  ];
  const rotated = [
    variants[index % 3],
    variants[(index + 1) % 3],
    variants[(index + 2) % 3],
  ];
  return rotated.join(" ");
}

// Pre-validated safe templates — each scores 100/100 on scoreVisionCandidate() for 2+ word program names
// Rules verified: 18-24 words, 1 global concept, 0 banned terms, ≤3 pillars, no synonym stacking
// See config/vision-profile.yaml for full specification
function buildSafeVisionVariant(programName: string, index: number) {
  const templates = [
    // T1 — "globally recognized": cluster-1 words = recognized(1) + distinction(2) = 2 → safe
    `To be globally recognized for long-term ${programName} distinction through institutional standards, technological innovation, and sustainable societal contribution.`,
    // T2 — "globally respected": cluster-1 = respected(1) + distinction(2) = 2 → safe; no "leadership"
    `To emerge as a long-term ${programName} benchmark for globally respected distinction through strategic innovation and enduring public value.`,
    // T3 — "distinction in": cluster-1 = distinction(1) = 1 → safe; body has 12 words for 18 total with 2-word name
    `To achieve distinction in ${programName} through sustained institutional standards, responsible innovation practice, and long-term professional societal contribution.`,
    // T4 — "advance as a leading": cluster-1 = leading(1) + distinction(2) = 2 → safe; 1 "and" + 2 commas = 3 pillars
    `To advance as a leading ${programName} program through strategic institutional distinction, ethical standards, and enduring professional relevance.`,
    // T5 — "globally respected": cluster-1 = respected(1) + excellence(2) = 2 → safe
    `To be globally respected for sustained ${programName} excellence through ethical institutional standards, research impact, and long-term societal value.`,
  ];
  return templates[index % templates.length];
}

export async function POST(request: Request) {
  try {
    const { type, priorities, count, institutionContext, programName } =
      await request.json();

    const cacheKey = JSON.stringify({
      type,
      priorities,
      count,
      institutionContext,
      programName,
    });
    if (aiCache.has(cacheKey)) {
      return NextResponse.json({ results: aiCache.get(cacheKey) });
    }

    if (!priorities || priorities.length === 0) {
      return NextResponse.json(
        { error: "Priorities are required" },
        { status: 400 },
      );
    }

    let results: string[] = [];

    // ── Vision path: AI Agent architecture (Template + Gemini + Mutation) ─────
    if (type === "vision") {
      const agentResult = await visionAgent({
        programName,
        priorities,
        count,
        institutionName: institutionContext?.name,
        existingVisions: [],
        geminiApiKey:    GEMINI_API_KEY,
      });
      results = agentResult.visions;

    // ── Mission path: Gemini + deterministic fallback ──────────────────────────
    } else if (type === "mission") {
      if (!GEMINI_API_KEY) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.",
          );
        }
        console.warn("GEMINI_API_KEY is missing. Using deterministic mission fallback.");
        results = Array.from({ length: count }, (_, i) =>
          buildDeterministicMission(programName, i),
        );
      } else {
        const missionPrompt = `
You are an accreditation consultant. Generate exactly ${count} mission statements for the ${programName} program.

=== MISSION SCORING RUBRIC ===
1. Mission describes HOW the program delivers value (process, not position).
2. EXACTLY 3–4 structured sentences.
3. Include ALL pillars: curriculum quality, research/industry engagement, professional standards, ethical/societal responsibility.
4. MINIMUM 2 operational verbs from: deliver, strengthen, foster, promote, advance, implement, integrate, enable, support, sustain, build.
5. NO direct phrase reuse from the Vision context: "${institutionContext || "N/A"}"
6. NO repeated root words or synonym stacking.
7. Length: 45–110 words.
8. NO marketing terms: destination, hub, world-class, best-in-class, unmatched, guarantee, 100%, ensure all.

Focus Areas: ${priorities.join(", ")}

Output ONLY a JSON array of exactly ${count} strings. No markdown, no explanation.
["Statement 1", "Statement 2", ...]
        `.trim();

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: missionPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });

        if (!response.ok) {
          console.error("Gemini API Error:", await response.text());
          throw new Error(`Gemini API Failed: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedText: string =
          data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        let rawCandidates: string[] = [];
        try {
          const cleaned = generatedText.replace(/```json|```/g, "").trim();
          const parsed  = JSON.parse(cleaned);
          rawCandidates = Array.isArray(parsed) ? parsed : [];
        } catch {
          rawCandidates = generatedText
            .split("\n")
            .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
            .filter((l: string) => l.length > 10);
        }

        const referenceVision = normalizeWhitespace(String(institutionContext || ""));
        const diversified: string[] = [];

        for (let index = 0; index < count; index += 1) {
          let candidate = normalizeWhitespace(rawCandidates[index] || "");
          let attempts  = 0;

          while (attempts < 6) {
            const quality = await scoreMissionCandidate(candidate, referenceVision);
            let tooSimilar = false;
            for (const existing of diversified) {
              if (await computeSemanticSimilarity(existing, candidate) > VISION_SIMILARITY_THRESHOLD) {
                tooSimilar = true;
                break;
              }
            }
            if (
              quality.score >= MISSION_APPROVAL_THRESHOLD &&
              quality.hardFailures.length === 0 &&
              !tooSimilar
            ) break;

            candidate = buildDeterministicMission(programName, index + attempts);
            attempts += 1;
          }

          const finalQuality = await scoreMissionCandidate(candidate, referenceVision);
          if (finalQuality.score < MISSION_APPROVAL_THRESHOLD || finalQuality.hardFailures.length > 0) {
            candidate = buildDeterministicMission(programName, index + count);
          }

          diversified.push(candidate);
        }

        results = diversified;
      }
    }

    aiCache.set(cacheKey, results);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
