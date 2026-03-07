import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
  programName: string;
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

function buildOutcomesPrompt(programName: string, courses: CourseInput[]): string {
  return `You are an expert in Outcome-Based Education (OBE) for engineering programs. Generate Course Outcomes (COs) for the following courses in the "${programName}" program.

For each course, generate 4 to 6 Course Outcomes (COs). Each CO must have:
- co_code: "CO1", "CO2", ... up to "CO6"
- statement: A single sentence starting with a Bloom's Taxonomy action verb (e.g., "Apply", "Analyze", "Design", "Implement", "Evaluate", "Recall", "Explain", "Demonstrate")
- rbt_level: One of exactly: "L1 Remembering", "L2 Understanding", "L3 Applying", "L4 Analyzing", "L5 Evaluating", "L6 Creating"
- po_mapping: Array of 2 to 3 integers representing Program Outcome numbers (each in range 1-12)
- pso_mapping: Array of 0 to 2 integers representing Program Specific Outcome numbers (each in range 1-3); use [] if none
- strength: One of "1" (Low), "2" (Medium), "3" (High) indicating the correlation strength

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
): Promise<{ parsed: any; error?: string }> {
  if (!GEMINI_API_KEY) {
    return { parsed: null, error: "GEMINI_API_KEY is not configured" };
  }

  const prompt = buildOutcomesPrompt(programName, courses);

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateOutcomesRequest;
    const programId = String(body.programId || "").trim();
    const programName = String(body.programName || "").trim();
    const courses = Array.isArray(body.courses) ? body.courses : [];

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (!programName) {
      return NextResponse.json({ error: "programName is required" }, { status: 400 });
    }
    if (courses.length === 0) {
      return NextResponse.json({ error: "courses array must not be empty" }, { status: 400 });
    }

    const supabase = await createClient();
    const allOutcomes: CourseOutcome[] = [];
    const errors: string[] = [];

    // Process in batches of 5 to stay within Gemini token limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < courses.length; i += BATCH_SIZE) {
      const batch = courses.slice(i, i + BATCH_SIZE);
      const { parsed, error: geminiError } = await callGeminiForOutcomes(programName, batch);

      if (geminiError || !parsed) {
        const batchCodes = batch.map((c) => c.courseCode).join(", ");
        errors.push(`Batch [${batchCodes}]: ${geminiError ?? "Unknown error"}`);
        continue;
      }

      const parsedCourses = Array.isArray(parsed.courses) ? parsed.courses : [];

      for (const parsedCourse of parsedCourses) {
        const courseCode = String(parsedCourse.courseCode || "").trim();
        if (!courseCode) continue;

        const outcomes = Array.isArray(parsedCourse.outcomes) ? parsedCourse.outcomes : [];

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
            co_number: coNumber,
            co_code: coCode,
            statement,
            rbt_level: rbtLevel,
            po_mapping: poMapping,
            pso_mapping: psoMapping,
            strength,
          });
        }
      }
    }

    // Upsert outcomes to database
    if (allOutcomes.length > 0) {
      const { error: upsertError } = await supabase
        .from("curriculum_course_outcomes")
        .upsert(allOutcomes, {
          onConflict: "program_id, course_code, co_number",
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        errors.push(`Database upsert failed: ${upsertError.message}`);
      }
    }

    return NextResponse.json({ outcomes: allOutcomes, errors });
  } catch (error: any) {
    console.error("Generate outcomes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate outcomes" },
      { status: 500 },
    );
  }
}
