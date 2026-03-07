import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GeneratedCurriculum } from "@/lib/curriculum/engine";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import {
  resolveProgramAcademicContext,
  validateAcademicFlowReadiness,
} from "@/lib/curriculum/program-context";

interface SaveCurriculumRequest {
  programId?: string;
  versionId?: string;
  curriculumId?: string;
  strictAcademicFlow?: boolean;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveCurriculumRequest;
    const programId = String(body.programId || "").trim();
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    const versionId = String(body.versionId || "").trim() || null;
    let curriculumId = String(body.curriculumId || "").trim() || null;

    const contextResult = await resolveProgramAcademicContext(programId);
    const warnings: string[] = [...contextResult.warnings];
    if (!contextResult.context || contextResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: contextResult.errors[0] || "Failed to resolve program context.",
          warnings,
        },
        { status: 400 },
      );
    }

    const readiness = validateAcademicFlowReadiness(contextResult.context, {
      strict: body.strictAcademicFlow !== false,
    });
    warnings.push(...readiness.warnings);
    if (readiness.errors.length > 0) {
      return NextResponse.json(
        {
          error: readiness.errors[0],
          errors: readiness.errors,
          warnings,
        },
        { status: 400 },
      );
    }

    if (Array.isArray(body.categoryCredits) && body.categoryCredits.length > 0) {
      const mcDesignPercent = getCategoryDesignPercent(body.categoryCredits, "MC");
      if (Math.abs(mcDesignPercent) > 0.01) {
        return NextResponse.json(
          { error: "Audit / Mandatory Courses (MC) Design % must be exactly 0." },
          { status: 400 },
        );
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

    let versionRow:
      | {
          id: string;
          program_id: string;
          year: number;
          version: string;
        }
      | null = null;

    if (versionId) {
      const { data, error: versionError } = await supabase
        .from("curriculum_versions")
        .select("id, program_id, year, version")
        .eq("id", versionId)
        .single();

      versionRow = data as typeof versionRow;

      if (versionError || !versionRow) {
        return NextResponse.json(
          { error: "Invalid versionId: curriculum version not found." },
          { status: 400 },
        );
      }

      if (String(versionRow.program_id) !== programId) {
        return NextResponse.json(
          { error: "Invalid versionId: version does not belong to the selected program." },
          { status: 400 },
        );
      }
    }

    if (curriculumId) {
      const { data: curriculumRow, error: curriculumError } = await supabase
        .from("curriculums")
        .select("id, program_id")
        .eq("id", curriculumId)
        .single();

      if (curriculumError || !curriculumRow) {
        return NextResponse.json(
          { error: "Invalid curriculumId: curriculum not found." },
          { status: 400 },
        );
      }

      if (String((curriculumRow as any).program_id) !== programId) {
        return NextResponse.json(
          { error: "Invalid curriculumId: curriculum does not belong to the selected program." },
          { status: 400 },
        );
      }
    } else {
      const regulationYear = Number(versionRow?.year) || new Date().getUTCFullYear();
      const versionLabel =
        String(versionRow?.version || "").trim() ||
        String(body.curriculum?.mode || "Working Draft").trim();
      const totalCredits = Number(body.curriculum?.totalCredits || 0) || null;

      try {
        const { data: ensuredCurriculum, error: ensuredError } = await supabase
          .from("curriculums")
          .upsert(
            {
              program_id: programId,
              regulation_year: regulationYear,
              version: versionLabel,
              total_credits: totalCredits,
            },
            {
              onConflict: "program_id, regulation_year, version",
            },
          )
          .select("id")
          .single();

        if (!ensuredError && ensuredCurriculum?.id) {
          curriculumId = String(ensuredCurriculum.id);
        } else if (ensuredError) {
          warnings.push(
            "curriculums table is unavailable or not fully migrated; curriculum_id linkage was skipped.",
          );
        }
      } catch {
        warnings.push(
          "curriculums table is unavailable or not fully migrated; curriculum_id linkage was skipped.",
        );
      }
    }

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
      const validator = new CurriculumValidator(body.curriculum);
      const validation = validator.validate();
      warnings.push(...validation.warnings);
      if (!validation.passed) {
        return NextResponse.json(
          {
            error: validation.errors[0] || "Curriculum validation failed.",
            errors: validation.errors,
            warnings,
          },
          { status: 400 },
        );
      }

      if (
        normalizeLabel(body.curriculum.programName) !==
        normalizeLabel(contextResult.context.displayName)
      ) {
        warnings.push(
          `Curriculum program name "${body.curriculum.programName}" did not match authoritative program name "${contextResult.context.displayName}".`,
        );
      }

      const rows = body.curriculum.semesters.flatMap((semester) =>
        semester.courses.map((course) => ({
          program_id: programId,
          curriculum_id: curriculumId,
          version_id: versionId,
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
          updated_at: new Date().toISOString(),
        })),
      );

      if (rows.length > 0) {
        let deleteQuery = supabase
          .from("curriculum_generated_courses")
          .delete()
          .eq("program_id", programId);

        if (curriculumId) {
          deleteQuery = deleteQuery.eq("curriculum_id", curriculumId);
        } else if (versionId) {
          deleteQuery = deleteQuery.eq("version_id", versionId);
        } else {
          deleteQuery = deleteQuery.is("version_id", null);
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError && (deleteError as any)?.code !== "42P01") {
          throw deleteError;
        }

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

function normalizeLabel(value: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
