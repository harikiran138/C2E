import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GeneratedCurriculum } from "@/lib/curriculum/engine";

interface SaveCurriculumRequest {
  programId?: string;
  categoryCredits?: any[];
  electivesSettings?: Record<string, any> | null;
  semesterCategories?: any[];
  curriculum?: GeneratedCurriculum | null;
}

function getDesignPercentTotal(categoryCredits: any[]): number {
  return categoryCredits.reduce(
    (acc, row) => acc + (Number(row?.design_percent) || 0),
    0,
  );
}

function getCategoryDesignPercent(
  categoryCredits: any[],
  categoryCode: string,
): number {
  const row = categoryCredits.find(
    (item) => String(item?.category_code || "").toUpperCase() === categoryCode,
  );
  return Number(row?.design_percent) || 0;
}

function getCategoryRow(categoryCredits: any[], categoryCode: string): any | null {
  return (
    categoryCredits.find(
      (item) => String(item?.category_code || "").toUpperCase() === categoryCode,
    ) || null
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveCurriculumRequest;
    const programId = String(body.programId || "").trim();
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    if (Array.isArray(body.categoryCredits) && body.categoryCredits.length > 0) {
      const mcRow = getCategoryRow(body.categoryCredits, "MC");
      const mcDesignPercent = getCategoryDesignPercent(body.categoryCredits, "MC");
      if (Math.abs(mcDesignPercent) > 0.01) {
        return NextResponse.json(
          { error: "Audit / Mandatory Courses (MC) Design % must be exactly 0." },
          { status: 400 },
        );
      }

      if (mcRow) {
        const mcFields = [
          "courses_t",
          "courses_p",
          "courses_tu",
          "courses_ll",
          "hours_ci",
          "hours_t",
          "hours_li",
          "hours_twd",
          "hours_total",
          "credit",
        ];
        const invalidField = mcFields.find(
          (field) => Math.abs(Number(mcRow?.[field] || 0)) > 0.01,
        );
        if (invalidField) {
          return NextResponse.json(
            {
              error:
                "Audit / Mandatory Courses (MC) must remain 0 in design section fields.",
            },
            { status: 400 },
          );
        }
      }

      const total = getDesignPercentTotal(body.categoryCredits);
      if (Math.abs(total - 100) > 0.01) {
        return NextResponse.json(
          {
            error: `Design percentage total must be exactly 100. Current total is ${total.toFixed(2)}.`,
          },
          { status: 400 },
        );
      }
    }

    const supabase = await createClient();
    const warnings: string[] = [];

    if (Array.isArray(body.categoryCredits) && body.categoryCredits.length > 0) {
      const payload = body.categoryCredits.map((item) => ({
        ...item,
        program_id: programId,
      }));
      const { error } = await supabase.from("curriculum_category_credits").upsert(payload, {
        onConflict: "program_id, category_code",
      });
      if (error) throw error;
    }

    if (body.electivesSettings && typeof body.electivesSettings === "object") {
      const payload = {
        ...body.electivesSettings,
        program_id: programId,
      };
      const { error } = await supabase
        .from("curriculum_electives_settings")
        .upsert(payload, { onConflict: "program_id" });
      if (error) throw error;
    }

    if (Array.isArray(body.semesterCategories) && body.semesterCategories.length > 0) {
      const payload = body.semesterCategories.map((item) => ({
        ...item,
        program_id: programId,
      }));
      const { error } = await supabase.from("curriculum_semester_categories").upsert(payload, {
        onConflict: "program_id, semester",
      });
      if (error) throw error;
    }

    if (body.curriculum) {
      const rows = body.curriculum.semesters.flatMap((semester) =>
        semester.courses.map((course) => ({
          program_id: programId,
          semester: semester.semester,
          category_code: course.category,
          course_code: course.courseCode,
          course_title: course.courseTitle,
          credits: course.credits,
          t_hours: course.tHours,
          tu_hours: course.tuHours,
          ll_hours: course.llHours,
          tw_hours: course.twHours,
          total_hours: course.totalHours,
          curriculum_mode: body.curriculum?.mode || "AICTE_MODEL",
          generated_at: body.curriculum?.generatedAt || new Date().toISOString(),
        })),
      );

      if (rows.length > 0) {
        await supabase
          .from("curriculum_generated_courses")
          .delete()
          .eq("program_id", programId);

        const { error } = await supabase
          .from("curriculum_generated_courses")
          .insert(rows);

        if (error) {
          if ((error as any)?.code === "42P01") {
            warnings.push(
              "Generated course table not found (curriculum_generated_courses). Structure saved without generated rows.",
            );
          } else {
            throw error;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      warnings,
    });
  } catch (error: any) {
    console.error("Curriculum save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save curriculum" },
      { status: 500 },
    );
  }
}
