import {
  CATEGORY_CODES,
  type CategoryCode,
  type GeneratedCourse,
  type GeneratedCurriculum,
  type GeneratedSemester,
  buildCurriculum,
} from "@/lib/curriculum/engine";
import {
  FUNDAMENTAL_BACKBONE_RULES,
  getDomainKnowledgeProfile,
  keywordMatch,
} from "@/lib/curriculum/domain-knowledge";
import {
  CategoryDistributionValidator,
  CourseUniquenessValidator,
  CurriculumValidator,
} from "@/lib/curriculum/validator";

const TARGET_TOTAL_CREDITS = 160;
const SEMESTER_MIN = 18;
const SEMESTER_MAX = 22;

const FLEXIBLE_CATEGORIES: CategoryCode[] = ["PE", "OE", "SE", "AE"];
const TARGET_PERCENTAGES: Record<CategoryCode, number> = {
  BS: 22,
  ES: 18,
  HSS: 12,
  PC: 27,
  PE: 7,
  OE: 4,
  MC: 0,
  AE: 3,
  SE: 2,
  PR: 5,
};

const EMERGING_TECH_TERMS = [
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "generative ai",
  "cloud computing",
  "cybersecurity",
  "edge ai",
] as const;

export interface CurriculumRepairAction {
  step: string;
  detail: string;
}

export interface CurriculumRepairResult {
  curriculum: GeneratedCurriculum;
  actions: CurriculumRepairAction[];
  warnings: string[];
}

function cloneCurriculum(curriculum: GeneratedCurriculum): GeneratedCurriculum {
  return {
    ...curriculum,
    categorySummary: curriculum.categorySummary.map((summary) => ({ ...summary })),
    semesters: curriculum.semesters
      .map((semester) => ({
        ...semester,
        categoryCourseCounts: { ...semester.categoryCourseCounts },
        courses: semester.courses.map((course) => ({ ...course })),
      }))
      .sort((left, right) => left.semester - right.semester),
  };
}

function deriveProgramTag(programName: string): string {
  const upper = String(programName || "").toUpperCase();
  if (upper.includes("COMPUTER") && upper.includes("SCIENCE")) return "CSE";
  if (upper.includes("ELECTRONICS") && upper.includes("COMMUNICATION")) return "ECE";
  if (upper.includes("ELECTRICAL")) return "EEE";
  if (upper.includes("MECHANICAL")) return "MEC";
  if (upper.includes("CIVIL")) return "CIV";

  const tokens = upper
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
  const initials = tokens.slice(0, 3).map((token) => token[0]).join("");
  if (initials.length >= 2) return initials.padEnd(3, initials[initials.length - 1]);
  return "PRG";
}

function buildCourseCode(programName: string, semester: number, category: CategoryCode, index: number): string {
  const sem = String(Math.max(1, semester)).padStart(2, "0");
  const seq = String(Math.max(1, index)).padStart(2, "0");
  return `${deriveProgramTag(programName)}${sem}${category}${seq}`;
}

function createEmptyCategoryCount(): Record<CategoryCode, number> {
  return {
    BS: 0,
    ES: 0,
    HSS: 0,
    PC: 0,
    PE: 0,
    OE: 0,
    MC: 0,
    AE: 0,
    SE: 0,
    PR: 0,
  };
}

function rebuildCategorySummary(curriculum: GeneratedCurriculum): void {
  curriculum.categorySummary = CATEGORY_CODES.map((categoryCode) => {
    const courses = curriculum.semesters.flatMap((semester) =>
      semester.courses.filter((course) => course.category === categoryCode),
    );
    const credits = courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
    const hoursCI = courses.reduce((sum, course) => sum + (Number(course.tHours) || 0), 0);
    const hoursT = courses.reduce((sum, course) => sum + (Number(course.tuHours) || 0), 0);
    const hoursLI = courses.reduce((sum, course) => sum + (Number(course.llHours) || 0), 0);
    const hoursTWD = courses.reduce((sum, course) => sum + (Number(course.twHours) || 0), 0);
    const hoursTotal = courses.reduce((sum, course) => sum + (Number(course.totalHours) || 0), 0);

    return {
      categoryCode,
      percentage:
        curriculum.totalCredits > 0
          ? Number(((credits / curriculum.totalCredits) * 100).toFixed(2))
          : 0,
      credits,
      numCourses: courses.length,
      coursesT: courses.filter((course) => course.tHours > 0).length,
      coursesP: courses.filter((course) => course.llHours > 0 || course.twHours > 0).length,
      coursesTU: courses.filter((course) => course.tuHours > 0).length,
      coursesLL: courses.filter((course) => course.llHours > 0).length,
      hoursCI,
      hoursT,
      hoursLI,
      hoursTWD,
      hoursTotal,
    };
  });
}

function refreshDerivedFields(curriculum: GeneratedCurriculum): void {
  for (const semester of curriculum.semesters) {
    semester.courses.sort((left, right) => {
      const leftRank = CATEGORY_CODES.indexOf(left.category);
      const rightRank = CATEGORY_CODES.indexOf(right.category);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.courseTitle.localeCompare(right.courseTitle);
    });

    semester.categoryCourseCounts = createEmptyCategoryCount();
    semester.courses = semester.courses.map((course, index) => {
      const normalizedCredits = Math.max(1, Math.floor(Number(course.credits) || 1));
      const totalHours = Math.max(30, normalizedCredits * 30);
      semester.categoryCourseCounts[course.category] += 1;
      return {
        ...course,
        semester: semester.semester,
        credits: normalizedCredits,
        totalHours,
        courseCode: buildCourseCode(curriculum.programName, semester.semester, course.category, index + 1),
      };
    });

    semester.totalCredits = semester.courses.reduce((sum, course) => sum + course.credits, 0);
  }

  curriculum.semesterCount = curriculum.semesters.length;
  curriculum.totalCredits = curriculum.semesters.reduce(
    (sum, semester) => sum + semester.totalCredits,
    0,
  );
  rebuildCategorySummary(curriculum);
  curriculum.generatedAt = new Date().toISOString();
}

function getSemesterCredits(semester: GeneratedSemester): number {
  return semester.courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
}

function isFundamentalTitle(title: string): boolean {
  return FUNDAMENTAL_BACKBONE_RULES.some((rule) => keywordMatch(title, rule.keywords));
}

function findCourseIndex(
  semester: GeneratedSemester,
  predicate: (course: GeneratedCourse) => boolean,
): number {
  return semester.courses.findIndex(predicate);
}

function moveCourse(
  curriculum: GeneratedCurriculum,
  sourceSemesterIndex: number,
  targetSemesterIndex: number,
  courseIndex: number,
): boolean {
  if (sourceSemesterIndex === targetSemesterIndex) return false;
  const source = curriculum.semesters[sourceSemesterIndex];
  const target = curriculum.semesters[targetSemesterIndex];
  if (!source || !target) return false;

  const course = source.courses[courseIndex];
  if (!course) return false;
  source.courses.splice(courseIndex, 1);
  target.courses.push({
    ...course,
    semester: target.semester,
  });
  return true;
}

function findEarliestCourseIndexByKeywords(
  curriculum: GeneratedCurriculum,
  keywords: string[],
): { semesterIndex: number; courseIndex: number } | null {
  for (let semesterIndex = 0; semesterIndex < curriculum.semesters.length; semesterIndex += 1) {
    const semester = curriculum.semesters[semesterIndex];
    const courseIndex = findCourseIndex(semester, (course) => keywordMatch(course.courseTitle, keywords));
    if (courseIndex >= 0) {
      return { semesterIndex, courseIndex };
    }
  }
  return null;
}

function enforceTargetCredits(
  curriculum: GeneratedCurriculum,
  actions: CurriculumRepairAction[],
  warnings: string[],
): GeneratedCurriculum {
  if (curriculum.totalCredits === TARGET_TOTAL_CREDITS) {
    return curriculum;
  }

  const rebuilt = buildCurriculum({
    programName: curriculum.programName,
    totalCredits: TARGET_TOTAL_CREDITS,
    semesterCount: curriculum.semesterCount,
    mode: curriculum.mode,
    categoryPercentages: TARGET_PERCENTAGES,
  });

  if (!rebuilt.curriculum) {
    warnings.push(
      `CurriculumRepairEngine: failed to rebuild to ${TARGET_TOTAL_CREDITS} credits; keeping existing credits.`,
    );
    return curriculum;
  }

  actions.push({
    step: "normalize_total_credits",
    detail: `Rebuilt curriculum to enforce ${TARGET_TOTAL_CREDITS} total credits.`,
  });
  warnings.push(...rebuilt.warnings);
  return rebuilt.curriculum;
}

function enforceCategoryDistribution(
  curriculum: GeneratedCurriculum,
  actions: CurriculumRepairAction[],
  warnings: string[],
): GeneratedCurriculum {
  const distributionErrors = new CategoryDistributionValidator(curriculum).validate();
  if (distributionErrors.length === 0) {
    return curriculum;
  }

  const rebuilt = buildCurriculum({
    programName: curriculum.programName,
    totalCredits: TARGET_TOTAL_CREDITS,
    semesterCount: curriculum.semesterCount,
    mode: curriculum.mode,
    categoryPercentages: TARGET_PERCENTAGES,
  });

  if (!rebuilt.curriculum) {
    warnings.push(
      "CurriculumRepairEngine: category rebalance failed because curriculum rebuild did not return data.",
    );
    return curriculum;
  }

  actions.push({
    step: "rebalance_category_distribution",
    detail: "Rebuilt curriculum with AICTE-aligned target category percentages.",
  });
  warnings.push(...rebuilt.warnings);
  return rebuilt.curriculum;
}

function enforceFundamentalBackbone(
  curriculum: GeneratedCurriculum,
  actions: CurriculumRepairAction[],
): void {
  const alreadyTouched = new Set<string>();

  for (const rule of FUNDAMENTAL_BACKBONE_RULES) {
    const present = curriculum.semesters.some((semester) =>
      semester.courses.some((course) => keywordMatch(course.courseTitle, rule.keywords)),
    );
    if (present) continue;

    const targetIndex = Math.min(
      curriculum.semesters.length - 1,
      Math.max(0, rule.preferredSemester - 1),
    );
    const semester = curriculum.semesters[targetIndex];
    if (!semester) continue;

    const inCategoryIndex = findCourseIndex(
      semester,
      (course) =>
        course.category === rule.categoryHint &&
        !alreadyTouched.has(course.courseCode) &&
        !isFundamentalTitle(course.courseTitle),
    );

    const flexibleIndex =
      inCategoryIndex >= 0
        ? inCategoryIndex
        : findCourseIndex(
            semester,
            (course) =>
              FLEXIBLE_CATEGORIES.includes(course.category) &&
              !alreadyTouched.has(course.courseCode),
          );

    const fallbackIndex =
      flexibleIndex >= 0
        ? flexibleIndex
        : findCourseIndex(semester, (course) => !alreadyTouched.has(course.courseCode));

    if (fallbackIndex < 0) continue;

    const targetCourse = semester.courses[fallbackIndex];
    if (!targetCourse) continue;

    targetCourse.courseTitle = rule.title;
    targetCourse.prerequisites = targetCourse.prerequisites || [];
    targetCourse.learningHours = targetCourse.learningHours || targetCourse.totalHours;
    alreadyTouched.add(targetCourse.courseCode);

    actions.push({
      step: "insert_fundamental_backbone",
      detail: `Inserted "${rule.title}" in semester ${semester.semester}.`,
    });
  }
}

function formatTitle(value: string): string {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function removeDuplicateTitles(curriculum: GeneratedCurriculum, actions: CurriculumRepairAction[]): void {
  const seen = new Set<string>();

  for (const semester of curriculum.semesters) {
    for (const course of semester.courses) {
      let normalized = CourseUniquenessValidator.normalizeTitle(course.courseTitle);
      if (!normalized) {
        course.courseTitle = `${course.category} Course`;
        normalized = CourseUniquenessValidator.normalizeTitle(course.courseTitle);
      }

      if (!seen.has(normalized)) {
        seen.add(normalized);
        continue;
      }

      const base = course.courseTitle.replace(/\b(?:\d+|I|II|III|IV|V|VI|VII|VIII|IX|X)\b/g, "").trim();
      const suffixes = ["Concepts", "Applications", "Systems", "Practice", "Studio"];
      let candidate = `${base || course.category} ${suffixes[0]}`;
      let pointer = 1;
      while (seen.has(CourseUniquenessValidator.normalizeTitle(candidate))) {
        candidate = `${base || course.category} ${suffixes[pointer % suffixes.length]} ${pointer + 1}`;
        pointer += 1;
      }
      course.courseTitle = candidate.trim();
      seen.add(CourseUniquenessValidator.normalizeTitle(course.courseTitle));

      actions.push({
        step: "remove_duplicates",
        detail: `Renamed duplicate course to "${course.courseTitle}" in semester ${semester.semester}.`,
      });
    }
  }
}

function enforcePrerequisiteOrder(curriculum: GeneratedCurriculum, actions: CurriculumRepairAction[]): void {
  const profile = getDomainKnowledgeProfile(curriculum.programName);

  for (const rule of profile.progressionRules) {
    const prerequisite = findEarliestCourseIndexByKeywords(curriculum, rule.prerequisiteKeywords);
    const dependent = findEarliestCourseIndexByKeywords(curriculum, rule.dependentKeywords);
    if (!dependent) continue;

    if (!prerequisite) {
      const targetSemesterIndex = Math.max(0, dependent.semesterIndex - 1);
      const targetSemester = curriculum.semesters[targetSemesterIndex];
      if (!targetSemester) continue;
      const replacementIndex = findCourseIndex(
        targetSemester,
        (course) => !isFundamentalTitle(course.courseTitle) && course.category !== "PR",
      );
      if (replacementIndex >= 0) {
        const seedTitle = rule.prerequisiteKeywords[0] || "Prerequisite Foundations";
        targetSemester.courses[replacementIndex].courseTitle = formatTitle(seedTitle);
        actions.push({
          step: "reorder_prerequisites",
          detail: `Inserted prerequisite "${formatTitle(seedTitle)}" before "${rule.label}".`,
        });
      }
      continue;
    }

    if (prerequisite.semesterIndex < dependent.semesterIndex) continue;

    const targetSemesterIndex = Math.min(curriculum.semesters.length - 1, prerequisite.semesterIndex + 1);
    if (moveCourse(curriculum, dependent.semesterIndex, targetSemesterIndex, dependent.courseIndex)) {
      actions.push({
        step: "reorder_prerequisites",
        detail: `Moved dependent course for "${rule.label}" to semester ${curriculum.semesters[targetSemesterIndex].semester}.`,
      });
    }
  }
}

function enforceEmergingAfterSem5(curriculum: GeneratedCurriculum, actions: CurriculumRepairAction[]): void {
  const profile = getDomainKnowledgeProfile(curriculum.programName);
  const emergingTerms = Array.from(new Set([...EMERGING_TECH_TERMS, ...profile.emergingKeywords]));

  for (let sourceIndex = 0; sourceIndex < curriculum.semesters.length; sourceIndex += 1) {
    const semester = curriculum.semesters[sourceIndex];
    if (semester.semester >= 5) continue;

    for (let courseIndex = semester.courses.length - 1; courseIndex >= 0; courseIndex -= 1) {
      const course = semester.courses[courseIndex];
      if (!keywordMatch(course.courseTitle, emergingTerms)) continue;

      let moved = false;
      for (let targetIndex = 0; targetIndex < curriculum.semesters.length; targetIndex += 1) {
        const targetSemester = curriculum.semesters[targetIndex];
        if (targetSemester.semester < 5) continue;
        if (getSemesterCredits(targetSemester) + course.credits > SEMESTER_MAX) continue;
        moved = moveCourse(curriculum, sourceIndex, targetIndex, courseIndex);
        if (moved) {
          actions.push({
            step: "shift_emerging_tech",
            detail: `Moved "${course.courseTitle}" to semester ${targetSemester.semester}.`,
          });
        }
        break;
      }

      if (!moved) {
        course.courseTitle = `${profile.domain} Core Technology`;
        actions.push({
          step: "shift_emerging_tech",
          detail: `Replaced early-semester emerging title with "${course.courseTitle}" in semester ${semester.semester}.`,
        });
      }
    }
  }
}

function balanceSemesterCredits(curriculum: GeneratedCurriculum, actions: CurriculumRepairAction[]): void {
  const semesterCount = curriculum.semesters.length;

  const pickMovableIndex = (semester: GeneratedSemester): number => {
    const flexible = findCourseIndex(
      semester,
      (course) =>
        FLEXIBLE_CATEGORIES.includes(course.category) &&
        !isFundamentalTitle(course.courseTitle) &&
        course.category !== "PR",
    );
    if (flexible >= 0) return flexible;

    return findCourseIndex(
      semester,
      (course) => !isFundamentalTitle(course.courseTitle) && course.category !== "PR",
    );
  };

  for (let semesterIndex = 0; semesterIndex < semesterCount; semesterIndex += 1) {
    let source = curriculum.semesters[semesterIndex];
    while (source && getSemesterCredits(source) > SEMESTER_MAX) {
      const courseIndex = pickMovableIndex(source);
      if (courseIndex < 0) break;

      let moved = false;
      for (let targetIndex = semesterIndex + 1; targetIndex < semesterCount; targetIndex += 1) {
        const target = curriculum.semesters[targetIndex];
        const course = source.courses[courseIndex];
        if (!course) continue;
        if (getSemesterCredits(target) + course.credits > SEMESTER_MAX) continue;
        moved = moveCourse(curriculum, semesterIndex, targetIndex, courseIndex);
        if (moved) {
          actions.push({
            step: "balance_semester_credits",
            detail: `Moved "${course.courseTitle}" from semester ${source.semester} to semester ${target.semester}.`,
          });
        }
        break;
      }
      if (!moved) break;
      source = curriculum.semesters[semesterIndex];
    }
  }

  for (let semesterIndex = 0; semesterIndex < semesterCount; semesterIndex += 1) {
    let target = curriculum.semesters[semesterIndex];
    while (target && getSemesterCredits(target) < SEMESTER_MIN) {
      let pulled = false;
      for (let donorIndex = semesterCount - 1; donorIndex >= 0; donorIndex -= 1) {
        if (donorIndex === semesterIndex) continue;
        const donor = curriculum.semesters[donorIndex];
        if (getSemesterCredits(donor) <= SEMESTER_MIN) continue;
        const courseIndex = pickMovableIndex(donor);
        if (courseIndex < 0) continue;
        const course = donor.courses[courseIndex];
        if (!course) continue;
        if (getSemesterCredits(target) + course.credits > SEMESTER_MAX) continue;
        pulled = moveCourse(curriculum, donorIndex, semesterIndex, courseIndex);
        if (pulled) {
          actions.push({
            step: "balance_semester_credits",
            detail: `Pulled "${course.courseTitle}" forward from semester ${donor.semester} to semester ${target.semester}.`,
          });
        }
        break;
      }
      if (!pulled) break;
      target = curriculum.semesters[semesterIndex];
    }
  }
}

function enforceSkillEnhancementFloor(
  curriculum: GeneratedCurriculum,
  actions: CurriculumRepairAction[],
): void {
  const totalCredits = curriculum.semesters.reduce(
    (sum, semester) => sum + getSemesterCredits(semester),
    0,
  );
  const minSkillCredits = Math.ceil(totalCredits * 0.05);

  const getSkillCredits = () =>
    curriculum.semesters.reduce(
      (sum, semester) =>
        sum +
        semester.courses.reduce((courseSum, course) => {
          if (course.category === "AE" || course.category === "SE") {
            return courseSum + course.credits;
          }
          return courseSum;
        }, 0),
      0,
    );

  let deficit = minSkillCredits - getSkillCredits();
  if (deficit <= 0) return;

  const candidates = curriculum.semesters
    .filter((semester) => semester.semester >= 3)
    .flatMap((semester) =>
      semester.courses
        .filter(
          (course) =>
            (course.category === "PE" || course.category === "OE" || course.category === "PC") &&
            !isFundamentalTitle(course.courseTitle),
        )
        .map((course) => ({ semester, course })),
    );

  for (const candidate of candidates) {
    if (deficit <= 0) break;
    candidate.course.category = "SE";
    if (!/lab|practice|studio/i.test(candidate.course.courseTitle)) {
      candidate.course.courseTitle = `${candidate.course.courseTitle} Practice`;
    }
    deficit -= candidate.course.credits;
    actions.push({
      step: "rebalance_category_distribution",
      detail: `Converted "${candidate.course.courseTitle}" in semester ${candidate.semester.semester} to Skill Enhancement.`,
    });
  }
}

function ensureEmergingCoverage(curriculum: GeneratedCurriculum, actions: CurriculumRepairAction[]): void {
  const profile = getDomainKnowledgeProfile(curriculum.programName);
  const emergingTerms = Array.from(new Set([...EMERGING_TECH_TERMS, ...profile.emergingKeywords]));

  const current = curriculum.semesters
    .filter((semester) => semester.semester >= 5)
    .flatMap((semester) =>
      semester.courses.filter((course) => keywordMatch(course.courseTitle, emergingTerms)),
    );
  if (current.length >= 2) return;

  const candidates = curriculum.semesters
    .filter((semester) => semester.semester >= 5)
    .flatMap((semester) =>
      semester.courses
        .filter((course) => course.category === "PE" || course.category === "OE")
        .map((course) => ({ semester, course })),
    );

  for (let idx = 0; idx < candidates.length && current.length < 2; idx += 1) {
    const replacement = profile.emergingKeywords[idx % Math.max(1, profile.emergingKeywords.length)];
    if (!replacement) continue;
    const { semester, course } = candidates[idx];
    if (keywordMatch(course.courseTitle, [replacement])) continue;
    course.courseTitle = replacement
      .split(" ")
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(" ");
    current.push(course);
    actions.push({
      step: "regenerate_electives",
      detail: `Retitled elective in semester ${semester.semester} to "${course.courseTitle}" for emerging-tech coverage.`,
    });
  }
}

export class CurriculumRepairEngine {
  static repair(curriculum: GeneratedCurriculum): CurriculumRepairResult {
    const actions: CurriculumRepairAction[] = [];
    const warnings: string[] = [];

    let working = cloneCurriculum(curriculum);
    refreshDerivedFields(working);

    working = enforceTargetCredits(working, actions, warnings);
    refreshDerivedFields(working);

    working = enforceCategoryDistribution(working, actions, warnings);
    refreshDerivedFields(working);

    enforceFundamentalBackbone(working, actions);
    removeDuplicateTitles(working, actions);
    enforcePrerequisiteOrder(working, actions);
    enforceEmergingAfterSem5(working, actions);
    ensureEmergingCoverage(working, actions);
    enforceSkillEnhancementFloor(working, actions);
    balanceSemesterCredits(working, actions);
    removeDuplicateTitles(working, actions);

    refreshDerivedFields(working);

    const postValidation = new CurriculumValidator(working).validate();
    warnings.push(...postValidation.warnings);

    return {
      curriculum: working,
      actions,
      warnings,
    };
  }
}
