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
import { getAiCache, setAiCache } from "./ai-cache";
import { callAI } from "./ai-model-router";

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



const SYSTEM_PROMPT = `You are an expert academic curriculum architect specializing in Outcome-Based Education (OBE) for engineering programs in India (NEP-2020, AICTE, NBA Tier-I aligned).

## Mandatory Course Naming Standard

Every course title MUST follow this format:
  "Primary Concept, Supporting Topics and Engineering Context"

### Good Examples (use these patterns):
- BS: "Calculus, Differential Equations and Transform Methods for Computational Systems"
- BS: "Discrete Mathematics, Graph Theory and Combinatorial Optimization"
- BS: "Probability Theory, Statistical Methods and Stochastic Processes"
- ES: "Structured Programming, Algorithms and Computational Problem Solving"
- ES: "Data Structures, Graph Algorithms and Efficient Computing Techniques"
- ES: "Engineering Graphics, Technical Drawing and Computer-Aided Design"
- PC: "Operating System Architecture, Process Management and Concurrent Computing"
- PC: "Database Systems, Transaction Processing and Data Storage Architectures"
- PC: "Computer Networking, Internet Protocols and Distributed Communication Systems"
- PE: "Machine Learning Algorithms, Statistical Models and Predictive Analytics"
- PE: "Cloud Computing Architectures, Microservices and Scalable Distributed Systems"

### Forbidden Patterns (NEVER use these):
- Short generic titles: "Engineering Mathematics", "Physics", "Programming", "Data Structures"
- Sequential suffixes: "Engineering Mathematics I", "Engineering Mathematics II"
- Vague placeholders: "PC Course", "PE Course", "Major Elective", "Open Elective 1"

## Academic Progression Rules
- Semesters 1-2: Basic Foundations (Calculus + Physics + Programming + Graphics)
- Semesters 3-4: Core Discipline (Data Structures, Algorithms, OS, DBMS, Networks)
- Semesters 5-7: Advanced Specialization (Machine Learning, Cloud, Security, Distributed Systems)
- Semester 8: Capstone (spanning BOTH Semester 7 and 8 as Phase I and Phase II)

## Constraints
1. Every title must contain at least 2 concepts (use commas/and).
2. Emerging technology courses (AI, ML, Cloud) only appear in Semester 5+.
3. learning_hours must exactly equal credits * 30.
4. Return valid JSON only — no prose, no markdown fences.`;

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
  "advanced data structures",
  "complex algorithms",
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

  const userPrompt = buildUserPrompt(updated, coursesForPrompt, targetSemester);
  const cacheKey = `${updated.programName}_${updated.semesterCount}_${JSON.stringify(coursesForPrompt)}`;

  // 1. Check Cache
  const cachedResponse = await getAiCache(cacheKey);
  let rawText = "";

  if (cachedResponse) {
    console.log("Curriculum AI: Using cached response.");
    rawText = cachedResponse;
  } else {
    try {
      console.log("Curriculum AI: Starting AI title generation via Router...");
      rawText = await callAI(userPrompt, "bulk");
      await setAiCache(cacheKey, rawText);
    } catch (error: any) {
      warnings.push("AI title generation failed after all fallbacks. Using default titles.");
      console.error("Curriculum AI Router Error:", error);
      return { curriculum: updated, warnings };
    }
  }

  const parsed = parseAiPayload(rawText);
  if (!parsed) {
    warnings.push("Unable to parse AI title payload. Using fallback titles.");
    return { curriculum: updated, warnings };
  }

  const candidateRows =
    Array.isArray(parsed.course_titles) && parsed.course_titles.length > 0
      ? parsed.course_titles
      : Array.isArray(parsed.courses)
        ? parsed.courses
        : [];

  if (candidateRows.length === 0) {
    console.warn("Curriculum AI: AI returned 0 candidate rows.");
    warnings.push("AI did not return any mapped course titles. Using fallback titles.");
    return { curriculum: updated, warnings };
  }
  console.log(`Curriculum AI: Processing ${candidateRows.length} candidate rows...`);

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

  return true;
}
