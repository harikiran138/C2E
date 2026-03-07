import type {
  CategoryCode,
  GeneratedCurriculum,
  GeneratedSemester,
  GeneratedCourse,
  CategorySummary,
} from "@/lib/curriculum/engine";
import {
  FUNDAMENTAL_KEYWORDS,
  getDomainKnowledgeProfile,
  type ProgressionRule,
} from "@/lib/curriculum/domain-knowledge";

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

// AICTE / NEP absolute credit checks used as hard guardrails.
const CREDIT_RULES = {
  BS: { min: 20, max: 30 },
  ES: { min: 25, max: 35 },
  PC: { min: 50, max: 70 },
  ELECTIVES: { min: 15, max: 30 }, // PE + OE
  HSS_MIN: 8,
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

  private getCreditsByCategory(): Record<string, number> {
    return this.curriculum.semesters.reduce(
      (acc, semester) => {
        for (const course of semester.courses) {
          acc[course.category] = (acc[course.category] || 0) + (Number(course.credits) || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Hard checks for absolute AICTE/NEP credit constraints.
   */
  validateCreditDistributionRules(): string[] {
    const errors: string[] = [];
    const creditsByCategory = this.getCreditsByCategory();

    const bsCredits = creditsByCategory.BS || 0;
    const esCredits = creditsByCategory.ES || 0;
    const pcCredits = creditsByCategory.PC || 0;
    const hssCredits = creditsByCategory.HSS || 0;
    const electiveCredits = (creditsByCategory.PE || 0) + (creditsByCategory.OE || 0);
    const prCredits = creditsByCategory.PR || 0;

    if (bsCredits < CREDIT_RULES.BS.min || bsCredits > CREDIT_RULES.BS.max) {
      errors.push(
        `Basic Sciences credits (${bsCredits}) must be within ${CREDIT_RULES.BS.min}-${CREDIT_RULES.BS.max}.`,
      );
    }

    if (esCredits < CREDIT_RULES.ES.min || esCredits > CREDIT_RULES.ES.max) {
      errors.push(
        `Engineering Sciences credits (${esCredits}) must be within ${CREDIT_RULES.ES.min}-${CREDIT_RULES.ES.max}.`,
      );
    }

    if (pcCredits < CREDIT_RULES.PC.min || pcCredits > CREDIT_RULES.PC.max) {
      errors.push(
        `Professional Core credits (${pcCredits}) must be within ${CREDIT_RULES.PC.min}-${CREDIT_RULES.PC.max}.`,
      );
    }

    if (
      electiveCredits < CREDIT_RULES.ELECTIVES.min ||
      electiveCredits > CREDIT_RULES.ELECTIVES.max
    ) {
      errors.push(
        `Elective credits (PE + OE = ${electiveCredits}) must be within ${CREDIT_RULES.ELECTIVES.min}-${CREDIT_RULES.ELECTIVES.max}.`,
      );
    }

    if (hssCredits < CREDIT_RULES.HSS_MIN) {
      errors.push(
        `Humanities & Social Sciences credits (${hssCredits}) must be at least ${CREDIT_RULES.HSS_MIN}.`,
      );
    }

    if (prCredits <= 0) {
      errors.push("Internship/Project credits are mandatory; PR credits cannot be zero.");
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
   * Validates elective progression:
   * - PE/OE courses should appear only after semester 4.
   */
  validateElectiveProgression(): string[] {
    const errors: string[] = [];
    const { semesters } = this.curriculum;

    for (const semester of semesters) {
      if (semester.semester <= 4) {
        const earlyElectives = semester.courses.filter(
          (course) => course.category === "PE" || course.category === "OE",
        );
        if (earlyElectives.length > 0) {
          errors.push(
            `Semester ${semester.semester} contains PE/OE courses (${earlyElectives
              .map((c) => c.courseCode)
              .join(", ")}). Electives should start only after semester 4.`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * Soft check: recommends that OE and SE are distributed in a sustained way.
   */
  validateSkillAndMultidisciplinaryCoverage(): string[] {
    const warnings: string[] = [];
    const { semesters } = this.curriculum;

    const semestersWithOE = semesters.filter((s) =>
      s.courses.some((course) => course.category === "OE"),
    );
    if (semestersWithOE.length === 0) {
      warnings.push(
        "No OE (Open Elective) course found. NEP recommends multidisciplinary exposure via open electives.",
      );
    }

    const semestersWithSE = semesters.filter((s) =>
      s.courses.some((course) => course.category === "SE"),
    );
    if (semestersWithSE.length < 2) {
      warnings.push(
        `SE (Skill Enhancement) appears in ${semestersWithSE.length} semester(s). Recommended coverage is at least 2 semesters.`,
      );
    }

    return warnings;
  }

  /**
   * Soft check for internship/project progression:
   * - Mini internship/project around semester 4
   * - Industry internship around semester 6
   * - Capstone in final semester (hard-checked separately)
   */
  validateInternshipMilestones(): string[] {
    const warnings: string[] = [];
    const { semesters } = this.curriculum;
    const semesterCount = semesters.length;
    if (semesterCount === 0) return warnings;

    const hasPRNear = (targetSemester: number): boolean =>
      semesters.some(
        (semester) =>
          Math.abs(semester.semester - targetSemester) <= 1 &&
          semester.courses.some((course) => course.category === "PR"),
      );

    if (semesterCount >= 4 && !hasPRNear(4)) {
      warnings.push(
        "No PR milestone found around semester 4. Consider adding a mini internship/project.",
      );
    }

    if (semesterCount >= 6 && !hasPRNear(6)) {
      warnings.push(
        "No PR milestone found around semester 6. Consider adding an industry internship.",
      );
    }

    return warnings;
  }

  private normalizeTitle(value: string): string {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private keywordMatch(title: string, keywords: string[]): boolean {
    const normalizedTitle = this.normalizeTitle(title);
    return keywords.some((keyword) => normalizedTitle.includes(this.normalizeTitle(keyword)));
  }

  private findEarliestSemesterForKeywords(
    rule: ProgressionRule,
    type: "prerequisite" | "dependent",
  ): number | null {
    const keywords =
      type === "prerequisite" ? rule.prerequisiteKeywords : rule.dependentKeywords;
    let foundSemester: number | null = null;

    for (const semester of this.curriculum.semesters) {
      const hasMatch = semester.courses.some((course) =>
        this.keywordMatch(course.courseTitle, keywords),
      );
      if (!hasMatch) continue;
      foundSemester = foundSemester === null ? semester.semester : Math.min(foundSemester, semester.semester);
    }

    return foundSemester;
  }

  /**
   * Hard checks for layered curriculum integrity:
   * 1) Fundamental backbone presence
   * 2) Domain backbone presence
   * 3) Emerging technology integration in later semesters
   * 4) Prerequisite progression ordering
   * 5) Program-domain integrity (restricted topics)
   */
  validateLearningProgressionAndTechnologyAlignment(): string[] {
    const errors: string[] = [];
    const profile = getDomainKnowledgeProfile(this.curriculum.programName);
    const allCourses = this.curriculum.semesters.flatMap((semester) =>
      semester.courses.map((course) => ({
        ...course,
        semester: semester.semester,
      })),
    );

    if (allCourses.length === 0) {
      errors.push("No courses found to validate learning progression and technology alignment.");
      return errors;
    }

    // Layer 1: mandatory fundamentals must exist.
    for (const group of FUNDAMENTAL_KEYWORDS) {
      const hasGroup = allCourses.some((course) => this.keywordMatch(course.courseTitle, group));
      if (!hasGroup) {
        errors.push(
          `Fundamental backbone violation: at least one course matching [${group.join(", ")}] is required.`,
        );
      }
    }

    for (const semester of this.curriculum.semesters.filter((row) => row.semester <= 2)) {
      const hasFoundationTitle = semester.courses.some((course) =>
        FUNDAMENTAL_KEYWORDS.some((group) => this.keywordMatch(course.courseTitle, group)),
      );
      if (!hasFoundationTitle) {
        errors.push(
          `Semester ${semester.semester} is missing explicit foundational titles (Math/Science/Basic Engineering).`,
        );
      }
    }

    // Layer 2: discipline backbone courses.
    if (profile.requiredCoreKeywords.length > 0) {
      const missingCore = profile.requiredCoreKeywords.filter(
        (keyword) =>
          !allCourses.some((course) => this.keywordMatch(course.courseTitle, [keyword])),
      );
      if (missingCore.length > 0) {
        errors.push(
          `Core program backbone violation for ${profile.domain}: missing ${missingCore.join(", ")}.`,
        );
      }
    }

    // Layer 3: emerging technologies should appear in higher semesters only.
    const emergingCourses = allCourses.filter(
      (course) =>
        course.semester >= 5 &&
        this.keywordMatch(course.courseTitle, profile.emergingKeywords),
    );

    if (profile.emergingKeywords.length > 0 && emergingCourses.length < 2) {
      errors.push(
        `Emerging technology integration violation for ${profile.domain}: add at least 2 higher-semester emerging courses.`,
      );
    }

    const earlyAdvancedCourses = allCourses.filter(
      (course) =>
        course.semester <= 2 &&
        this.keywordMatch(course.courseTitle, [
          ...profile.emergingKeywords,
          "machine learning",
          "artificial intelligence",
          "robotics",
          "cloud",
          "blockchain",
          "digital twin",
          "autonomous",
          "cybersecurity",
          "generative ai",
        ]),
    );

    if (earlyAdvancedCourses.length > 0) {
      errors.push(
        `Learning progression violation: advanced technology topics found in Year 1 (${earlyAdvancedCourses
          .map((course) => `${course.courseCode}:${course.courseTitle}`)
          .join(", ")}).`,
      );
    }

    // Prerequisite progression rules.
    for (const rule of profile.progressionRules) {
      const prerequisiteSemester = this.findEarliestSemesterForKeywords(rule, "prerequisite");
      const dependentSemester = this.findEarliestSemesterForKeywords(rule, "dependent");

      if (dependentSemester === null) continue;

      if (prerequisiteSemester === null) {
        errors.push(
          `Progression violation: ${rule.label} requires prerequisite course(s) before semester ${dependentSemester}.`,
        );
        continue;
      }

      if (prerequisiteSemester >= dependentSemester) {
        errors.push(
          `Progression violation: ${rule.label} order is invalid (prerequisite semester ${prerequisiteSemester}, dependent semester ${dependentSemester}).`,
        );
      }
    }

    // Program-specific restrictions for core curriculum categories.
    if (profile.restrictedKeywords.length > 0) {
      const misalignedCoreCourses = allCourses.filter(
        (course) =>
          (course.category === "ES" || course.category === "PC" || course.category === "PE") &&
          this.keywordMatch(course.courseTitle, profile.restrictedKeywords),
      );
      if (misalignedCoreCourses.length > 0) {
        errors.push(
          `Program-domain integrity violation for ${profile.domain}: unrelated topics detected (${misalignedCoreCourses
            .map((course) => `${course.courseCode}:${course.courseTitle}`)
            .join(", ")}).`,
        );
      }
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
    allErrors.push(...this.validateCreditDistributionRules());
    allErrors.push(...this.validateAICTERanges());
    allErrors.push(...this.validateNEPStructure());
    allErrors.push(...this.validateInternship());
    allErrors.push(...this.validateCapstone());
    allErrors.push(...this.validateElectiveProgression());
    allErrors.push(...this.validateLearningProgressionAndTechnologyAlignment());

    // Soft warning checks
    allWarnings.push(...this.validateCategoryRanges());
    allWarnings.push(...this.validateSkillAndMultidisciplinaryCoverage());
    allWarnings.push(...this.validateInternshipMilestones());

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
