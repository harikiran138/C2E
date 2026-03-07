import { NextResponse } from "next/server";
import { applyGeminiCourseTitles } from "@/lib/curriculum/ai";
import {
  buildCurriculum,
  buildFallbackTitle,
  CategoryCode,
  GeneratedCurriculum,
  normalizeCourseTitle,
  SemesterCategoryCountInput,
  validateSemesterRegenerationRules,
} from "@/lib/curriculum/engine";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import {
  resolveProgramAcademicContext,
  validateAcademicFlowReadiness,
} from "@/lib/curriculum/program-context";
import { OBEValidator } from "@/lib/curriculum/obe-validator";
import { CurriculumRepairEngine } from "@/lib/curriculum/repair-engine";

interface RegenerateSemesterRequest {
  semester?: number;
  curriculum?: GeneratedCurriculum;
  enableAiTitles?: boolean;
  programId?: string;
  programName?: string;
  strictAcademicFlow?: boolean;
  totalCredits?: number;
  semesterCount?: number;
  categoryPercentages?: Partial<Record<CategoryCode, number>>;
  semesterCategoryCounts?: SemesterCategoryCountInput[];
}

function cloneCurriculum(curriculum: GeneratedCurriculum): GeneratedCurriculum {
  return {
    ...curriculum,
    categorySummary: curriculum.categorySummary.map((summary) => ({ ...summary })),
    semesters: curriculum.semesters.map((semester) => ({
      ...semester,
      categoryCourseCounts: { ...semester.categoryCourseCounts },
      courses: semester.courses.map((course) => ({ ...course })),
    })),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegenerateSemesterRequest;
    const semester = Math.floor(Number(body.semester || 0));
    if (!Number.isFinite(semester) || semester < 1) {
      return NextResponse.json(
        { error: "semester must be a positive integer." },
        { status: 400 },
      );
    }

    let curriculum: GeneratedCurriculum | null = null;
    const warnings: string[] = [];

    if (body.curriculum) {
      curriculum = cloneCurriculum(body.curriculum);
      if (!String(curriculum.programName || "").trim()) {
        return NextResponse.json(
          { error: "Existing curriculum is missing programName." },
          { status: 400 },
        );
      }
    } else {
      const programId = String(body.programId || "").trim();
      if (!programId) {
        return NextResponse.json(
          { error: "programId is required when curriculum payload is not provided." },
          { status: 400 },
        );
      }

      const contextResult = await resolveProgramAcademicContext(programId);
      warnings.push(...contextResult.warnings);
      if (!contextResult.context || contextResult.errors.length > 0) {
        return NextResponse.json(
          {
            errors: contextResult.errors.length
              ? contextResult.errors
              : ["Failed to resolve program context."],
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
              errors: obeValidation.errors,
              warnings,
            },
            { status: 400 },
          );
        } else {
          warnings.push(...obeValidation.errors);
        }
      }

      const requestedTotalCredits = Number(body.totalCredits || 160);
      if (requestedTotalCredits !== 160) {
        warnings.push(
          `Total credits normalized to 160 for semester regeneration (requested ${requestedTotalCredits}).`,
        );
      }

      const result = buildCurriculum({
        programName: contextResult.context.displayName,
        totalCredits: 160,
        mode: "AICTE_MODEL",
        semesterCount: Number(body.semesterCount || 0) || undefined,
        categoryPercentages: body.categoryPercentages || {},
        semesterCategoryCounts: body.semesterCategoryCounts || [],
      });

      if (!result.curriculum || result.errors.length > 0) {
        return NextResponse.json(
          {
            errors: result.errors,
            warnings: result.warnings,
          },
          { status: 400 },
        );
      }

      curriculum = result.curriculum;
      warnings.push(...result.warnings);
    }

    curriculum.mode = "AICTE_MODEL";

    const targetSemester = curriculum.semesters.find((item) => item.semester === semester);
    if (!targetSemester) {
      return NextResponse.json(
        { error: `Semester ${semester} not found in curriculum.` },
        { status: 404 },
      );
    }

    const usedTitles = new Set<string>();
    for (const sem of curriculum.semesters) {
      if (sem.semester === semester) continue;
      for (const course of sem.courses) {
        usedTitles.add(normalizeCourseTitle(course.courseTitle));
      }
    }

    for (const course of targetSemester.courses) {
      course.courseTitle = buildFallbackTitle({
        programName: curriculum.programName,
        mode: curriculum.mode,
        category: course.category,
        semester,
        usedTitles,
      });
    }

    warnings.push(
      ...validateSemesterRegenerationRules(
        semester,
        targetSemester.categoryCourseCounts,
        curriculum.semesters.length,
      ),
    );

    curriculum.generatedAt = new Date().toISOString();

    if (body.enableAiTitles !== false) {
      const aiResult = await applyGeminiCourseTitles(curriculum, {
        targetSemester: semester,
      });
      curriculum = aiResult.curriculum;
      warnings.push(...aiResult.warnings);
    }

    let repairActions: Array<{ step: string; detail: string }> = [];
    let validation = new CurriculumValidator(curriculum).validate();
    warnings.push(...validation.warnings);
    if (!validation.passed) {
      const repaired = CurriculumRepairEngine.repair(curriculum);
      repairActions = repaired.actions;
      warnings.push(...repaired.warnings);
      curriculum = repaired.curriculum;

      validation = new CurriculumValidator(curriculum).validate();
      warnings.push(...validation.warnings);

      if (!validation.passed) {
        return NextResponse.json(
          {
            errors: validation.errors,
            warnings,
            repairActions,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      curriculum,
      repairActions,
      warnings,
    });
  } catch (error: any) {
    console.error("Regenerate semester error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
