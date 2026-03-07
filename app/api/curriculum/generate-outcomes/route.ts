import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import type { PoolClient } from "pg";
import { resolveProgramAcademicContext } from "@/lib/curriculum/program-context";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface CourseInput {
  courseCode: string;
  courseTitle: string;
  category: string;
  semester: number;
  credits: number;
}

interface CourseOutcome {
  program_id: string;
  course_code: string;
  course_title?: string;
  co_number: number;
  co_code: string;
  statement: string;
  rbt_level: string;
  po_mapping: number[];
  pso_mapping: number[];
  strength: string;
}

interface GenerateOutcomesRequest {
  programId: string;
  programName?: string;
  curriculumId?: string;
  versionId?: string;
  courses: CourseInput[];
}

const RBT_LEVELS = [
  "L1 Remembering",
  "L2 Understanding",
  "L3 Applying",
  "L4 Analyzing",
  "L5 Evaluating",
  "L6 Creating",
];

function buildOutcomesPrompt(
  programName: string,
  courses: CourseInput[],
  references: { pos: string[]; psos: string[] },
): string {
  const poReferenceText =
    references.pos.length > 0
      ? references.pos.map((po) => `- ${po}`).join("\n")
      : "- Standard NBA POs (PO1 to PO12)";

  const psoReferenceText =
    references.psos.length > 0
      ? references.psos.map((pso) => `- ${pso}`).join("\n")
      : "- PSO1 to PSO3 (use only if relevant)";

  return `You are an expert in Outcome-Based Education (OBE) for engineering programs. Generate Course Outcomes (COs) for the following courses in the "${programName}" program.

For each course, generate 4 to 6 Course Outcomes (COs). Each CO must have:
- co_code: "CO1", "CO2", ... up to "CO6"
- statement: A single sentence starting with a Bloom's Taxonomy action verb (e.g., "Apply", "Analyze", "Design", "Implement", "Evaluate", "Recall", "Explain", "Demonstrate")
- rbt_level: One of exactly: "L1 Remembering", "L2 Understanding", "L3 Applying", "L4 Analyzing", "L5 Evaluating", "L6 Creating"
- po_mapping: Array of 2 to 3 integers representing Program Outcome numbers (each in range 1-12)
- pso_mapping: Array of 0 to 2 integers representing Program Specific Outcome numbers (each in range 1-3); use [] if none
- strength: One of "1" (Low), "2" (Medium), "3" (High) indicating the correlation strength

Program Outcome references:
${poReferenceText}

Program Specific Outcome references:
${psoReferenceText}

Courses:
${JSON.stringify(courses, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "courses": [
    {
      "courseCode": "COURSE_CODE",
      "outcomes": [
        {
          "co_code": "CO1",
          "statement": "Apply principles of ... to ...",
          "rbt_level": "L3 Applying",
          "po_mapping": [1, 2, 5],
          "pso_mapping": [1],
          "strength": "3"
        }
      ]
    }
  ]
}`;
}

function safeJsonParse(raw: string): any | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to extract JSON object from surrounding text
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGeminiForOutcomes(
  programName: string,
  courses: CourseInput[],
  references: { pos: string[]; psos: string[] },
): Promise<{ parsed: any; error?: string }> {
  if (!GEMINI_API_KEY) {
    return { parsed: null, error: "GEMINI_API_KEY is not configured" };
  }

  const prompt = buildOutcomesPrompt(programName, courses, references);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      console.error("Gemini outcomes error response:", body);
      return { parsed: null, error: `Gemini API error: ${response.status}` };
    }

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      return { parsed: null, error: "Gemini returned empty response" };
    }

    const parsed = safeJsonParse(text);
    if (!parsed) {
      return { parsed: null, error: "Failed to parse Gemini JSON response" };
    }

    return { parsed };
  } catch (err: any) {
    clearTimeout(timeout);
    return { parsed: null, error: err.message || "Gemini request failed" };
  }
}

function normalizeCourseInput(course: CourseInput): CourseInput {
  return {
    courseCode: String(course.courseCode || "").trim(),
    courseTitle: String(course.courseTitle || "").trim(),
    category: String(course.category || "").trim().toUpperCase(),
    semester: Math.max(1, Math.floor(Number(course.semester || 0) || 1)),
    credits: Math.max(1, Math.floor(Number(course.credits || 0) || 1)),
  };
}

function pickNumbers(pool: number[], offset: number, count: number): number[] {
  if (pool.length === 0 || count <= 0) return [];
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    values.push(pool[(offset + i) % pool.length]);
  }
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function seedFromText(value: string): number {
  return String(value || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function buildDeterministicOutcomes(
  programId: string,
  course: CourseInput,
  availablePOs: number[],
  availablePSOs: number[],
): CourseOutcome[] {
  const normalized = normalizeCourseInput(course);
  const title = normalized.courseTitle || normalized.courseCode;
  const seed = seedFromText(`${normalized.courseCode}|${normalized.courseTitle}`);
  const poPool =
    availablePOs.length > 0
      ? availablePOs
      : Array.from({ length: 12 }, (_, i) => i + 1);

  const psoPool = availablePSOs.length > 0 ? availablePSOs : [];
  const verbSet =
    normalized.semester <= 2
      ? ["Explain", "Identify", "Apply", "Demonstrate"]
      : normalized.semester <= 4
        ? ["Apply", "Analyze", "Implement", "Evaluate"]
        : ["Design", "Develop", "Integrate", "Evaluate"];

  return [1, 2, 3, 4].map((coNumber, idx) => {
    const verb = verbSet[idx % verbSet.length];
    const poMapping = pickNumbers(poPool, seed + idx, idx % 2 === 0 ? 3 : 2);
    const psoMapping = psoPool.length > 0 ? pickNumbers(psoPool, seed + idx, 1) : [];
    const rbtLevel =
      idx <= 0
        ? "L2 Understanding"
        : idx === 1
          ? "L3 Applying"
          : idx === 2
            ? "L4 Analyzing"
            : "L5 Evaluating";

    return {
      program_id: programId,
      course_code: normalized.courseCode,
      course_title: normalized.courseTitle,
      co_number: coNumber,
      co_code: `CO${coNumber}`,
      statement: `${verb} key concepts of ${title} to solve discipline-relevant academic and practical problems.`,
      rbt_level: rbtLevel,
      po_mapping: poMapping,
      pso_mapping: psoMapping,
      strength: idx >= 2 ? "3" : "2",
    };
  });
}

async function fetchOutcomeReferences(programId: string): Promise<{
  pos: string[];
  psos: string[];
  poNumbers: number[];
  psoNumbers: number[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const client = await pool.connect();
  try {
    const pos: string[] = [];
    const psos: string[] = [];
    const poNumbers: number[] = [];
    const psoNumbers: number[] = [];

    try {
      const poResult = await client.query<{
        po_code: string;
        po_title: string | null;
        po_description: string | null;
      }>(
        `SELECT po_code, po_title, po_description
         FROM program_outcomes
         WHERE program_id = $1
         ORDER BY po_code ASC`,
        [programId],
      );

      for (const row of poResult.rows) {
        const code = String(row.po_code || "").trim().toUpperCase();
        const number = Number(code.replace(/[^0-9]/g, ""));
        if (Number.isFinite(number) && number >= 1 && number <= 12) {
          poNumbers.push(number);
        }
        const label = [code, row.po_title, row.po_description]
          .filter((item) => String(item || "").trim())
          .join(" - ");
        if (label) pos.push(label);
      }
    } catch (error: any) {
      if (String(error?.code) === "42P01") {
        warnings.push("program_outcomes table not found; using default PO references.");
      } else {
        throw error;
      }
    }

    try {
      const psoResult = await client.query<{
        pso_number: number | null;
        pso_statement: string | null;
      }>(
        `SELECT pso_number, pso_statement
         FROM program_psos
         WHERE program_id = $1
         ORDER BY pso_number ASC`,
        [programId],
      );

      for (const row of psoResult.rows) {
        const number = Number(row.pso_number || 0);
        if (Number.isFinite(number) && number >= 1 && number <= 3) {
          psoNumbers.push(number);
        }
        const labelNumber = Number.isFinite(number) && number > 0 ? `PSO${number}` : "PSO";
        const statement = String(row.pso_statement || "").trim();
        psos.push(statement ? `${labelNumber} - ${statement}` : labelNumber);
      }
    } catch (error: any) {
      if (String(error?.code) === "42P01") {
        warnings.push("program_psos table not found; using default PSO references.");
      } else {
        throw error;
      }
    }

    return {
      pos,
      psos,
      poNumbers: Array.from(new Set(poNumbers)).sort((a, b) => a - b),
      psoNumbers: Array.from(new Set(psoNumbers)).sort((a, b) => a - b),
      warnings,
    };
  } finally {
    client.release();
  }
}

function deduplicateOutcomes(rows: CourseOutcome[]): CourseOutcome[] {
  const map = new Map<string, CourseOutcome>();
  for (const row of rows) {
    const key = `${row.program_id}::${row.course_code}::${row.co_number}`;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.course_code === b.course_code) return a.co_number - b.co_number;
    return a.course_code.localeCompare(b.course_code);
  });
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function toStrengthNumber(value: string): number {
  const parsed = Math.floor(Number(value || 0));
  if (!Number.isFinite(parsed)) return 2;
  return Math.min(3, Math.max(1, parsed));
}

async function resolveCurriculumId(
  client: PoolClient,
  input: { programId: string; curriculumId: string | null; versionId: string | null },
): Promise<{ curriculumId: string | null; warnings: string[] }> {
  const warnings: string[] = [];

  if (input.curriculumId) {
    try {
      const result = await client.query<{ id: string; program_id: string }>(
        `SELECT id, program_id
         FROM curriculums
         WHERE id = $1
         LIMIT 1`,
        [input.curriculumId],
      );

      if (result.rows.length === 0 || String(result.rows[0].program_id) !== input.programId) {
        throw new Error("Invalid curriculumId for the selected program.");
      }
      return { curriculumId: result.rows[0].id, warnings };
    } catch (error: any) {
      if (String(error?.code) === "42P01") {
        warnings.push("curriculums table not found; curriculum_id linkage was skipped.");
        return { curriculumId: null, warnings };
      }
      throw error;
    }
  }

  if (!input.versionId) {
    return { curriculumId: null, warnings };
  }

  const versionResult = await client.query<{
    id: string;
    program_id: string;
    year: number;
    version: string;
  }>(
    `SELECT id, program_id, year, version
     FROM curriculum_versions
     WHERE id = $1
     LIMIT 1`,
    [input.versionId],
  );

  if (versionResult.rows.length === 0) {
    throw new Error("Invalid versionId: curriculum version not found.");
  }

  const versionRow = versionResult.rows[0];
  if (String(versionRow.program_id) !== input.programId) {
    throw new Error("Invalid versionId: version does not belong to selected program.");
  }

  try {
    const curriculumResult = await client.query<{ id: string }>(
      `INSERT INTO curriculums (
          program_id,
          regulation_year,
          version,
          approval_status,
          updated_at
       ) VALUES ($1, $2, $3, 'draft', NOW())
       ON CONFLICT (program_id, regulation_year, version)
       DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [input.programId, Number(versionRow.year), String(versionRow.version || "Version")],
    );
    return { curriculumId: curriculumResult.rows[0]?.id || null, warnings };
  } catch (error: any) {
    if (String(error?.code) === "42P01") {
      warnings.push("curriculums table not found; curriculum_id linkage was skipped.");
      return { curriculumId: null, warnings };
    }
    throw error;
  }
}

async function persistOutcomesAndMappings(args: {
  programId: string;
  curriculumId: string | null;
  outcomes: CourseOutcome[];
}): Promise<{ warnings: string[]; errors: string[] }> {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (args.outcomes.length === 0) return { warnings, errors };

  const courseCodes = Array.from(new Set(args.outcomes.map((outcome) => outcome.course_code)));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let outcomesHasCurriculumColumn = true;
    try {
      await client.query("SELECT curriculum_id FROM curriculum_course_outcomes LIMIT 1");
    } catch (error: any) {
      if (String(error?.code) === "42703") {
        outcomesHasCurriculumColumn = false;
      } else {
        throw error;
      }
    }

    if (outcomesHasCurriculumColumn) {
      if (args.curriculumId) {
        await client.query(
          `DELETE FROM curriculum_course_outcomes
           WHERE program_id = $1
             AND curriculum_id = $2
             AND course_code = ANY($3::text[])`,
          [args.programId, args.curriculumId, courseCodes],
        );
      } else {
        await client.query(
          `DELETE FROM curriculum_course_outcomes
           WHERE program_id = $1
             AND curriculum_id IS NULL
             AND course_code = ANY($2::text[])`,
          [args.programId, courseCodes],
        );
      }
    } else {
      await client.query(
        `DELETE FROM curriculum_course_outcomes
         WHERE program_id = $1
           AND course_code = ANY($2::text[])`,
        [args.programId, courseCodes],
      );
      warnings.push(
        "curriculum_course_outcomes.curriculum_id is unavailable; outcomes were saved without curriculum_id linkage.",
      );
    }

    const coIdByKey = new Map<string, string>();
    for (const outcome of args.outcomes) {
      const insertResult = outcomesHasCurriculumColumn
        ? await client.query<{ id: string; course_code: string; co_code: string }>(
            `INSERT INTO curriculum_course_outcomes (
                program_id,
                curriculum_id,
                course_code,
                course_title,
                co_number,
                co_code,
                statement,
                rbt_level,
                po_mapping,
                pso_mapping,
                strength,
                updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             RETURNING id, course_code, co_code`,
            [
              args.programId,
              args.curriculumId,
              outcome.course_code,
              outcome.course_title || null,
              outcome.co_number,
              outcome.co_code,
              outcome.statement,
              outcome.rbt_level,
              outcome.po_mapping,
              outcome.pso_mapping,
              outcome.strength,
            ],
          )
        : await client.query<{ id: string; course_code: string; co_code: string }>(
            `INSERT INTO curriculum_course_outcomes (
                program_id,
                course_code,
                course_title,
                co_number,
                co_code,
                statement,
                rbt_level,
                po_mapping,
                pso_mapping,
                strength,
                updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING id, course_code, co_code`,
            [
              args.programId,
              outcome.course_code,
              outcome.course_title || null,
              outcome.co_number,
              outcome.co_code,
              outcome.statement,
              outcome.rbt_level,
              outcome.po_mapping,
              outcome.pso_mapping,
              outcome.strength,
            ],
          );

      const row = insertResult.rows[0];
      if (row?.id) {
        coIdByKey.set(`${row.course_code}::${row.co_code}`, row.id);
      }
    }

    const courseIdByCode = new Map<string, string>();
    let coursesHasCurriculumColumn = true;
    try {
      await client.query("SELECT curriculum_id FROM curriculum_generated_courses LIMIT 1");
    } catch (error: any) {
      if (String(error?.code) === "42703") {
        coursesHasCurriculumColumn = false;
      } else {
        throw error;
      }
    }

    const courseLookup = coursesHasCurriculumColumn
      ? args.curriculumId
        ? await client.query<{ id: string; course_code: string }>(
            `SELECT id, course_code
             FROM curriculum_generated_courses
             WHERE program_id = $1
               AND curriculum_id = $2
               AND course_code = ANY($3::text[])`,
            [args.programId, args.curriculumId, courseCodes],
          )
        : await client.query<{ id: string; course_code: string }>(
            `SELECT id, course_code
             FROM curriculum_generated_courses
             WHERE program_id = $1
               AND curriculum_id IS NULL
               AND course_code = ANY($2::text[])`,
            [args.programId, courseCodes],
          )
      : await client.query<{ id: string; course_code: string }>(
          `SELECT id, course_code
           FROM curriculum_generated_courses
           WHERE program_id = $1
             AND course_code = ANY($2::text[])`,
          [args.programId, courseCodes],
        );

    for (const row of courseLookup.rows) {
      courseIdByCode.set(String(row.course_code), String(row.id));
    }

    let hasCoPoMappingTable = true;
    let hasCoPsoMappingTable = true;
    try {
      await client.query("SELECT id FROM co_po_mapping LIMIT 1");
    } catch (error: any) {
      if (String(error?.code) === "42P01") {
        hasCoPoMappingTable = false;
        warnings.push(
          "co_po_mapping table not found; normalized CO-PO mapping persistence was skipped.",
        );
      } else {
        throw error;
      }
    }

    try {
      await client.query("SELECT id FROM co_pso_mapping LIMIT 1");
    } catch (error: any) {
      if (String(error?.code) === "42P01") {
        hasCoPsoMappingTable = false;
        warnings.push(
          "co_pso_mapping table not found; normalized CO-PSO mapping persistence was skipped.",
        );
      } else {
        throw error;
      }
    }

    if (hasCoPoMappingTable) {
      if (args.curriculumId) {
        await client.query(
          `DELETE FROM co_po_mapping
           WHERE program_id = $1
             AND curriculum_id = $2
             AND course_code = ANY($3::text[])`,
          [args.programId, args.curriculumId, courseCodes],
        );
      } else {
        await client.query(
          `DELETE FROM co_po_mapping
           WHERE program_id = $1
             AND curriculum_id IS NULL
             AND course_code = ANY($2::text[])`,
          [args.programId, courseCodes],
        );
      }
    }

    if (hasCoPsoMappingTable) {
      if (args.curriculumId) {
        await client.query(
          `DELETE FROM co_pso_mapping
           WHERE program_id = $1
             AND curriculum_id = $2
             AND course_code = ANY($3::text[])`,
          [args.programId, args.curriculumId, courseCodes],
        );
      } else {
        await client.query(
          `DELETE FROM co_pso_mapping
           WHERE program_id = $1
             AND curriculum_id IS NULL
             AND course_code = ANY($2::text[])`,
          [args.programId, courseCodes],
        );
      }
    }

    if (hasCoPoMappingTable || hasCoPsoMappingTable) {
      for (const outcome of args.outcomes) {
        const coId = coIdByKey.get(`${outcome.course_code}::${outcome.co_code}`) || null;
        const courseId = courseIdByCode.get(outcome.course_code) || null;
        const strength = toStrengthNumber(outcome.strength);

        if (hasCoPoMappingTable) {
          for (const po of outcome.po_mapping) {
            await client.query(
              `INSERT INTO co_po_mapping (
                  program_id,
                  curriculum_id,
                  course_id,
                  co_id,
                  course_code,
                  co_code,
                  po_id,
                  strength,
                  updated_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                args.programId,
                args.curriculumId,
                courseId,
                coId,
                outcome.course_code,
                outcome.co_code,
                po,
                strength,
              ],
            );
          }
        }

        if (hasCoPsoMappingTable) {
          for (const pso of outcome.pso_mapping) {
            await client.query(
              `INSERT INTO co_pso_mapping (
                  program_id,
                  curriculum_id,
                  course_id,
                  co_id,
                  course_code,
                  co_code,
                  pso_id,
                  strength,
                  updated_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                args.programId,
                args.curriculumId,
                courseId,
                coId,
                outcome.course_code,
                outcome.co_code,
                pso,
                strength,
              ],
            );
          }
        }
      }
    }

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    errors.push(error?.message || "Failed to persist generated outcomes.");
  } finally {
    client.release();
  }

  return { warnings, errors };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateOutcomesRequest;
    const programId = String(body.programId || "").trim();
    const requestedProgramName = String(body.programName || "").trim();
    const requestedCurriculumId = normalizeOptionalId(body.curriculumId);
    const versionId = normalizeOptionalId(body.versionId);
    const courses = Array.isArray(body.courses)
      ? body.courses.map(normalizeCourseInput).filter((c) => !!c.courseCode)
      : [];

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (courses.length === 0) {
      return NextResponse.json({ error: "courses array must not be empty" }, { status: 400 });
    }

    const contextResult = await resolveProgramAcademicContext(programId);
    if (!contextResult.context || contextResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: contextResult.errors[0] || "Unable to resolve program context.",
          errors: contextResult.errors,
          warnings: contextResult.warnings,
        },
        { status: 400 },
      );
    }

    const programName = requestedProgramName || contextResult.context.displayName;
    if (!programName) {
      return NextResponse.json(
        { error: "Program name could not be resolved for outcomes generation." },
        { status: 400 },
      );
    }

    const references = await fetchOutcomeReferences(programId);
    const allOutcomes: CourseOutcome[] = [];
    const errors: string[] = [];
    const warnings: string[] = [...contextResult.warnings, ...references.warnings];

    const resolutionClient = await pool.connect();
    let resolvedCurriculumId: string | null = null;
    try {
      const curriculumResolution = await resolveCurriculumId(resolutionClient, {
        programId,
        curriculumId: requestedCurriculumId,
        versionId,
      });
      resolvedCurriculumId = curriculumResolution.curriculumId;
      warnings.push(...curriculumResolution.warnings);
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Failed to resolve curriculum context.", warnings },
        { status: 400 },
      );
    } finally {
      resolutionClient.release();
    }

    // Process in batches of 5 to stay within Gemini token limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < courses.length; i += BATCH_SIZE) {
      const batch = courses.slice(i, i + BATCH_SIZE);
      const { parsed, error: geminiError } = await callGeminiForOutcomes(
        programName,
        batch,
        references,
      );

      if (geminiError || !parsed) {
        const batchCodes = batch.map((c) => c.courseCode).join(", ");
        warnings.push(
          `Batch [${batchCodes}] used deterministic fallback outcomes (${geminiError ?? "Unknown Gemini error"}).`,
        );
        for (const course of batch) {
          allOutcomes.push(
            ...buildDeterministicOutcomes(
              programId,
              course,
              references.poNumbers,
              references.psoNumbers,
            ),
          );
        }
        continue;
      }

      const parsedCourses = Array.isArray(parsed.courses) ? parsed.courses : [];
      const parsedCourseCodes = new Set<string>();

      for (const parsedCourse of parsedCourses) {
        const courseCode = String(parsedCourse.courseCode || "").trim();
        if (!courseCode) continue;

        const outcomes = Array.isArray(parsedCourse.outcomes) ? parsedCourse.outcomes : [];
        let hasValidOutcome = false;

        for (const outcome of outcomes) {
          const coCode = String(outcome.co_code || "").trim();
          const coNumberMatch = coCode.match(/\d+/);
          const coNumber = coNumberMatch ? parseInt(coNumberMatch[0], 10) : 0;
          if (!coNumber) continue;

          const statement = String(outcome.statement || "").trim();
          if (!statement) continue;

          const rbtLevel = RBT_LEVELS.includes(outcome.rbt_level)
            ? outcome.rbt_level
            : "L3 Applying";

          const poMapping = Array.isArray(outcome.po_mapping)
            ? outcome.po_mapping
                .map((n: unknown) => Number(n))
                .filter((n: number) => Number.isFinite(n) && n >= 1 && n <= 12)
            : [];

          const psoMapping = Array.isArray(outcome.pso_mapping)
            ? outcome.pso_mapping
                .map((n: unknown) => Number(n))
                .filter((n: number) => Number.isFinite(n) && n >= 1 && n <= 3)
            : [];

          const strength = ["1", "2", "3"].includes(String(outcome.strength))
            ? String(outcome.strength)
            : "2";

          allOutcomes.push({
            program_id: programId,
            course_code: courseCode,
            course_title:
              batch.find((course) => course.courseCode === courseCode)?.courseTitle || "",
            co_number: coNumber,
            co_code: coCode,
            statement,
            rbt_level: rbtLevel,
            po_mapping: poMapping,
            pso_mapping: psoMapping,
            strength,
          });
          hasValidOutcome = true;
        }

        if (hasValidOutcome) {
          parsedCourseCodes.add(courseCode);
        }
      }

      for (const course of batch) {
        if (parsedCourseCodes.has(course.courseCode)) continue;
        warnings.push(
          `No AI outcomes were returned for ${course.courseCode}; deterministic fallback outcomes were used.`,
        );
        allOutcomes.push(
          ...buildDeterministicOutcomes(
            programId,
            course,
            references.poNumbers,
            references.psoNumbers,
          ),
        );
      }
    }

    const uniqueOutcomes = deduplicateOutcomes(allOutcomes);

    const persistence = await persistOutcomesAndMappings({
      programId,
      curriculumId: resolvedCurriculumId,
      outcomes: uniqueOutcomes,
    });

    warnings.push(...persistence.warnings);
    errors.push(...persistence.errors);

    return NextResponse.json({
      outcomes: uniqueOutcomes,
      curriculumId: resolvedCurriculumId,
      errors,
      warnings,
    });
  } catch (error: any) {
    console.error("Generate outcomes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate outcomes" },
      { status: 500 },
    );
  }
}
