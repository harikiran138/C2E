import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GeneratedCurriculum } from "@/lib/curriculum/engine";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import { CurriculumRepairEngine } from "@/lib/curriculum/repair-engine";
import { OBEValidator } from "@/lib/curriculum/obe-validator";
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

interface CurriculumVersionRow {
  id: string;
  program_id: string;
  year: number;
  version: string;
}

const GENERATED_COURSE_OPTIONAL_COLUMNS = [
  "curriculum_id",
  "version_id",
  "curriculum_mode",
  "generated_at",
  "updated_at",
] as const;

function isSchemaColumnError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return (
    String(error?.code || "") === "42703" ||
    message.includes("schema cache") ||
    message.includes("column")
  );
}

function inferMissingGeneratedCourseColumns(error: any): string[] {
  const message = String(error?.message || "").toLowerCase();
  return GENERATED_COURSE_OPTIONAL_COLUMNS.filter((column) =>
    message.includes(`'${column}'`) ||
    message.includes(`"${column}"`) ||
    message.includes(`${column} column`) ||
    message.includes(`${column} does not exist`),
  );
}

function omitColumnsFromRows<T extends Record<string, any>>(
  rows: T[],
  columns: string[],
): T[] {
  if (!columns.length) return rows;
  return rows.map((row) => {
    const clone = { ...row };
    for (const column of columns) {
      delete clone[column];
    }
    return clone;
  });
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
    const repairActions: Array<{ step: string; detail: string }> = [];

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
      minPsos: 0,
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

    const obeValidation = new OBEValidator(contextResult.context).validate();
    warnings.push(...obeValidation.warnings);
    if (obeValidation.blocked) {
      if (body.strictAcademicFlow !== false) {
        return NextResponse.json(
          {
            error: obeValidation.errors[0],
            errors: obeValidation.errors,
            warnings,
          },
          { status: 400 },
        );
      } else {
        warnings.push(...obeValidation.errors);
      }
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

    let versionRow: CurriculumVersionRow | null = null;

    if (versionId) {
      const { data, error: versionError } = await supabase
        .from("curriculum_versions")
        .select("id, program_id, year, version")
        .eq("id", versionId)
        .single();

      versionRow = (data ?? null) as CurriculumVersionRow | null;

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
      const providedCredits = Number(body.curriculum?.totalCredits || 0);
      const totalCredits = body.curriculum
        ? 160
        : Number.isFinite(providedCredits) && providedCredits > 0
          ? providedCredits
          : null;
      if (body.curriculum && providedCredits !== 160) {
        warnings.push(
          `Persisted curriculum credits were normalized to 160 (received ${providedCredits || 0}).`,
        );
      }

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
      let curriculumToSave = body.curriculum;
      let validation = new CurriculumValidator(curriculumToSave).validate();
      warnings.push(...validation.warnings);

      if (!validation.passed) {
        const repaired = CurriculumRepairEngine.repair(curriculumToSave);
        repairActions.push(...repaired.actions);
        warnings.push(...repaired.warnings);
        curriculumToSave = repaired.curriculum;
        validation = new CurriculumValidator(curriculumToSave).validate();
        warnings.push(...validation.warnings);
      }

      if (!validation.passed) {
        return NextResponse.json(
          {
            error: validation.errors[0] || "Curriculum validation failed.",
            errors: validation.errors,
            warnings,
            repairActions,
          },
          { status: 400 },
        );
      }

      if (
        normalizeLabel(curriculumToSave.programName) !==
        normalizeLabel(contextResult.context.displayName)
      ) {
        warnings.push(
          `Curriculum program name "${curriculumToSave.programName}" did not match authoritative program name "${contextResult.context.displayName}".`,
        );
      }

      const rows = curriculumToSave.semesters.flatMap((semester) =>
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
          total_hours: course.learningHours || course.totalHours,
          curriculum_mode: curriculumToSave.mode || "AICTE_MODEL",
          generated_at: curriculumToSave.generatedAt || new Date().toISOString(),
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
        if (deleteError) {
          if ((deleteError as any)?.code === "42P01") {
            warnings.push(
              "Generated course table not found (curriculum_generated_courses). Structure saved without generated rows.",
            );
            return NextResponse.json({
              success: true,
              warnings,
            });
          }

          if (isSchemaColumnError(deleteError)) {
            warnings.push(
              "Generated course table is on a legacy schema. Falling back to program-level replace.",
            );
            const { error: legacyDeleteError } = await supabase
              .from("curriculum_generated_courses")
              .delete()
              .eq("program_id", programId);
            if (legacyDeleteError && (legacyDeleteError as any)?.code !== "42P01") {
              throw legacyDeleteError;
            }
          } else {
            throw deleteError;
          }
        }

        let insertRows = [...rows];
        let { error } = await supabase
          .from("curriculum_generated_courses")
          .insert(insertRows);

        if (error) {
          if (isSchemaColumnError(error)) {
            const missingColumns = inferMissingGeneratedCourseColumns(error);
            if (missingColumns.length > 0) {
              warnings.push(
                `Generated course table is missing column(s): ${missingColumns.join(", ")}. Retrying with legacy payload.`,
              );
              insertRows = omitColumnsFromRows(rows, missingColumns);
              const retry = await supabase
                .from("curriculum_generated_courses")
                .insert(insertRows);
              error = retry.error;
            }
          }

          if (!error) {
            // retry succeeded
          } else if ((error as any)?.code === "42P01") {
            warnings.push(
              "Generated course table not found (curriculum_generated_courses). Structure saved without generated rows.",
            );
          } else if (isSchemaColumnError(error)) {
            warnings.push(
              "Generated course rows could not be saved due to schema mismatch in curriculum_generated_courses.",
            );
          } else {
            throw error;
          }
        }

      }
    }

    return NextResponse.json({
      success: true,
      repairActions,
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
