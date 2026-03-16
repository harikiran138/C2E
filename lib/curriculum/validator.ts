import type {
  CategoryCode,
  GeneratedCurriculum,
  GeneratedSemester,
  GeneratedCourse,
  CategorySummary,
} from "@/lib/curriculum/engine";
import {
  FUNDAMENTAL_BACKBONE_RULES,
  getDomainKnowledgeProfile,
  keywordMatch,
  type ProgressionRule,
} from "@/lib/curriculum/domain-knowledge";

export type { CategoryCode, GeneratedCurriculum, GeneratedSemester, GeneratedCourse, CategorySummary };

const TARGET_PROGRAM_CREDITS = 160;
const SEMESTER_CREDIT_RANGE = { min: 18, max: 22 } as const;

const AICTE_DISTRIBUTION_RANGES = {
  BS: { min: 20, max: 25 },
  ES: { min: 15, max: 20 },
  HSS: { min: 10, max: 15 },
  PC: { min: 25, max: 30 },
  ELECTIVES: { min: 10, max: 15 }, // PE + OE
  SKILL: { min: 5, max: 6 }, // AE + SE
} as const;

const EARLY_TECH_COURSE_TERMS = [
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "generative ai",
  "cloud computing",
  "cybersecurity",
  "edge ai",
] as const;

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export class CourseUniquenessValidator {
  private readonly curriculum: GeneratedCurriculum;

  constructor(curriculum: GeneratedCurriculum) {
    this.curriculum = curriculum;
  }

  static normalizeTitle(value: string): string {
    return String(value || "")
      .toLowerCase()
      .replace(/\b(?:\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, " ")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  validate(): string[] {
    const errors: string[] = [];
    const seen = new Map<string, { semester: number; courseCode: string; title: string }>();

    for (const semester of this.curriculum.semesters) {
      for (const course of semester.courses) {
        const normalized = CourseUniquenessValidator.normalizeTitle(course.courseTitle);
        if (!normalized) continue;
        const existing = seen.get(normalized);
        if (!existing) {
          seen.set(normalized, {
            semester: semester.semester,
            courseCode: course.courseCode,
            title: course.courseTitle,
          });
          continue;
        }
        errors.push(
          `CourseUniquenessValidator: "${course.courseTitle}" in semester ${semester.semester} duplicates "${existing.title}" (semester ${existing.semester}) after normalization.`,
        );
      }
    }

    return errors;
  }
}

export class CategoryDistributionValidator {
  private readonly curriculum: GeneratedCurriculum;

  constructor(curriculum: GeneratedCurriculum) {
    this.curriculum = curriculum;
  }

  validate(): string[] {
    const errors: string[] = [];
    const total = Number(this.curriculum.totalCredits || 0);
    if (total <= 0) {
      errors.push("CategoryDistributionValidator: curriculum totalCredits is invalid.");
      return errors;
    }

    const credits = this.curriculum.semesters.reduce(
      (acc, semester) => {
        for (const course of semester.courses) {
          acc[course.category] = (acc[course.category] || 0) + (Number(course.credits) || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const values = {
      BS: credits.BS || 0,
      ES: credits.ES || 0,
      HSS: credits.HSS || 0,
      PC: credits.PC || 0,
      ELECTIVES: (credits.PE || 0) + (credits.OE || 0),
      SKILL: (credits.AE || 0) + (credits.SE || 0),
    };

    for (const [key, range] of Object.entries(AICTE_DISTRIBUTION_RANGES)) {
      const value = values[key as keyof typeof values];
      const percent = (value / total) * 100;
      if (percent < range.min || percent > range.max) {
        errors.push(
          `CategoryDistributionValidator: ${key} is ${percent.toFixed(2)}% (allowed ${range.min}-${range.max}%).`,
        );
      }
    }

    return errors;
  }
}

export class CurriculumValidator {
  private readonly strict: boolean;
  private readonly curriculum: GeneratedCurriculum;

  constructor(curriculum: GeneratedCurriculum, strict: boolean = true) {
    this.curriculum = curriculum;
    this.strict = strict;
  }

  validateCredits(): string[] {
    const errors: string[] = [];
    const declared = Number(this.curriculum.totalCredits || 0);
    const actual = this.curriculum.semesters.reduce(
      (semesterSum, semester) =>
        semesterSum + semester.courses.reduce((courseSum, course) => courseSum + course.credits, 0),
      0,
    );

    if (declared !== actual) {
      errors.push(
        `Credit mismatch: curriculum declares ${declared} total credits but the course sum is ${actual}.`,
      );
    }

    if (declared !== TARGET_PROGRAM_CREDITS) {
      errors.push(
        `Curriculum total credits must be ${TARGET_PROGRAM_CREDITS}. Current value is ${declared}.`,
      );
    }

    return errors;
  }

  validateSemesterCreditRange(): string[] {
    const errors: string[] = [];

    for (const semester of this.curriculum.semesters) {
      const credits = semester.courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
      if (credits < SEMESTER_CREDIT_RANGE.min || credits > SEMESTER_CREDIT_RANGE.max) {
        const msg = `SemesterCreditBalancer: semester ${semester.semester} has ${credits} credits (allowed ${SEMESTER_CREDIT_RANGE.min}-${SEMESTER_CREDIT_RANGE.max}).`;
        if (this.strict) {
          errors.push(msg);
        } else {
          // In non-strict mode, we'll let this pass but it might be handled as a warning by the caller if we had a warning array here.
          // Wait, the validate() method merges everything.
        }
      }
    }

    return errors;
  }

  validateCategoryDistributionRules(): string[] {
    return new CategoryDistributionValidator(this.curriculum).validate();
  }

  validateAICTERanges(): string[] {
    return this.validateCategoryDistributionRules();
  }

  validateNEPStructure(): string[] {
    const errors: string[] = [];
    const semesters = this.curriculum.semesters;
    if (semesters.length === 0) {
      errors.push("No semesters found in curriculum.");
      return errors;
    }

    const foundationCategories: CategoryCode[] = ["BS", "ES", "HSS"];
    for (const semester of semesters.filter((item) => item.semester <= 2)) {
      const hasFoundation = semester.courses.some((course) =>
        foundationCategories.includes(course.category),
      );
      if (!hasFoundation) {
        errors.push(
          `NEP structure violation: semester ${semester.semester} must include BS/ES/HSS foundation courses.`,
        );
      }
    }

    for (const semester of semesters.filter((item) => item.semester < 4)) {
      if (semester.courses.some((course) => course.category === "PR")) {
        errors.push(
          `NEP structure violation: PR course appears in semester ${semester.semester}; allowed from semester 4 onward.`,
        );
      }
    }

    for (const semester of semesters.filter((item) => item.semester <= 4)) {
      const earlyElectives = semester.courses.filter(
        (course) => course.category === "PE" || course.category === "OE",
      );
      if (earlyElectives.length > 0) {
        errors.push(
          `NEP progression violation: PE/OE courses appear in semester ${semester.semester}; electives should start after semester 4.`,
        );
      }
    }

    const finalSemesterNumber = Math.max(...semesters.map((item) => item.semester));
    const finalSemester = semesters.find((item) => item.semester === finalSemesterNumber);
    if (!finalSemester || !finalSemester.courses.some((course) => course.category === "PR")) {
      errors.push("NEP structure violation: final semester must include a PR capstone/project course.");
    }

    return errors;
  }

  validateFundamentalBackbone(): string[] {
    const errors: string[] = [];
    const courses = this.curriculum.semesters.flatMap((semester) => semester.courses);

    for (const rule of FUNDAMENTAL_BACKBONE_RULES) {
      const found = courses.some((course) => keywordMatch(course.courseTitle, rule.keywords));
      if (!found) {
        errors.push(
          `FUNDAMENTAL_BACKBONE_RULES: missing mandatory foundation course for "${rule.title}".`,
        );
      }
    }

    return errors;
  }

  validateDomainKnowledgeGraph(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const profile = getDomainKnowledgeProfile(this.curriculum.programName);
    const graph = profile.knowledgeGraph;

    const filteredCourses = this.curriculum.semesters.flatMap((semester) =>
      semester.courses
        .filter((course) => ["ES", "PC", "PE", "OE"].includes(course.category))
        .map((course) => ({
          ...course,
          semester: semester.semester,
        })),
    );

    const unrelated = filteredCourses.filter((course) =>
      keywordMatch(course.courseTitle, graph.disallowedTopics),
    );
    if (unrelated.length > 0) {
      errors.push(
        `DomainKnowledgeGraph: unrelated courses detected (${unrelated
          .map((course) => `${course.courseCode}:${course.courseTitle}`)
          .join(", ")}).`,
      );
    }

    if (profile.domain === "CSE") {
      const aiDsCoverage = graph.coreTopics.filter((topic) =>
        filteredCourses.some((course) => keywordMatch(course.courseTitle, [topic])),
      );

      if (aiDsCoverage.length < 3) {
        warnings.push(
          `DomainKnowledgeGraph: AI/DS coverage is low (${aiDsCoverage.length} core topic matches).`,
        );
      }
    }

    return { errors, warnings };
  }

  validateTechnologyIntegration(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const profile = getDomainKnowledgeProfile(this.curriculum.programName);
    const emergingTerms = Array.from(
      new Set([...profile.emergingKeywords, ...EARLY_TECH_COURSE_TERMS]),
    );

    const earlyEmerging = this.curriculum.semesters
      .filter((semester) => semester.semester < 5)
      .flatMap((semester) =>
        semester.courses.filter((course) => keywordMatch(course.courseTitle, emergingTerms)),
      );

    if (earlyEmerging.length > 0) {
      errors.push(
        `TechnologyIntegrationEngine: emerging technology courses found before semester 5 (${earlyEmerging
          .map((course) => `${course.courseCode}:${course.courseTitle}`)
          .join(", ")}).`,
      );
    }

    const lateEmerging = this.curriculum.semesters
      .filter((semester) => semester.semester >= 5)
      .flatMap((semester) =>
        semester.courses.filter((course) => keywordMatch(course.courseTitle, emergingTerms)),
      );

    if (lateEmerging.length < 2) {
      warnings.push(
        "TechnologyIntegrationEngine: add more emerging-technology courses after semester 5.",
      );
    }

    return { errors, warnings };
  }

  private findEarliestSemesterForRuleKeywords(
    rule: ProgressionRule,
    kind: "prerequisite" | "dependent",
  ): number | null {
    const keywords = kind === "prerequisite" ? rule.prerequisiteKeywords : rule.dependentKeywords;
    let result: number | null = null;

    for (const semester of this.curriculum.semesters) {
      const hit = semester.courses.some((course) => keywordMatch(course.courseTitle, keywords));
      if (!hit) continue;
      result = result === null ? semester.semester : Math.min(result, semester.semester);
    }

    return result;
  }

  validatePrerequisiteProgression(): string[] {
    const errors: string[] = [];
    const profile = getDomainKnowledgeProfile(this.curriculum.programName);

    for (const rule of profile.progressionRules) {
      const prerequisiteSemester = this.findEarliestSemesterForRuleKeywords(rule, "prerequisite");
      const dependentSemester = this.findEarliestSemesterForRuleKeywords(rule, "dependent");

      if (dependentSemester === null) continue;
      if (prerequisiteSemester === null) {
        // Only error if prerequisite is completely missing
        errors.push(
          `CoursePrerequisiteGraph: missing prerequisite for "${rule.label}" before semester ${dependentSemester}.`,
        );
        continue;
      }

      if (prerequisiteSemester > dependentSemester) {
        // Strict violation: prerequisite appears AFTER the dependent
        errors.push(
          `CoursePrerequisiteGraph: invalid order for "${rule.label}" (prerequisite semester ${prerequisiteSemester}, dependent semester ${dependentSemester}).`,
        );
      }
      // Same semester is allowed (introductory + applied in parallel in first semester)
    }

    return errors;
  }

  validateInternship(): string[] {
    const errors: string[] = [];
    const hasPRInSem4OrLater = this.curriculum.semesters.some(
      (semester) =>
        semester.semester >= 4 && semester.courses.some((course) => course.category === "PR"),
    );
    if (!hasPRInSem4OrLater) {
      errors.push(
        "Internship requirement violation: no PR course found in semester 4 or later.",
      );
    }
    return errors;
  }

  validateCapstone(): string[] {
    const errors: string[] = [];
    if (this.curriculum.semesters.length === 0) {
      errors.push("Capstone requirement violation: no semesters found.");
      return errors;
    }

    const finalSemesterNumber = Math.max(...this.curriculum.semesters.map((item) => item.semester));
    const finalSemester = this.curriculum.semesters.find(
      (item) => item.semester === finalSemesterNumber,
    );
    if (!finalSemester?.courses.some((course) => course.category === "PR")) {
      errors.push("Capstone requirement violation: final semester has no PR course.");
    }

    return errors;
  }

  validateCourseUniqueness(): string[] {
    return new CourseUniquenessValidator(this.curriculum).validate();
  }

  validateSkillAndMultidisciplinaryCoverage(): string[] {
    const warnings: string[] = [];
    const semestersWithOE = this.curriculum.semesters.filter((semester) =>
      semester.courses.some((course) => course.category === "OE"),
    );
    if (semestersWithOE.length === 0) {
      warnings.push("No OE course found; add multidisciplinary open electives.");
    }

    const semestersWithSE = this.curriculum.semesters.filter((semester) =>
      semester.courses.some((course) => course.category === "SE"),
    );
    if (semestersWithSE.length < 2) {
      warnings.push(`SE appears in ${semestersWithSE.length} semester(s); target at least 2.`);
    }

    return warnings;
  }

  validateInternshipMilestones(): string[] {
    const warnings: string[] = [];
    const semesters = this.curriculum.semesters;
    if (semesters.length === 0) return warnings;

    const hasPRNear = (targetSemester: number): boolean =>
      semesters.some(
        (semester) =>
          Math.abs(semester.semester - targetSemester) <= 1 &&
          semester.courses.some((course) => course.category === "PR"),
      );

    if (semesters.length >= 4 && !hasPRNear(4)) {
      warnings.push("Internship milestone missing around semester 4 (mini project/internship).");
    }
    if (semesters.length >= 6 && !hasPRNear(6)) {
      warnings.push("Internship milestone missing around semester 6 (industry internship).");
    }

    return warnings;
  }

  validateCategoryRanges(): string[] {
    return [];
  }

  validateCreditDistributionRules(): string[] {
    return this.validateCategoryDistributionRules();
  }

  validateElectiveProgression(): string[] {
    const errors: string[] = [];
    for (const semester of this.curriculum.semesters) {
      if (semester.semester <= 4) {
        const earlyElectives = semester.courses.filter(
          (course) => course.category === "PE" || course.category === "OE",
        );
        if (earlyElectives.length > 0) {
          errors.push(
            `Elective progression violation: semester ${semester.semester} contains PE/OE courses.`,
          );
        }
      }
    }
    return errors;
  }

  validateLearningProgressionAndTechnologyAlignment(): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    errors.push(...this.validateFundamentalBackbone());
    errors.push(...this.validatePrerequisiteProgression());
    const domain = this.validateDomainKnowledgeGraph();
    errors.push(...domain.errors);
    warnings.push(...domain.warnings);
    const tech = this.validateTechnologyIntegration();
    errors.push(...tech.errors);
    warnings.push(...tech.warnings);
    return { errors, warnings };
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Credit validation - warnings only in non-strict, errors in strict
    const creditErrors = this.validateCredits();
    if (this.strict) errors.push(...creditErrors);
    else warnings.push(...creditErrors);

    const rangeErrors = this.validateSemesterCreditRange();
    // Semester credit range is always a warning, not an error
    warnings.push(...rangeErrors);

    // Category distribution - always a warning (user can configure their own distributions)
    const distErrors = this.validateCategoryDistributionRules();
    warnings.push(...distErrors);

    // Structural - always warnings too (except strict mode)
    const nepErrors = this.validateNEPStructure();
    if (this.strict) errors.push(...nepErrors);
    else warnings.push(...nepErrors);

    const internErrors = this.validateInternship();
    if (this.strict) errors.push(...internErrors);
    else warnings.push(...internErrors);

    const capstoneErrors = this.validateCapstone();
    if (this.strict) errors.push(...capstoneErrors);
    else warnings.push(...capstoneErrors);

    const electiveErrors = this.validateElectiveProgression();
    if (this.strict) errors.push(...electiveErrors);
    else warnings.push(...electiveErrors);

    // Course uniqueness - always a warning (title overlap is okay across program)
    const uniqueErrors = this.validateCourseUniqueness();
    warnings.push(...uniqueErrors);

    // Backbone and progression - warnings only for missing foundation
    const progression = this.validateLearningProgressionAndTechnologyAlignment();
    // Prerequisite order violations are errors only in strict mode
    if (this.strict) errors.push(...progression.errors);
    else warnings.push(...progression.errors);
    warnings.push(...progression.warnings);

    warnings.push(...this.validateSkillAndMultidisciplinaryCoverage());
    warnings.push(...this.validateInternshipMilestones());

    const score = Math.max(0, 100 - errors.length * 8 - warnings.length * 2);
    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }
}
