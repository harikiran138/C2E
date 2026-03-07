import { AgentRunResult } from "@/lib/agents/types";
import {
  buildCurriculum,
  CategoryCode,
  SemesterCategoryCountInput,
  GeneratedCurriculum,
} from "@/lib/curriculum/engine";
import { applyGeminiCourseTitles } from "@/lib/curriculum/ai";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import { CurriculumRepairEngine } from "@/lib/curriculum/repair-engine";

export interface CourseGeneratorInput {
  programName: string;
  totalCredits: number;
  semesterCount?: number;
  categoryPercentages?: Partial<Record<CategoryCode, number>>;
  semesterCategoryCounts?: SemesterCategoryCountInput[];
  enableAITitles?: boolean;
}

export interface CourseGeneratorOutput {
  curriculum: GeneratedCurriculum | null;
}

export async function runCourseGeneratorAgent(
  input: CourseGeneratorInput,
): Promise<AgentRunResult<CourseGeneratorOutput>> {
  const built = buildCurriculum({
    programName: input.programName,
    totalCredits: input.totalCredits,
    semesterCount: input.semesterCount,
    categoryPercentages: input.categoryPercentages || {},
    semesterCategoryCounts: input.semesterCategoryCounts || [],
    mode: "AICTE_MODEL",
  });

  if (!built.curriculum || built.errors.length > 0) {
    return {
      data: { curriculum: null },
      warnings: built.warnings,
      errors: built.errors.length > 0 ? built.errors : ["Curriculum generation failed."],
    };
  }

  let curriculum = built.curriculum;
  const warnings = [...built.warnings];

  if (input.enableAITitles !== false) {
    const aiResult = await applyGeminiCourseTitles(curriculum);
    curriculum = aiResult.curriculum;
    warnings.push(...aiResult.warnings);
  }

  let validation = new CurriculumValidator(curriculum).validate();
  warnings.push(...validation.warnings);
  if (!validation.passed) {
    const repaired = CurriculumRepairEngine.repair(curriculum);
    curriculum = repaired.curriculum;
    warnings.push(...repaired.warnings);
    warnings.push(
      ...repaired.actions.map(
        (action) => `CurriculumRepairEngine (${action.step}): ${action.detail}`,
      ),
    );
    validation = new CurriculumValidator(curriculum).validate();
    warnings.push(...validation.warnings);
  }

  if (!validation.passed) {
    return {
      data: { curriculum: null },
      warnings,
      errors: validation.errors,
    };
  }

  return {
    data: { curriculum },
    warnings,
    errors: [],
  };
}
