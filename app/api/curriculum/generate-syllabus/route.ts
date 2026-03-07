import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import type { PoolClient } from "pg";
import { resolveProgramAcademicContext } from "@/lib/curriculum/program-context";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface CourseInput {
  id?: string;
  courseCode: string;
  courseTitle: string;
  category: string;
  semester: number;
  credits: number;
}

interface UnitPlan {
  unit: number;
  title: string;
  topics: string[];
  hours: number;
}

interface SyllabusPayload {
  prerequisites: string[];
  courseDescription: string;
  courseOutcomes: string[];
  unitWiseSyllabus: UnitPlan[];
  textbooks: string[];
  referenceBooks: string[];
  evaluationScheme: Record<string, number>;
}

interface GenerateSyllabusRequest {
  programId?: string;
  curriculumId?: string | null;
  versionId?: string | null;
  generatedBy?: string;
  courses?: CourseInput[];
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCourseCode(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

function normalizeCourseInput(course: CourseInput): CourseInput {
  return {
    id: normalizeText(course.id) || undefined,
    courseCode: normalizeCourseCode(course.courseCode),
    courseTitle: normalizeText(course.courseTitle),
    category: normalizeText(course.category).toUpperCase(),
    semester: Math.max(1, Math.floor(Number(course.semester || 1))),
    credits: Math.max(1, Math.floor(Number(course.credits || 1))),
  };
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildDeterministicUnits(course: CourseInput): UnitPlan[] {
  const unitHours = Math.max(5, Math.floor((course.credits * 30) / 5));
  const normalizedTitle = course.courseTitle || course.courseCode;

  return [1, 2, 3, 4, 5].map((unit) => ({
    unit,
    title:
      unit === 1
        ? `Foundations of ${normalizedTitle}`
        : unit === 2
          ? `Core Concepts in ${normalizedTitle}`
          : unit === 3
            ? `${normalizedTitle} Methods and Analysis`
            : unit === 4
              ? `${normalizedTitle} Applications and Case Studies`
              : `${normalizedTitle} Advanced Practice and Review`,
    topics: [
      `Conceptual coverage of ${normalizedTitle} for Unit ${unit}`,
      `Problem-solving and design-oriented exercises`,
      `Laboratory/tutorial-based reinforcement where applicable`,
    ],
    hours: unitHours,
  }));
}

function buildDeterministicSyllabus(
  programName: string,
  course: CourseInput,
  existingOutcomes: string[],
): SyllabusPayload {
  const title = course.courseTitle || course.courseCode;
  const hours = course.credits * 30;

  const defaultOutcomes = [
    `Explain foundational concepts of ${title} in the context of ${programName}.`,
    `Apply analytical and computational techniques from ${title} to solve domain problems.`,
    `Evaluate alternative approaches and tools relevant to ${title}.`,
    `Design a solution artefact or experiment based on ${title} principles.`,
  ];

  const outcomes =
    existingOutcomes.length > 0
      ? existingOutcomes.slice(0, 6)
      : defaultOutcomes;

  const prerequisites =
    course.semester <= 2
      ? ["None"]
      : ["Engineering Mathematics", "Basic discipline fundamentals"];

  return {
    prerequisites,
    courseDescription: `${title} develops applied and analytical competency for ${programName} learners through theory-practice integration, professional use cases, and problem-driven learning aligned with OBE requirements.`,
    courseOutcomes: outcomes,
    unitWiseSyllabus: buildDeterministicUnits(course),
    textbooks: [
      `${title}: Foundations and Applications (Latest Edition)`,
      `${title}: Theory, Practice, and Problem Solving`,
    ],
    referenceBooks: [
      `${title}: Advanced Topics and Case Studies`,
      `${title}: Industry Practices and Standards`,
    ],
    evaluationScheme: {
      internal_assessment_percent: 30,
      end_semester_exam_percent: 70,
      assignment_percent: 10,
      quiz_percent: 10,
      lab_or_project_percent: 10,
    },
  };
}

function buildSyllabusPrompt(programName: string, course: CourseInput, existingOutcomes: string[]): string {
  return `You are an expert academic syllabus designer for Outcome Based Education (OBE) in Indian engineering institutions.

Program: ${programName}
Course:
${JSON.stringify(course, null, 2)}

Existing Course Outcomes (if available):
${existingOutcomes.length > 0 ? existingOutcomes.map((item) => `- ${item}`).join("\n") : "- None"}

Generate a complete syllabus JSON with this exact structure:
{
  "prerequisites": ["..."],
  "courseDescription": "...",
  "courseOutcomes": ["..."],
  "unitWiseSyllabus": [
    {
      "unit": 1,
      "title": "...",
      "topics": ["..."],
      "hours": 6
    }
  ],
  "textbooks": ["..."],
  "referenceBooks": ["..."],
  "evaluationScheme": {
    "internal_assessment_percent": 30,
    "end_semester_exam_percent": 70,
    "assignment_percent": 10,
    "quiz_percent": 10,
    "lab_or_project_percent": 10
  }
}

Rules:
- Course outcomes must be measurable and OBE-friendly.
- Unit-wise syllabus should include 5 units.
- Keep all values practical for Indian engineering curriculum standards.
- Return JSON only (no markdown).`;
}

async function callGeminiForSyllabus(
  programName: string,
  course: CourseInput,
  existingOutcomes: string[],
): Promise<{ payload: SyllabusPayload | null; error?: string }> {
  if (!GEMINI_API_KEY) {
    return { payload: null, error: "GEMINI_API_KEY is not configured" };
  }

  const prompt = buildSyllabusPrompt(programName, course, existingOutcomes);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      console.error("Gemini syllabus generation error response:", body);
      return { payload: null, error: `Gemini API error: ${response.status}` };
    }

    const data = (await response.json()) as Record<string, any>;
    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!text) {
      return { payload: null, error: "Gemini returned an empty response." };
    }

    const parsed = safeJsonParse(text);
    if (!parsed) {
      return { payload: null, error: "Failed to parse Gemini syllabus JSON response." };
    }

    const payload: SyllabusPayload = {
      prerequisites: Array.isArray(parsed.prerequisites)
        ? parsed.prerequisites.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      courseDescription: normalizeText(parsed.courseDescription),
      courseOutcomes: Array.isArray(parsed.courseOutcomes)
        ? parsed.courseOutcomes.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      unitWiseSyllabus: Array.isArray(parsed.unitWiseSyllabus)
        ? parsed.unitWiseSyllabus
            .map((entry: any, index: number) => ({
              unit: Number(entry?.unit || index + 1),
              title: normalizeText(entry?.title) || `Unit ${index + 1}`,
              topics: Array.isArray(entry?.topics)
                ? entry.topics.map((topic: unknown) => normalizeText(topic)).filter(Boolean)
                : [],
              hours: Math.max(1, Math.floor(Number(entry?.hours || 6))),
            }))
            .slice(0, 8)
        : [],
      textbooks: Array.isArray(parsed.textbooks)
        ? parsed.textbooks.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      referenceBooks: Array.isArray(parsed.referenceBooks)
        ? parsed.referenceBooks.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      evaluationScheme:
        parsed.evaluationScheme && typeof parsed.evaluationScheme === "object"
          ? Object.fromEntries(
              Object.entries(parsed.evaluationScheme as Record<string, unknown>)
                .filter(([, value]) => Number.isFinite(Number(value)))
                .map(([key, value]) => [normalizeText(key), Number(value)]),
            )
          : {},
    };

    if (!payload.courseDescription || payload.unitWiseSyllabus.length === 0) {
      return { payload: null, error: "Gemini payload was incomplete." };
    }

    return { payload };
  } catch (error: any) {
    clearTimeout(timeout);
    return { payload: null, error: error.message || "Gemini request failed" };
  }
}

async function fetchCoursesFromDatabase(
  programId: string,
  curriculumId: string | null,
  versionId: string | null,
): Promise<CourseInput[]> {
  const client = await pool.connect();
  try {
    const filters: string[] = ["program_id = $1"];
    const params: unknown[] = [programId];

    if (curriculumId) {
      filters.push(`curriculum_id = $${params.length + 1}`);
      params.push(curriculumId);
    } else if (versionId) {
      filters.push(`version_id = $${params.length + 1}`);
      params.push(versionId);
    } else {
      filters.push("version_id IS NULL");
    }

    const result = await client.query<{
      id: string;
      course_code: string;
      course_title: string;
      category_code: string;
      semester: number;
      credits: number;
    }>(
      `SELECT id, course_code, course_title, category_code, semester, credits
       FROM curriculum_generated_courses
       WHERE ${filters.join(" AND ")}
       ORDER BY semester ASC, course_code ASC`,
      params,
    );

    return result.rows.map((row) =>
      normalizeCourseInput({
        id: row.id,
        courseCode: row.course_code,
        courseTitle: row.course_title,
        category: row.category_code,
        semester: Number(row.semester || 1),
        credits: Number(row.credits || 1),
      }),
    );
  } finally {
    client.release();
  }
}

async function fetchExistingCourseOutcomes(
  programId: string,
  courseCodes: string[],
): Promise<Map<string, string[]>> {
  const outcomeMap = new Map<string, string[]>();
  if (courseCodes.length === 0) return outcomeMap;

  const client = await pool.connect();
  try {
    const result = await client.query<{
      course_code: string;
      statement: string;
    }>(
      `SELECT course_code, statement
       FROM curriculum_course_outcomes
       WHERE program_id = $1
         AND course_code = ANY($2::text[])
       ORDER BY course_code ASC, co_number ASC`,
      [programId, courseCodes],
    );

    for (const row of result.rows) {
      const code = normalizeCourseCode(row.course_code);
      const statement = normalizeText(row.statement);
      if (!code || !statement) continue;
      const existing = outcomeMap.get(code) || [];
      existing.push(statement);
      outcomeMap.set(code, existing);
    }

    return outcomeMap;
  } finally {
    client.release();
  }
}

async function upsertSyllabusRow(
  client: PoolClient,
  args: {
    programId: string;
    curriculumId: string | null;
    course: CourseInput;
    payload: SyllabusPayload;
    generatedBy: string;
  },
): Promise<any> {
  const hours = args.course.credits * 30;

  const values: unknown[] = [
    args.programId,
    args.curriculumId,
    args.course.id || null,
    args.course.courseCode,
    args.course.courseTitle,
    args.course.credits,
    hours,
    args.payload.prerequisites,
    args.payload.courseDescription,
    JSON.stringify(args.payload.courseOutcomes),
    JSON.stringify(args.payload.unitWiseSyllabus),
    args.payload.textbooks,
    args.payload.referenceBooks,
    JSON.stringify(args.payload.evaluationScheme),
    args.generatedBy,
  ];

  if (args.curriculumId) {
    const result = await client.query(
      `INSERT INTO course_syllabus (
          program_id,
          curriculum_id,
          course_id,
          course_code,
          course_title,
          credits,
          hours,
          prerequisites,
          course_description,
          course_outcomes,
          unit_wise_syllabus,
          textbooks,
          reference_books,
          evaluation_scheme,
          generated_by,
          updated_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10::jsonb, $11::jsonb, $12, $13, $14::jsonb, $15, NOW()
       )
       ON CONFLICT (program_id, curriculum_id, course_code)
       DO UPDATE SET
         course_id = COALESCE(EXCLUDED.course_id, course_syllabus.course_id),
         course_title = EXCLUDED.course_title,
         credits = EXCLUDED.credits,
         hours = EXCLUDED.hours,
         prerequisites = EXCLUDED.prerequisites,
         course_description = EXCLUDED.course_description,
         course_outcomes = EXCLUDED.course_outcomes,
         unit_wise_syllabus = EXCLUDED.unit_wise_syllabus,
         textbooks = EXCLUDED.textbooks,
         reference_books = EXCLUDED.reference_books,
         evaluation_scheme = EXCLUDED.evaluation_scheme,
         generated_by = EXCLUDED.generated_by,
         updated_at = NOW()
       RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  await client.query(
    `DELETE FROM course_syllabus
     WHERE program_id = $1
       AND curriculum_id IS NULL
       AND course_code = $2`,
    [args.programId, args.course.courseCode],
  );

  const result = await client.query(
    `INSERT INTO course_syllabus (
        program_id,
        curriculum_id,
        course_id,
        course_code,
        course_title,
        credits,
        hours,
        prerequisites,
        course_description,
        course_outcomes,
        unit_wise_syllabus,
        textbooks,
        reference_books,
        evaluation_scheme,
        generated_by,
        updated_at
     ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10::jsonb, $11::jsonb, $12, $13, $14::jsonb, $15, NOW()
     )
     RETURNING *`,
    values,
  );

  return result.rows[0];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateSyllabusRequest;
    const programId = normalizeText(body.programId);
    const curriculumId = normalizeText(body.curriculumId) || null;
    const versionId = normalizeText(body.versionId) || null;
    const generatedBy = normalizeText(body.generatedBy) || "ai";

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const contextResult = await resolveProgramAcademicContext(programId);
    if (!contextResult.context || contextResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: contextResult.errors[0] || "Failed to resolve program context.",
          errors: contextResult.errors,
          warnings: contextResult.warnings,
        },
        { status: 400 },
      );
    }

    const providedCourses = Array.isArray(body.courses)
      ? body.courses.map(normalizeCourseInput).filter((course) => !!course.courseCode)
      : [];

    const courses =
      providedCourses.length > 0
        ? providedCourses
        : await fetchCoursesFromDatabase(programId, curriculumId, versionId);

    if (courses.length === 0) {
      return NextResponse.json(
        { error: "No courses found to generate syllabus." },
        { status: 400 },
      );
    }

    const warnings: string[] = [...contextResult.warnings];
    const outcomeMap = await fetchExistingCourseOutcomes(
      programId,
      courses.map((course) => course.courseCode),
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const generatedRows: any[] = [];
      for (const course of courses) {
        const existingOutcomes = outcomeMap.get(course.courseCode) || [];
        const aiResult = await callGeminiForSyllabus(
          contextResult.context.displayName,
          course,
          existingOutcomes,
        );

        if (aiResult.error) {
          warnings.push(
            `${course.courseCode}: deterministic syllabus fallback used (${aiResult.error}).`,
          );
        }

        const payload =
          aiResult.payload ||
          buildDeterministicSyllabus(contextResult.context.displayName, course, existingOutcomes);

        const row = await upsertSyllabusRow(client, {
          programId,
          curriculumId,
          course,
          payload,
          generatedBy,
        });
        generatedRows.push(row);
      }

      await client.query("COMMIT");

      return NextResponse.json({
        syllabi: generatedRows,
        warnings,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Syllabus generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate syllabus." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = normalizeText(searchParams.get("programId"));
    const curriculumId = normalizeText(searchParams.get("curriculumId"));

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const filters: string[] = ["program_id = $1"];
    const params: unknown[] = [programId];

    if (curriculumId) {
      filters.push(`curriculum_id = $${params.length + 1}`);
      params.push(curriculumId);
    } else {
      filters.push("curriculum_id IS NULL");
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT *
         FROM course_syllabus
         WHERE ${filters.join(" AND ")}
         ORDER BY course_code ASC`,
        params,
      );

      return NextResponse.json({ syllabi: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Syllabus fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch course syllabus." },
      { status: 500 },
    );
  }
}
