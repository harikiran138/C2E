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

interface RegenerateSemesterRequest {
  semester?: number;
  curriculum?: GeneratedCurriculum;
  enableAiTitles?: boolean;
  programName?: string;
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
    } else {
      const result = buildCurriculum({
        programName: String(body.programName || ""),
        totalCredits: Number(body.totalCredits || 0),
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

    return NextResponse.json({
      curriculum,
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
