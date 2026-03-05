import { NextResponse } from "next/server";
import { applyGeminiCourseTitles } from "@/lib/curriculum/ai";
import {
  buildCurriculum,
  CategoryCode,
  SemesterCategoryCountInput,
} from "@/lib/curriculum/engine";

interface GenerateCurriculumRequest {
  programName?: string;
  totalCredits?: number;
  semesterCount?: number;
  enableAiTitles?: boolean;
  categoryPercentages?: Partial<Record<CategoryCode, number>>;
  semesterCategoryCounts?: SemesterCategoryCountInput[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateCurriculumRequest;
    const programName = String(body.programName || "").trim();
    const totalCredits = Number(body.totalCredits || 0);

    const result = buildCurriculum({
      programName,
      totalCredits,
      semesterCount: Number(body.semesterCount || 0) || undefined,
      categoryPercentages: body.categoryPercentages || {},
      semesterCategoryCounts: body.semesterCategoryCounts || [],
      mode: "AICTE_MODEL",
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

    let curriculum = result.curriculum;
    const warnings = [...result.warnings];

    if (body.enableAiTitles !== false) {
      const aiResult = await applyGeminiCourseTitles(curriculum);
      curriculum = aiResult.curriculum;
      warnings.push(...aiResult.warnings);
    }

    return NextResponse.json({
      curriculum,
      warnings,
    });
  } catch (error: any) {
    console.error("Generate curriculum error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
