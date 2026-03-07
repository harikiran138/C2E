import {
  type CategoryCode,
  type GeneratedCurriculum,
  normalizeCourseTitle,
} from "@/lib/curriculum/engine";
import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";
import {
  getAllowedTopicsForDomain,
  getDomainKnowledgeProfile,
  keywordMatch,
} from "@/lib/curriculum/domain-knowledge";

interface ApplyGeminiOptions {
  targetSemester?: number;
}

interface AiMappedCourse {
  semester?: number;
  courseCode?: string;
  category?: CategoryCode;
  courseTitle?: string;
  prerequisites?: string[];
  learning_hours?: number;
}

interface AiPayload {
  course_titles?: AiMappedCourse[];
  courses?: AiMappedCourse[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are an expert academic curriculum designer specializing in Outcome-Based Education (OBE) for engineering programs in India.

You must generate course metadata aligned with:
1. National Education Policy (NEP) 2020
2. AICTE Model Curriculum
3. NBA OBE traceability expectations

Mandatory constraints:
- Keep credits and category unchanged.
- learning_hours must be consistent with credits (30 hours per credit).
- Include prerequisites only from previous_courses.
- Keep foundational progression:
  - Semester 1-2: fundamentals
  - Semester 3-4: core discipline
  - Semester 5-8: electives, specialization, emerging tech, project
- Emerging technology courses are allowed only in semester 5 or later.
- Avoid duplicate course titles.
- Reject domain-unrelated topics.
- Return JSON only.`;

const FORBIDDEN_EARLY_TERMS = [
  "machine learning",
  "deep learning",
  "generative ai",
  "natural language processing",
  "computer vision",
  "reinforcement learning",
  "cloud computing",
  "cybersecurity",
  "edge ai",
];

const GENERIC_ALLOWED_TERMS = [
  "engineering",
  "project",
  "internship",
  "capstone",
  "innovation",
  "design",
  "lab",
  "mathematics",
  "physics",
  "chemistry",
];

function allowedTopicsForCategory(programName: string, category: CategoryCode): string[] {
  const profile = getDomainKnowledgeProfile(programName);
  if (category === "BS") {
    return [
      "calculus",
      "linear algebra",
      "probability",
      "discrete mathematics",
      "engineering physics",
      "engineering chemistry",
    ];
  }
  if (category === "ES") {
    return [
      "programming fundamentals",
      "engineering mechanics",
      "basic electrical engineering",
      "engineering drawing",
      ...profile.requiredCoreKeywords,
    ];
  }
  if (category === "HSS" || category === "AE") {
    return ["communication", "ethics", "environment", "professional practice"];
  }
  return getAllowedTopicsForDomain(profile);
}

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

  const coursesForPrompt = updated.semesters.flatMap((semester) => {
    const previousCourses = updated.semesters
      .filter((item) => item.semester < semester.semester)
      .flatMap((item) => item.courses.map((course) => course.courseTitle))
      .slice(-12);

    return semester.courses
      .filter((course) => (targetSemester ? semester.semester === targetSemester : true))
      .map((course) => ({
        program_name: updated.programName,
        domain: getDomainKnowledgeProfile(updated.programName).domain,
        semester: semester.semester,
        semester_level: semester.level,
        category: course.category,
        course_code: course.courseCode,
        current_title: course.courseTitle,
        credits: course.credits,
        previous_courses: previousCourses,
        allowed_topics: allowedTopicsForCategory(updated.programName, course.category),
      }));
  });

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
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
      if (body) console.error("Gemini title generation error:", body);
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

    const keyToPayload = new Map<
      string,
      { title: string; prerequisites: string[]; learningHours: number | null }
    >();

    for (const row of candidateRows) {
      const semester = Math.floor(Number(row.semester || 0));
      const courseCode = String(row.courseCode || "").trim();
      const category = String(row.category || "").trim().toUpperCase() as CategoryCode;
      const proposed = sanitizeTitle(String(row.courseTitle || ""));
      if (!semester || !courseCode || !proposed) continue;
      if (
        category &&
        !["BS", "ES", "HSS", "PC", "PE", "OE", "MC", "AE", "SE", "PR"].includes(category)
      ) {
        continue;
      }

      const prerequisites = Array.isArray(row.prerequisites)
        ? row.prerequisites.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
        : [];
      const learningHoursRaw = Math.floor(Number(row.learning_hours || 0));
      const learningHours = Number.isFinite(learningHoursRaw) && learningHoursRaw > 0
        ? learningHoursRaw
        : null;

      keyToPayload.set(`${semester}::${courseCode}`, {
        title: proposed,
        prerequisites,
        learningHours,
      });
    }

    const usedTitles = new Set<string>();
    const profile = getDomainKnowledgeProfile(updated.programName);

    for (const semester of updated.semesters) {
      for (const course of semester.courses) {
        const lookupKey = `${semester.semester}::${course.courseCode}`;
        const payload = keyToPayload.get(lookupKey);
        if (!payload) {
          usedTitles.add(normalizeCourseTitle(course.courseTitle));
          continue;
        }

        if (semester.semester <= 4 && violatesEarlySemesterRule(payload.title)) {
          warnings.push(
            `Semester ${semester.semester} suggested advanced title "${payload.title}" was rejected to preserve progression.`,
          );
          usedTitles.add(normalizeCourseTitle(course.courseTitle));
          continue;
        }

        if (!isCourseAlignedWithProgram(profile, course.category, payload.title)) {
          warnings.push(
            `Semester ${semester.semester} ${course.courseCode}: title "${payload.title}" was rejected due to domain mismatch.`,
          );
          usedTitles.add(normalizeCourseTitle(course.courseTitle));
          continue;
        }

        let nextTitle = payload.title;
        let suffix = 2;
        while (usedTitles.has(normalizeCourseTitle(nextTitle))) {
          nextTitle = `${payload.title} Concepts ${suffix}`;
          suffix += 1;
        }

        course.courseTitle = nextTitle;
        course.prerequisites = payload.prerequisites;
        course.learningHours = payload.learningHours ?? course.totalHours;
        usedTitles.add(normalizeCourseTitle(nextTitle));
      }
    }

    updated.generatedAt = new Date().toISOString();
    return { curriculum: updated, warnings };
  } catch (error: any) {
    warnings.push("Gemini title generation failed due to runtime/network error. Using fallback titles.");
    console.error("Gemini title generation runtime error:", error);
    return { curriculum: updated, warnings };
  }
}

function buildUserPrompt(
  curriculum: GeneratedCurriculum,
  courses: Array<{
    program_name: string;
    domain: string;
    semester: number;
    semester_level: string;
    category: CategoryCode;
    course_code: string;
    current_title: string;
    credits: number;
    previous_courses: string[];
    allowed_topics: string[];
  }>,
  targetSemester: number | null,
): string {
  const semesterScope = targetSemester
    ? `Regenerate only Semester ${targetSemester} course metadata.`
    : "Generate metadata for all semesters.";
  const guardrails = buildCurriculumAIGuardrailsPrompt(curriculum.programName);

  return `Task: ${semesterScope}

Program: ${curriculum.programName}
Mode: ${curriculum.mode}
Total Credits: ${curriculum.totalCredits}
Semester Count: ${curriculum.semesterCount}

Structured input per course:
- program_name
- domain
- semester_level
- category
- previous_courses
- allowed_topics

Courses to generate metadata for:
${JSON.stringify(courses, null, 2)}

Program-specific guardrails:
${guardrails}

Output JSON format:
{
  "course_titles": [
    {
      "semester": 5,
      "courseCode": "CSE05PE01",
      "category": "PE",
      "courseTitle": "Machine Learning",
      "prerequisites": ["Data Structures", "Algorithms"],
      "learning_hours": 90
    }
  ]
}`;
}

function extractGeminiText(response: Record<string, any>): string {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => String(part?.text || "")).join("\n").trim();
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
    return safeJsonParse(cleaned.slice(firstBrace, lastBrace + 1));
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

function violatesEarlySemesterRule(title: string): boolean {
  const normalized = normalizeCourseTitle(title);
  return FORBIDDEN_EARLY_TERMS.some((term) => normalized.includes(term));
}

function isCourseAlignedWithProgram(
  profile: ReturnType<typeof getDomainKnowledgeProfile>,
  category: CategoryCode,
  title: string,
): boolean {
  if (profile.domain === "GENERIC") return true;
  if (!["ES", "PC", "PE", "OE", "SE", "PR"].includes(category)) return true;
  if (GENERIC_ALLOWED_TERMS.some((term) => normalizeCourseTitle(title).includes(term))) return true;

  const graph = profile.knowledgeGraph;
  if (keywordMatch(title, graph.disallowedTopics)) return false;
  if (keywordMatch(title, graph.coreTopics)) return true;
  if (keywordMatch(title, graph.relatedTopics)) return true;
  if (keywordMatch(title, graph.emergingTopics)) return true;

  // Keep permissive behavior for broader engineering titles; reject only clear mismatches.
  return true;
}
