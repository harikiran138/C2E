import { NextResponse } from "next/server";
import { applyGeminiCourseTitles } from "@/lib/curriculum/ai";
import {
  buildCurriculum,
  CategoryCode,
  SemesterCategoryCountInput,
} from "@/lib/curriculum/engine";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import {
  resolveProgramAcademicContext,
  validateAcademicFlowReadiness,
} from "@/lib/curriculum/program-context";

interface GenerateCurriculumRequest {
  programId?: string;
  programName?: string;
  totalCredits?: number;
  semesterCount?: number;
  enableAiTitles?: boolean;
  strictAcademicFlow?: boolean;
  categoryPercentages?: Partial<Record<CategoryCode, number>>;
  semesterCategoryCounts?: SemesterCategoryCountInput[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateCurriculumRequest;
    const programId = String(body.programId || "").trim();
    if (!programId) {
      return NextResponse.json(
        { errors: ["programId is required."] },
        { status: 400 },
      );
    }

    const contextResult = await resolveProgramAcademicContext(programId);
    const warnings: string[] = [...contextResult.warnings];

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
    });
    warnings.push(...readiness.warnings);
    if (readiness.errors.length > 0) {
      return NextResponse.json(
        {
          errors: readiness.errors,
          warnings,
          programContext: {
            programId: contextResult.context.programId,
            programName: contextResult.context.displayName,
            peoCount: contextResult.context.peoCount,
            poCount: contextResult.context.poCount,
            psoCount: contextResult.context.psoCount,
          },
        },
        { status: 400 },
      );
    }

    const totalCredits = Number(body.totalCredits || 0);

    const result = buildCurriculum({
      programName: contextResult.context.displayName,
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
          warnings: [...warnings, ...result.warnings],
        },
        { status: 400 },
      );
    }

    let curriculum = result.curriculum;
    warnings.push(...result.warnings);

    if (body.enableAiTitles !== false) {
      const aiResult = await applyGeminiCourseTitles(curriculum);
      curriculum = aiResult.curriculum;
      warnings.push(...aiResult.warnings);
    }

    const validation = new CurriculumValidator(curriculum).validate();
    warnings.push(...validation.warnings);

    if (!validation.passed) {
      return NextResponse.json(
        {
          errors: validation.errors,
          warnings,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      curriculum,
      programContext: {
        programId: contextResult.context.programId,
        programName: contextResult.context.displayName,
        peoCount: contextResult.context.peoCount,
        poCount: contextResult.context.poCount,
        psoCount: contextResult.context.psoCount,
      },
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
