import { NextResponse } from "next/server";
import { applyGeminiCourseTitles } from "@/lib/curriculum/ai";
import {
  buildCurriculum,
  CategoryCode,
  SemesterCategoryCountInput,
} from "@/lib/curriculum/engine";
import { CurriculumValidator, type ValidationResult } from "@/lib/curriculum/validator";
import { CurriculumRepairEngine } from "@/lib/curriculum/repair-engine";
import { OBEValidator } from "@/lib/curriculum/obe-validator";
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
      minPsos: 0,
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

    const obeValidation = new OBEValidator(contextResult.context).validate();
    warnings.push(...obeValidation.warnings);
    if (obeValidation.blocked) {
      if (body.strictAcademicFlow !== false) {
        return NextResponse.json(
          {
            errors: obeValidation.errors,
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
      } else {
        warnings.push(...obeValidation.errors);
      }
    }

    const requestedTotalCredits = Number(body.totalCredits || 160);
    const totalCredits = 160;
    if (requestedTotalCredits !== totalCredits) {
      warnings.push(
        `Total credits normalized to ${totalCredits} (requested ${requestedTotalCredits}).`,
      );
    }

    const result = buildCurriculum({
      programName: contextResult.context.displayName,
      totalCredits,
      semesterCount: Number(body.semesterCount || 0) || undefined,
      categoryPercentages: body.categoryPercentages || {},
      semesterCategoryCounts: body.semesterCategoryCounts || [],
      mode: "AICTE_MODEL",
    });

    console.log(`Curriculum Build: programName="${contextResult.context.displayName}", count=${result.curriculum?.semesters.length}, enableAiTitles=${body.enableAiTitles}`);

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
      console.log("Curriculum AI: enableAiTitles is true, calling Gemini...");
      const aiResult = await applyGeminiCourseTitles(curriculum);
      console.log(`Curriculum AI: complete. Warnings: ${aiResult.warnings.length}`);
      warnings.push(...aiResult.warnings);
      curriculum = aiResult.curriculum;
    } else {
      console.log("Curriculum AI: enableAiTitles is false, skipping Gemini.");
    }

    let repairActions: Array<{ step: string; detail: string }> = [];
    const isStrict = body.strictAcademicFlow !== false;
    let validation: ValidationResult = new CurriculumValidator(curriculum, isStrict).validate();
    warnings.push(...validation.warnings);

    if (!validation.passed) {
      const repaired = CurriculumRepairEngine.repair(curriculum);
      repairActions = repaired.actions;
      warnings.push(...repaired.warnings);
      curriculum = repaired.curriculum;

      validation = new CurriculumValidator(curriculum, isStrict).validate();
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
      programContext: {
        programId: contextResult.context.programId,
        programName: contextResult.context.displayName,
        peoCount: contextResult.context.peoCount,
        poCount: contextResult.context.poCount,
        psoCount: contextResult.context.psoCount,
      },
      repairActions,
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
