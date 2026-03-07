import {
  CategoryCode,
  GeneratedCurriculum,
  normalizeCourseTitle,
} from "@/lib/curriculum/engine";
import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";

interface ApplyGeminiOptions {
  targetSemester?: number;
}

interface AiMappedCourse {
  semester?: number;
  courseCode?: string;
  category?: CategoryCode;
  courseTitle?: string;
}

interface AiPayload {
  course_titles?: AiMappedCourse[];
  courses?: AiMappedCourse[];
}

type ProgramTrack = "CSE" | "ECE" | "EEE" | "MECH" | "CIVIL" | "GENERIC";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are an expert academic curriculum designer specializing in Outcome-Based Education (OBE) for engineering programs in India.

You must generate course titles strictly aligned with:
1. National Education Policy (NEP) 2020 (highest priority)
2. AICTE Model Curriculum
3. UGC Higher Education Guidelines

Mandatory constraints:
- 30 total learning hours = 1 credit (already precomputed in input, do not alter hours/credits)
- Respect semester progression:
  - Semester 1-2: Foundation-level only
  - Semester 3-4: Core engineering fundamentals
  - Semester 5-6: Advanced professional courses
  - Semester 7-8: Specialization, electives, internship/project focus
- Do not suggest advanced topics in early semesters.
- Keep titles realistic for Indian engineering programs.
- Avoid duplicate titles across semesters.
- Preserve the given category for each course.
- Preserve a three-layer curriculum model:
  1) fundamental backbone
  2) core discipline backbone
  3) emerging technology integration
- Return JSON only.`;

const FORBIDDEN_FOUNDATION_TERMS = [
  "machine learning",
  "deep learning",
  "distributed systems",
  "advanced algorithms",
  "blockchain",
  "cloud computing",
  "computer vision",
  "natural language processing",
  "quantum",
  "cyber security",
  "cybersecurity",
];

const TRACK_KEYWORDS: Record<ProgramTrack, string[]> = {
  CSE: [
    "computer",
    "programming",
    "algorithm",
    "database",
    "software",
    "network",
    "operating system",
    "data",
    "web",
    "cyber",
    "machine learning",
    "artificial intelligence",
  ],
  ECE: [
    "electronics",
    "communication",
    "signal",
    "embedded",
    "vlsi",
    "microprocessor",
    "antenna",
    "wireless",
    "dsp",
    "circuit",
  ],
  EEE: [
    "electrical",
    "power",
    "machine",
    "drives",
    "control",
    "switchgear",
    "renewable",
    "high voltage",
    "circuits",
  ],
  MECH: [
    "mechanical",
    "thermodynamics",
    "manufacturing",
    "fluid",
    "machine design",
    "heat transfer",
    "automobile",
    "cad",
    "cam",
    "robotics",
  ],
  CIVIL: [
    "civil",
    "structural",
    "concrete",
    "geotechnical",
    "survey",
    "transportation",
    "hydrology",
    "construction",
    "environmental engineering",
  ],
  GENERIC: [],
};

export async function applyGeminiCourseTitles(
  curriculum: GeneratedCurriculum,
  options?: ApplyGeminiOptions,
): Promise<{ curriculum: GeneratedCurriculum; warnings: string[] }> {
  const warnings: string[] = [];

  const targetSemester =
    options?.targetSemester && Number.isFinite(options.targetSemester)
      ? Math.floor(options.targetSemester)
      : null;

  const updated: GeneratedCurriculum = {
    ...curriculum,
    categorySummary: curriculum.categorySummary.map((summary) => ({ ...summary })),
    semesters: curriculum.semesters.map((semester) => ({
      ...semester,
      categoryCourseCounts: { ...semester.categoryCourseCounts },
      courses: semester.courses.map((course) => ({ ...course })),
    })),
  };

  const coursesForPrompt = updated.semesters.flatMap((semester) =>
    semester.courses
      .filter((course) => (targetSemester ? semester.semester === targetSemester : true))
      .map((course) => ({
        semester: semester.semester,
        level: semester.level,
        courseCode: course.courseCode,
        category: course.category,
        currentTitle: course.courseTitle,
        credits: course.credits,
      })),
  );

  if (coursesForPrompt.length === 0) {
    warnings.push("No courses found for AI title generation.");
    return { curriculum: updated, warnings };
  }

  if (!GEMINI_API_KEY) {
    warnings.push("GEMINI_API_KEY is not configured. Using deterministic fallback course titles.");
    return { curriculum: updated, warnings };
  }

  const userPrompt = buildUserPrompt(updated, coursesForPrompt, targetSemester);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      warnings.push(`Gemini title generation failed (${response.status}). Using fallback titles.`);
      if (body) {
        console.error("Gemini title generation error:", body);
      }
      return { curriculum: updated, warnings };
    }

    const data = (await response.json()) as Record<string, any>;
    const rawText = extractGeminiText(data);
    if (!rawText) {
      warnings.push("Gemini returned an empty title payload. Using fallback titles.");
      return { curriculum: updated, warnings };
    }

    const parsed = parseAiPayload(rawText);
    if (!parsed) {
      warnings.push("Unable to parse Gemini title payload. Using fallback titles.");
      return { curriculum: updated, warnings };
    }

    const candidateRows =
      Array.isArray(parsed.course_titles) && parsed.course_titles.length > 0
        ? parsed.course_titles
        : Array.isArray(parsed.courses)
          ? parsed.courses
          : [];

    if (candidateRows.length === 0) {
      warnings.push("Gemini did not return any mapped course titles. Using fallback titles.");
      return { curriculum: updated, warnings };
    }

    const keyToTitle = new Map<string, string>();
    for (const row of candidateRows) {
      const semester = Math.floor(Number(row.semester || 0));
      const courseCode = String(row.courseCode || "").trim();
      const category = String(row.category || "").trim().toUpperCase() as CategoryCode;
      const proposed = sanitizeTitle(String(row.courseTitle || ""));
      if (!semester || !courseCode || !proposed) continue;
      if (category && !["BS", "ES", "HSS", "PC", "PE", "OE", "MC", "AE", "SE", "PR"].includes(category)) {
        continue;
      }
      keyToTitle.set(`${semester}::${courseCode}`, proposed);
    }

    const usedTitles = new Set<string>();
    const programTrack = detectProgramTrack(updated.programName);
    for (const semester of updated.semesters) {
      for (const course of semester.courses) {
        const lookupKey = `${semester.semester}::${course.courseCode}`;
        const proposed = keyToTitle.get(lookupKey);
        if (!proposed) {
          usedTitles.add(normalizeCourseTitle(course.courseTitle));
          continue;
        }

        if (semester.semester <= 2 && violatesFoundationRule(proposed)) {
          warnings.push(
            `Semester ${semester.semester} suggested advanced title \"${proposed}\" was rejected to preserve foundation progression.`,
          );
          usedTitles.add(normalizeCourseTitle(course.courseTitle));
          continue;
        }

        if (!isCourseAlignedWithProgram(programTrack, course.category, proposed)) {
          warnings.push(
            `Semester ${semester.semester} ${course.courseCode}: title "${proposed}" was rejected because it does not align with ${updated.programName}.`,
          );
          usedTitles.add(normalizeCourseTitle(course.courseTitle));
          continue;
        }

        let nextTitle = proposed;
        let suffix = 2;
        while (usedTitles.has(normalizeCourseTitle(nextTitle))) {
          nextTitle = `${proposed} ${suffix}`;
          suffix += 1;
        }

        course.courseTitle = nextTitle;
        usedTitles.add(normalizeCourseTitle(nextTitle));
      }
    }

    updated.generatedAt = new Date().toISOString();
    return { curriculum: updated, warnings };
  } catch (error: any) {
    warnings.push("Gemini title generation failed due to network/runtime error. Using fallback titles.");
    console.error("Gemini title generation runtime error:", error);
    return { curriculum: updated, warnings };
  }
}

function buildUserPrompt(
  curriculum: GeneratedCurriculum,
  courses: Array<{
    semester: number;
    level: string;
    courseCode: string;
    category: CategoryCode;
    currentTitle: string;
    credits: number;
  }>,
  targetSemester: number | null,
): string {
  const semesterScope = targetSemester
    ? `Regenerate only Semester ${targetSemester} titles.`
    : "Generate titles for all semesters.";

  const guardrails = buildCurriculumAIGuardrailsPrompt(curriculum.programName);

  return `Task: ${semesterScope}

Program: ${curriculum.programName}
Mode: ${curriculum.mode}
Total Credits: ${curriculum.totalCredits}
Semester Count: ${curriculum.semesterCount}

Compliance Priority:
1) NEP 2020 (mandatory highest priority)
2) AICTE model curriculum
3) UGC guidelines

Courses to rename (do not change code/category/credits):
${JSON.stringify(courses, null, 2)}

Program-specific guardrails:
${guardrails}

Output format (JSON only):
{
  "course_titles": [
    {
      "semester": 1,
      "courseCode": "CSE01BS01",
      "category": "BS",
      "courseTitle": "Engineering Mathematics I"
    }
  ]
}`;
}

function extractGeminiText(response: Record<string, any>): string {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => String(part?.text || ""))
    .join("\n")
    .trim();
}

function parseAiPayload(raw: string): AiPayload | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const direct = safeJsonParse(cleaned);
  if (direct) return direct;

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = cleaned.slice(firstBrace, lastBrace + 1);
    return safeJsonParse(sliced);
  }

  return null;
}

function safeJsonParse(value: string): AiPayload | null {
  try {
    return JSON.parse(value) as AiPayload;
  } catch {
    return null;
  }
}

function sanitizeTitle(value: string): string {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  if (compact.length < 3 || compact.length > 120) return "";
  return compact;
}

function violatesFoundationRule(title: string): boolean {
  const normalized = normalizeCourseTitle(title);
  return FORBIDDEN_FOUNDATION_TERMS.some((term) => normalized.includes(term));
}

function detectProgramTrack(programName: string): ProgramTrack {
  const normalized = String(programName || "").toUpperCase();
  if (
    normalized.includes("COMPUTER") ||
    normalized.includes("CSE") ||
    normalized.includes("INFORMATION TECHNOLOGY") ||
    normalized.includes("DATA SCIENCE") ||
    normalized.includes("AI")
  ) {
    return "CSE";
  }
  if (normalized.includes("ELECTRONICS") || normalized.includes("ECE")) return "ECE";
  if (
    normalized.includes("ELECTRICAL") ||
    normalized.includes("EEE") ||
    normalized.includes("POWER SYSTEM")
  ) {
    return "EEE";
  }
  if (normalized.includes("MECHANICAL") || normalized.includes("MECH")) return "MECH";
  if (normalized.includes("CIVIL")) return "CIVIL";
  return "GENERIC";
}

function isCourseAlignedWithProgram(
  track: ProgramTrack,
  category: CategoryCode,
  title: string,
): boolean {
  if (track === "GENERIC") return true;
  if (!["ES", "PC", "PE", "SE", "PR"].includes(category)) return true;

  const normalized = normalizeCourseTitle(title);
  const genericAllowedTerms = [
    "engineering",
    "project",
    "internship",
    "capstone",
    "innovation",
    "design",
    "lab",
  ];
  if (genericAllowedTerms.some((term) => normalized.includes(term))) {
    return true;
  }

  return TRACK_KEYWORDS[track].some((keyword) => normalized.includes(keyword));
}
