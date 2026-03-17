import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

/**
 * GET /api/curriculum/structure?programId=<uuid>
 * Returns curriculum_category_credits, curriculum_electives_settings, curriculum_semester_categories
 *
 * POST /api/curriculum/structure?programId=<uuid>
 * Body: { categoryCredits, electivesSettings, semesterCategories }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const [categoryCreditsRes, electivesSettingsRes, semesterCategoriesRes] = await Promise.all([
        client.query("SELECT * FROM curriculum_category_credits WHERE program_id = $1", [programId]),
        client.query("SELECT * FROM curriculum_electives_settings WHERE program_id = $1 LIMIT 1", [programId]),
        client.query("SELECT * FROM curriculum_semester_categories WHERE program_id = $1", [programId]),
      ]);

      return NextResponse.json({
        categoryCredits: categoryCreditsRes.rows,
        electivesSettings: electivesSettingsRes.rows[0] || null,
        semesterCategories: semesterCategoriesRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching curriculum structure:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch curriculum structure" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { categoryCredits, electivesSettings, semesterCategories } = body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Upsert Category Credits
      if (Array.isArray(categoryCredits) && categoryCredits.length > 0) {
        for (const item of categoryCredits) {
          await client.query(
            `INSERT INTO curriculum_category_credits
               (program_id, category_code, category_name, design_percentage, num_courses,
                num_labs, num_projects, theory_hours, practical_hours, tutorial_hours,
                lab_hours, ci_hours, total_hours, total_credits, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
             ON CONFLICT (program_id, category_code)
             DO UPDATE SET
               category_name = EXCLUDED.category_name,
               design_percentage = EXCLUDED.design_percentage,
               num_courses = EXCLUDED.num_courses,
               num_labs = EXCLUDED.num_labs,
               num_projects = EXCLUDED.num_projects,
               theory_hours = EXCLUDED.theory_hours,
               practical_hours = EXCLUDED.practical_hours,
               tutorial_hours = EXCLUDED.tutorial_hours,
               lab_hours = EXCLUDED.lab_hours,
               ci_hours = EXCLUDED.ci_hours,
               total_hours = EXCLUDED.total_hours,
               total_credits = EXCLUDED.total_credits,
               updated_at = NOW()`,
            [
              programId,
              item.category_code,
              item.category_name || null,
              item.design_percentage ?? null,
              item.num_courses ?? null,
              item.num_labs ?? null,
              item.num_projects ?? null,
              item.theory_hours ?? null,
              item.practical_hours ?? null,
              item.tutorial_hours ?? null,
              item.lab_hours ?? null,
              item.ci_hours ?? null,
              item.total_hours ?? null,
              item.total_credits ?? null,
            ],
          );
        }
      }

      // 2. Upsert Electives Settings
      if (electivesSettings) {
        await client.query(
          `INSERT INTO curriculum_electives_settings
             (program_id, professional_elective_slots, open_elective_slots, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (program_id)
           DO UPDATE SET
             professional_elective_slots = EXCLUDED.professional_elective_slots,
             open_elective_slots = EXCLUDED.open_elective_slots,
             updated_at = NOW()`,
          [
            programId,
            electivesSettings.professional_elective_slots ?? null,
            electivesSettings.open_elective_slots ?? null,
          ],
        );
      }

      // 3. Upsert Semester Categories
      if (Array.isArray(semesterCategories) && semesterCategories.length > 0) {
        for (const item of semesterCategories) {
          await client.query(
            `INSERT INTO curriculum_semester_categories
               (program_id, semester, category_code, num_courses, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (program_id, semester)
             DO UPDATE SET
               category_code = EXCLUDED.category_code,
               num_courses = EXCLUDED.num_courses,
               updated_at = NOW()`,
            [programId, item.semester, item.category_code || null, item.num_courses ?? null],
          );
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: "Curriculum structure saved successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error saving curriculum structure:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save curriculum structure" },
      { status: 500 },
    );
  }
}
