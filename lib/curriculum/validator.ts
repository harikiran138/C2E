import type {
  CategoryCode,
  GeneratedCurriculum,
  GeneratedSemester,
  GeneratedCourse,
  CategorySummary,
} from "@/lib/curriculum/engine";

// Re-export engine types so consumers can import from this module if needed
export type { CategoryCode, GeneratedCurriculum, GeneratedSemester, GeneratedCourse, CategorySummary };

// AICTE percentage ranges per category (min%, max%)
const AICTE_RANGES: Readonly<Record<string, { min: number; max: number }>> = {
  BS:  { min: 20, max: 25 },
  ES:  { min: 15, max: 20 },
  HSS: { min: 10, max: 15 },
  PC:  { min: 25, max: 30 },
  PE:  { min: 10, max: 15 },
  OE:  { min: 10, max: 15 },
  AE:  { min:  5, max:  6 },
  SE:  { min:  5, max:  6 },
  PR:  { min:  8, max: 10 },
} as const;

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export class CurriculumValidator {
  private readonly curriculum: GeneratedCurriculum;

  constructor(curriculum: GeneratedCurriculum) {
    this.curriculum = curriculum;
  }

  /**
   * Validates that the sum of all course credits matches curriculum.totalCredits
   * within a 5% tolerance. Returns error strings if the discrepancy is too large.
   */
  validateCredits(): string[] {
    const errors: string[] = [];
    const { totalCredits, semesters } = this.curriculum;

    const actualTotal = semesters.reduce(
      (semSum, semester) =>
        semSum + semester.courses.reduce((cSum, course) => cSum + course.credits, 0),
      0,
    );

    if (totalCredits > 0) {
      const discrepancyPercent = Math.abs(actualTotal - totalCredits) / totalCredits;
      if (discrepancyPercent > 0.05) {
        errors.push(
          `Credit mismatch: curriculum declares ${totalCredits} total credits but actual course sum is ${actualTotal} ` +
            `(${(discrepancyPercent * 100).toFixed(1)}% deviation, threshold 5%).`,
        );
      }
    } else {
      errors.push("Curriculum totalCredits is 0 or invalid; cannot validate credit totals.");
    }

    return errors;
  }

  /**
   * Soft check: for each category with an AICTE range, if the actual percentage
   * falls outside [min, max] return a warning (not an error).
   */
  validateCategoryRanges(): string[] {
    const warnings: string[] = [];
    const { totalCredits, categorySummary } = this.curriculum;

    if (totalCredits <= 0) return warnings;

    for (const summary of categorySummary) {
      const range = AICTE_RANGES[summary.categoryCode];
      if (!range) continue;

      const actualPercent = (summary.credits / totalCredits) * 100;

      if (actualPercent < range.min) {
        warnings.push(
          `Category ${summary.categoryCode} is at ${actualPercent.toFixed(1)}% which is below the AICTE ` +
            `recommended minimum of ${range.min}%.`,
        );
      } else if (actualPercent > range.max) {
        warnings.push(
          `Category ${summary.categoryCode} is at ${actualPercent.toFixed(1)}% which is above the AICTE ` +
            `recommended maximum of ${range.max}%.`,
        );
      }
    }

    return warnings;
  }

  /**
   * Hard check: if any category exceeds its AICTE max by more than 5% (relative),
   * it is a hard error indicating a design violation.
   */
  validateAICTERanges(): string[] {
    const errors: string[] = [];
    const { totalCredits, categorySummary } = this.curriculum;

    if (totalCredits <= 0) return errors;

    for (const summary of categorySummary) {
      const range = AICTE_RANGES[summary.categoryCode];
      if (!range) continue;

      const actualPercent = (summary.credits / totalCredits) * 100;
      const allowedMax = range.max * 1.05; // 5% above the stated maximum

      if (actualPercent > allowedMax) {
        errors.push(
          `Category ${summary.categoryCode} exceeds AICTE maximum by more than 5%: ` +
            `actual ${actualPercent.toFixed(1)}% vs allowed ceiling ${allowedMax.toFixed(1)}% ` +
            `(AICTE max ${range.max}% + 5% tolerance).`,
        );
      }
    }

    return errors;
  }

  /**
   * Validates NEP structural requirements:
   * - Semesters 1-2 must contain at least one BS, ES, or HSS course.
   * - Internship/project (PR) must first appear in semester >= 4.
   * - The final semester must contain at least one PR course.
   */
  validateNEPStructure(): string[] {
    const errors: string[] = [];
    const { semesters } = this.curriculum;

    if (semesters.length === 0) {
      errors.push("No semesters found in curriculum; cannot validate NEP structure.");
      return errors;
    }

    // Check semesters 1 and 2 have foundation categories
    const foundationCategories: CategoryCode[] = ["BS", "ES", "HSS"];
    const earlySemesters = semesters.filter((s) => s.semester <= 2);

    for (const semester of earlySemesters) {
      const hasFoundation = semester.courses.some((course) =>
        foundationCategories.includes(course.category),
      );
      if (!hasFoundation) {
        errors.push(
          `Semester ${semester.semester} has no BS, ES, or HSS courses. ` +
            "NEP requires foundation courses in semesters 1-2.",
        );
      }
    }

    // Check internship (PR) does not appear before semester 4
    const prBeforeSem4 = semesters.filter(
      (s) => s.semester < 4 && s.courses.some((course) => course.category === "PR"),
    );
    for (const semester of prBeforeSem4) {
      errors.push(
        `Internship/Project (PR) courses found in semester ${semester.semester}. ` +
          "NEP requires PR to appear in semester 4 or later.",
      );
    }

    // Check final semester has at least one PR course
    const finalSemesterNumber = Math.max(...semesters.map((s) => s.semester));
    const finalSemester = semesters.find((s) => s.semester === finalSemesterNumber);
    if (finalSemester) {
      const hasPR = finalSemester.courses.some((course) => course.category === "PR");
      if (!hasPR) {
        errors.push(
          `Final semester (${finalSemesterNumber}) has no PR course. ` +
            "NEP requires a capstone/project course in the final semester.",
        );
      }
    }

    return errors;
  }

  /**
   * Validates that at least one PR course is placed in semester >= 4,
   * representing the internship requirement.
   */
  validateInternship(): string[] {
    const errors: string[] = [];
    const { semesters } = this.curriculum;

    const hasPRInSem4OrLater = semesters.some(
      (s) => s.semester >= 4 && s.courses.some((course) => course.category === "PR"),
    );

    if (!hasPRInSem4OrLater) {
      errors.push(
        "No PR (Project/Internship) course found in semester 4 or later. " +
          "At least one internship or project must be scheduled from semester 4 onwards.",
      );
    }

    return errors;
  }

  /**
   * Validates that the final semester contains at least one PR course,
   * satisfying the capstone requirement.
   */
  validateCapstone(): string[] {
    const errors: string[] = [];
    const { semesters } = this.curriculum;

    if (semesters.length === 0) {
      errors.push("No semesters found; cannot validate capstone requirement.");
      return errors;
    }

    const finalSemesterNumber = Math.max(...semesters.map((s) => s.semester));
    const finalSemester = semesters.find((s) => s.semester === finalSemesterNumber);

    if (!finalSemester) {
      errors.push(`Could not locate final semester (${finalSemesterNumber}) in curriculum data.`);
      return errors;
    }

    const hasCapstone = finalSemester.courses.some((course) => course.category === "PR");
    if (!hasCapstone) {
      errors.push(
        `Final semester (${finalSemesterNumber}) has no capstone/project (PR) course. ` +
          "A capstone course is required in the last semester.",
      );
    }

    return errors;
  }

  /**
   * Runs all validation checks and computes an overall score.
   * Score = 100 - (10 * errorCount) - (5 * warningCount), floored at 0.
   */
  validate(): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Hard error checks
    allErrors.push(...this.validateCredits());
    allErrors.push(...this.validateAICTERanges());
    allErrors.push(...this.validateNEPStructure());
    allErrors.push(...this.validateInternship());
    allErrors.push(...this.validateCapstone());

    // Soft warning checks
    allWarnings.push(...this.validateCategoryRanges());

    const rawScore = 100 - allErrors.length * 10 - allWarnings.length * 5;
    const score = Math.max(0, rawScore);
    const passed = allErrors.length === 0;

    return {
      passed,
      errors: allErrors,
      warnings: allWarnings,
      score,
    };
  }
}
