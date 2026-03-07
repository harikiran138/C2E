"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProcessStep } from "@/lib/institution/process";
import ProgramAdvisoryCommitteeForm from "@/components/institution/process/ProgramAdvisoryCommitteeForm";
import BoardOfStudiesForm from "@/components/institution/process/BoardOfStudiesForm";
import RepresentativeStakeholdersForm from "@/components/institution/process/RepresentativeStakeholdersForm";
import VisionMissionGenerator from "@/components/institution/process/VisionMissionGenerator";
import ConsistencyMatrix from "@/components/institution/process/ConsistencyMatrix";
import ProgramOutcomesForm from "@/components/institution/process/ProgramOutcomesForm";
import PsoGenerator from "@/components/institution/process/PsoGenerator";
import AcademicCouncilForm from "@/components/institution/process/AcademicCouncilForm";
import OBEFrameworkForm from "@/components/institution/process/OBEFrameworkForm";
import IdentifyOBECoursesPanel from "@/components/institution/process/IdentifyOBECoursesPanel";
import CourseOutcomesPanel from "@/components/institution/process/CourseOutcomesPanel";
import CurriculumFeedbackPanel from "@/components/institution/process/CurriculumFeedbackPanel";
import AccreditationReportPanel from "@/components/institution/process/AccreditationReportPanel";
import AccreditationAnalyticsPanel from "@/components/institution/process/AccreditationAnalyticsPanel";
import VMPEOFeedbackDashboard from "@/components/institution/VMPEOFeedbackDashboard";
import {
  CATEGORY_CODES,
  CategoryCode,
  GeneratedCurriculum,
} from "@/lib/curriculum/engine";
import { Save, Loader2, WandSparkles, RefreshCcw } from "lucide-react";
import {
  clearCurriculumAdvisorSnapshot,
  readCurriculumAdvisorSnapshot,
} from "@/lib/curriculum/advisor-integration";

const CATEGORY_CELL_FIELDS = [
  "design_percent",
  "courses_t",
  "courses_p",
  "courses_tu",
  "courses_ll",
  "hours_ci",
  "hours_t",
  "hours_li",
  "hours_twd",
  "hours_total",
  "credit",
];

interface ProcessStepPanelProps {
  step: ProcessStep;
}

const CURRICULUM_STRUCTURE_ROWS = [
  { category: "Basic Science", code: "BS", min: 20, max: 25 },
  { category: "Engineering Science", code: "ES", min: 15, max: 20 },
  { category: "Humanities & Social Science", code: "HSS", min: 10, max: 15 },
  { category: "Professional Core", code: "PC", min: 25, max: 30 },
  { category: "Professional Elective", code: "PE", min: 10, max: 15 },
  {
    category: "Open Electives (Inter-departmental)",
    code: "OE",
    min: 10,
    max: 15,
  },
  { category: "Audit / Mandatory Courses", code: "MC", min: 0, max: 0 },
  { category: "Ability Enhancement Courses", code: "AE", min: 5, max: 6 },
  { category: "Skill Enhancement Courses", code: "SE", min: 5, max: 6 },
  { category: "Projects, Internships & Seminar", code: "PR", min: 8, max: 10 },
];

const CONVENTIONAL_ELECTIVE_OPTIONS = [
  "None",
  "BS",
  "ES",
  "HSS",
  "PC",
  "OE",
  "MC",
  "AE",
  "SE",
];

const TRANS_DISCIPLINARY_OPTIONS = [
  "None",
  "Technology & Management",
  "Technology & Economics",
  "Technology & Public Policy",
  "Technology, Society & Ethics",
  "Technology & Design",
  "Technology & Creativity (STEAM)",
  "Technology & Sustainability",
  "Technology & Environment",
  "Technology & Health Sciences",
  "Technology & Life Sciences",
  "Technology & Law & Governance",
  "Technology & Data & Analytics",
  "Technology & Artificial Intelligence (Cross-Domain)",
  "Technology & Human Behaviour",
  "Technology & Indian Knowledge Systems",
  "Technology & Social Impact",
  "Technology & Entrepreneurship & Innovation",
  "Technology & Smart Infrastructure & Urban Systems",
  "Technology & Education & Learning Sciences",
  "Technology & Media, Communication & Storytelling",
];
const ROMAN_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];
const ROMAN_TO_NUMBER: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
};
const SEMESTER_CATEGORY_COLUMNS = [
  "BS",
  "ES",
  "HSS",
  "PC",
  "OE",
  "MC",
  "AE",
  "SE",
  "INT",
  "PRO",
  "OTHERS",
];

const SAMPLE_TOTAL_CREDITS = 160;
const SAMPLE_CATEGORY_PERCENTAGES: Record<string, number> = {
  BS: 13.75,
  ES: 16.25,
  HSS: 8.75,
  PC: 31.25,
  PE: 10,
  OE: 5,
  MC: 0,
  AE: 3.75,
  SE: 2.5,
  PR: 8.75,
};

const ZEROED_CATEGORY_FIELDS = {
  courses_t: 0,
  courses_p: 0,
  courses_tu: 0,
  courses_ll: 0,
  hours_ci: 0,
  hours_t: 0,
  hours_li: 0,
  hours_twd: 0,
  hours_total: 0,
  credit: 0,
};

function buildSemesterLabels(durationYears: number): string[] {
  const semesters = Math.max(2, Math.min(12, Math.floor(durationYears * 2)));
  return Array.from(
    { length: semesters },
    (_, index) => ROMAN_NUMERALS[index] || `S${index + 1}`,
  );
}

function classifySemester(semesterNumber: number, semesterCount: number): string {
  if (semesterNumber <= 0) return "Unassigned";
  const position =
    semesterCount <= 1
      ? 1
      : (semesterNumber - 1) / Math.max(1, semesterCount - 1);
  if (position < 0.25) return "Foundation";
  if (position < 0.5) return "Engineering Base";
  if (position < 0.75) return "Professional Core";
  if (position < 0.9) return "Specialization";
  return "Capstone";
}

function getSemesterLabelFromNumber(semesterNumber: number): string {
  if (semesterNumber >= 1 && semesterNumber <= ROMAN_NUMERALS.length) {
    return ROMAN_NUMERALS[semesterNumber - 1];
  }
  return String(semesterNumber);
}

function getCategoryDisplayLabel(category: string): string {
  if (category === "HSS") return "HS";
  if (category === "SE") return "SEC";
  return category;
}

function getCategoryColorClass(category: string): string {
  if (category === "BS") return "bg-blue-600 text-white";
  if (category === "ES") return "bg-sky-500 text-white";
  if (category === "HSS") return "bg-green-600 text-white";
  if (category === "PC") return "bg-indigo-900 text-white";
  if (category === "PE") return "bg-purple-700 text-white";
  if (category === "OE") return "bg-cyan-700 text-white";
  if (category === "AE") return "bg-orange-600 text-white";
  if (category === "SE") return "bg-lime-600 text-white";
  if (category === "PR") return "bg-rose-700 text-white";
  if (category === "MC") return "bg-yellow-400 text-slate-900";
  return "bg-slate-300 text-slate-900";
}

function getPoPsoMapping(category: string): string {
  if (category === "BS") return "1,2,5,11/1";
  if (category === "HSS") return "1,9,11/1,3";
  if (category === "ES") return "1,2,3,11/1,2";
  if (category === "PC") return "1,2,3,11/1,2";
  if (category === "PE") return "1,2,4,5/1,2";
  if (category === "OE") return "6,7,8/2";
  if (category === "AE") return "9,10/3";
  if (category === "SE") return "2,3,5/1,2";
  if (category === "PR") return "1,2,3,4,5/1,2,3";
  return "-";
}

function formatNumeric(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizePercentagesToHundred(
  values: Array<{ code: string; value: number }>,
): Record<string, number> {
  const active = values.filter((item) => item.code !== "MC");
  if (active.length === 0) return {};

  const rounded = active.map((item) => ({
    code: item.code,
    value: Number(item.value.toFixed(2)),
  }));
  const total = rounded.reduce((sum, item) => sum + item.value, 0);
  const delta = Number((100 - total).toFixed(2));

  if (Math.abs(delta) <= 0.001) {
    return rounded.reduce(
      (acc, item) => ({ ...acc, [item.code]: item.value }),
      {} as Record<string, number>,
    );
  }

  const target =
    [...rounded].sort((left, right) => right.value - left.value)[0] || rounded[0];
  const normalized = rounded.map((item) =>
    item.code === target.code
      ? { ...item, value: Number((item.value + delta).toFixed(2)) }
      : item,
  );

  return normalized.reduce(
    (acc, item) => ({ ...acc, [item.code]: item.value }),
    {} as Record<string, number>,
  );
}

function CurriculumStructurePanel() {
  const [categoryCredits, setCategoryCredits] = useState<any[]>([]);
  const [conventionalElective, setConventionalElective] = useState("None");
  const [transDisciplinaryElective, setTransDisciplinaryElective] =
    useState("None");
  const [totalCredits, setTotalCredits] = useState("");
  const [totalCreditsError, setTotalCreditsError] = useState("");
  const [semesterCategories, setSemesterCategories] = useState<any[]>([]);
  const [programDurationYears, setProgramDurationYears] = useState(4);
  const [generatedCurriculum, setGeneratedCurriculum] =
    useState<GeneratedCurriculum | null>(null);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);
  const [regenerateSemester, setRegenerateSemester] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStructureReady, setIsStructureReady] = useState(false);
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");
  const requestedProgramName = String(searchParams.get("programName") || "").trim();
  const [programName, setProgramName] = useState(requestedProgramName);
  const semesterLabels = useMemo(
    () => buildSemesterLabels(programDurationYears),
    [programDurationYears],
  );

  useEffect(() => {
    if (!programId) return;
    let isMounted = true;
    fetch("/api/institution/me")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const programs = Array.isArray(data?.programs) ? data.programs : [];
        const selected = programs.find(
          (item: any) => String(item.id) === String(programId),
        );
        const years = Number(selected?.duration || 4);
        if (Number.isFinite(years) && years > 0) {
          setProgramDurationYears(years);
        }

        const resolvedProgramName = String(selected?.program_name || "").trim();
        const resolvedDegree = String(selected?.degree || "").trim();
        if (resolvedProgramName) {
          setProgramName(
            resolvedDegree && !resolvedProgramName.toLowerCase().startsWith(resolvedDegree.toLowerCase())
              ? `${resolvedDegree} ${resolvedProgramName}`
              : resolvedProgramName,
          );
        } else if (requestedProgramName) {
          setProgramName(requestedProgramName);
        }
      })
      .catch(() => {
        // keep default
        if (requestedProgramName) {
          setProgramName(requestedProgramName);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [programId, requestedProgramName]);

  useEffect(() => {
    if (requestedProgramName) {
      setProgramName(requestedProgramName);
    }
  }, [requestedProgramName]);

  useEffect(() => {
    const maxSemester = semesterLabels.length;
    const current = Number(regenerateSemester);
    if (!Number.isFinite(current) || current < 1 || current > maxSemester) {
      setRegenerateSemester("1");
    }
  }, [regenerateSemester, semesterLabels]);

  useEffect(() => {
    setIsStructureReady(false);
    setCategoryCredits(
      CURRICULUM_STRUCTURE_ROWS.map((r) => ({
        category_code: r.code,
        design_percent: 0,
        courses_t: 0,
        courses_p: 0,
        courses_tu: 0,
        courses_ll: 0,
        hours_ci: 0,
        hours_t: 0,
        hours_li: 0,
        hours_twd: 0,
        hours_total: 0,
        credit: 0,
      })),
    );

    setSemesterCategories(
      semesterLabels.map((s) => ({
        semester: s,
        no_of_credits: 0,
        courses_bs: 0,
        courses_es: 0,
        courses_hss: 0,
        courses_pc: 0,
        courses_oe: 0,
        courses_mc: 0,
        courses_ae: 0,
        courses_se: 0,
        courses_int: 0,
        courses_pro: 0,
        courses_others: 0,
      })),
    );

    if (!programId) {
      setIsStructureReady(true);
      return;
    }

    fetch(`/api/curriculum/structure?programId=${programId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.categoryCredits?.length > 0) {
          setCategoryCredits((prev) =>
            prev.map((row) => {
              const found = data.categoryCredits.find(
                (c: any) => c.category_code === row.category_code,
              );
              if (!found) return row;
              if (row.category_code === "MC") {
                return {
                  ...row,
                  ...found,
                  design_percent: 0,
                };
              }
              return { ...row, ...found };
            }),
          );
        }

        if (data.electivesSettings) {
          setConventionalElective(
            data.electivesSettings.conventional_elective || "None",
          );
          setTransDisciplinaryElective(
            data.electivesSettings.trans_disciplinary_elective || "None",
          );
          setTotalCredits(data.electivesSettings.total_credits?.toString() || "");
        }

        if (data.semesterCategories?.length > 0) {
          setSemesterCategories((prev) =>
            prev.map((row) => {
              const found = data.semesterCategories.find(
                (s: any) => s.semester === row.semester,
              );
              return found ? { ...row, ...found } : row;
            }),
          );
        }
        setIsStructureReady(true);
      })
      .catch(() => {
        // ignore load failure, user can still fill table
        setIsStructureReady(true);
      });
  }, [programId, semesterLabels]);

  useEffect(() => {
    if (!programId || !isStructureReady) return;

    const snapshot = readCurriculumAdvisorSnapshot(programId);
    if (!snapshot) return;

    const distribution = snapshot.categoryDistribution || {};
    setTotalCredits(String(Math.max(0, Math.floor(Number(snapshot.totalCredits || 0)))));
    setCategoryCredits((prev) =>
      prev.map((row) => {
        const rawPercent = Number(distribution[row.category_code] || 0);
        return {
          ...row,
          ...ZEROED_CATEGORY_FIELDS,
          design_percent:
            row.category_code === "MC" ? 0 : Math.max(0, Number(rawPercent.toFixed(2))),
        };
      }),
    );
    setGenerationWarnings((prev) => [
      `Applied AI Curriculum Advisor recommendation generated on ${new Date(
        snapshot.createdAt || Date.now(),
      ).toLocaleString()}.`,
      ...prev,
    ]);
    clearCurriculumAdvisorSnapshot(programId);
  }, [programId, isStructureReady]);

  const syncGeneratedData = (curriculum: GeneratedCurriculum) => {
    setTotalCredits(String(curriculum.totalCredits));
    const normalizedDesignPercentages = normalizePercentagesToHundred(
      curriculum.categorySummary.map((item) => ({
        code: item.categoryCode,
        value:
          curriculum.totalCredits > 0
            ? (item.credits / curriculum.totalCredits) * 100
            : 0,
      })),
    );

    setCategoryCredits((prev) =>
      prev.map((row) => {
        const summary = curriculum.categorySummary.find(
          (item) => item.categoryCode === row.category_code,
        );
        if (!summary) return row;
        return {
          ...row,
          design_percent:
            row.category_code === "MC"
              ? 0
              : Number(normalizedDesignPercentages[row.category_code] || 0),
          courses_t: summary.coursesT,
          courses_p: summary.coursesP,
          courses_tu: summary.coursesTU,
          courses_ll: summary.coursesLL,
          hours_ci: summary.hoursCI,
          hours_t: summary.hoursT,
          hours_li: summary.hoursLI,
          hours_twd: summary.hoursTWD,
          hours_total: summary.hoursTotal,
          credit: summary.credits,
        };
      }),
    );

    setSemesterCategories((prev) =>
      prev.map((row) => {
        const semNo =
          ROMAN_TO_NUMBER[row.semester] ||
          Number(String(row.semester).replace(/\D+/g, "")) ||
          0;
        const sem = curriculum.semesters.find((item) => item.semester === semNo);
        if (!sem) return row;
        return {
          ...row,
          no_of_credits: sem.totalCredits,
          courses_bs: sem.categoryCourseCounts.BS,
          courses_es: sem.categoryCourseCounts.ES,
          courses_hss: sem.categoryCourseCounts.HSS,
          courses_pc: sem.categoryCourseCounts.PC,
          courses_oe: sem.categoryCourseCounts.OE,
          courses_mc: sem.categoryCourseCounts.MC,
          courses_ae: sem.categoryCourseCounts.AE,
          courses_se: sem.categoryCourseCounts.SE,
          courses_pro: sem.categoryCourseCounts.PR,
          courses_int: 0,
          courses_others: sem.categoryCourseCounts.PE,
        };
      }),
    );
  };

  const buildCategoryPercentages = () => {
    const percentages: Partial<Record<CategoryCode, number>> = {};
    for (const row of categoryCredits) {
      if (!CATEGORY_CODES.includes(row.category_code as CategoryCode)) continue;
      if (row.category_code === "MC") {
        percentages.MC = 0;
        continue;
      }
      percentages[row.category_code as CategoryCode] =
        Number(row.design_percent) || 0;
    }
    return percentages;
  };

  const buildSemesterCategoryCounts = () => {
    return semesterCategories.map((row) => ({
      semester:
        ROMAN_TO_NUMBER[row.semester] ||
        Number(String(row.semester).replace(/\D+/g, "")) ||
        0,
      counts: {
        BS: Number(row.courses_bs) || 0,
        ES: Number(row.courses_es) || 0,
        HSS: Number(row.courses_hss) || 0,
        PC: Number(row.courses_pc) || 0,
        PE: Number(row.courses_others) || 0,
        OE: Number(row.courses_oe) || 0,
        MC: Number(row.courses_mc) || 0,
        AE: Number(row.courses_ae) || 0,
        SE: Number(row.courses_se) || 0,
        PR: (Number(row.courses_pro) || 0) + (Number(row.courses_int) || 0),
      },
    }));
  };

  const currentDesignPercentTotal = categoryCredits.reduce(
    (acc, row) =>
      acc + (row.category_code === "MC" ? 0 : Number(row.design_percent) || 0),
    0,
  );
  const designDelta = Number((100 - currentDesignPercentTotal).toFixed(2));
  const isDesignPercentValid = Math.abs(currentDesignPercentTotal - 100) <= 0.01;

  const semesterCreditTotal = semesterCategories.reduce(
    (acc, semester) => acc + (Number(semester?.no_of_credits) || 0),
    0,
  );

  const semesterColumnTotals = SEMESTER_CATEGORY_COLUMNS.reduce(
    (acc, column) => {
      const fieldName = `courses_${column.toLowerCase()}`;
      acc[column] = semesterCategories.reduce(
        (sum, semester) => sum + (Number(semester?.[fieldName]) || 0),
        0,
      );
      return acc;
    },
    {} as Record<string, number>,
  );

  const semesterGrandCourseTotal = Object.values(semesterColumnTotals).reduce(
    (acc, value) => acc + value,
    0,
  );

  const getSemesterCourseTotal = (semData: any) =>
    SEMESTER_CATEGORY_COLUMNS.reduce((acc, column) => {
      const fieldName = `courses_${column.toLowerCase()}`;
      return acc + (Number(semData?.[fieldName]) || 0);
    }, 0);

  const getSemesterNumber = (semesterLabel: string) =>
    ROMAN_TO_NUMBER[semesterLabel] ||
    Number(String(semesterLabel).replace(/\D+/g, "")) ||
    0;

  const getSemesterLevelLabel = (semesterLabel: string) => {
    const semesterNumber = getSemesterNumber(semesterLabel);
    const generatedLevel = generatedCurriculum?.semesters.find(
      (item) => item.semester === semesterNumber,
    )?.level;
    return generatedLevel || classifySemester(semesterNumber, semesterLabels.length);
  };

  const validateGeneratedCurriculum = (curriculum: GeneratedCurriculum): string[] => {
    const issues: string[] = [];
    const totalFromSemesters = curriculum.semesters.reduce(
      (acc, semester) => acc + semester.totalCredits,
      0,
    );
    if (totalFromSemesters !== curriculum.totalCredits) {
      issues.push(
        `Credit mismatch: semester totals (${totalFromSemesters}) != program total (${curriculum.totalCredits}).`,
      );
    }

    for (const semester of curriculum.semesters) {
      const sumCourseCredits = semester.courses.reduce(
        (acc, course) => acc + course.credits,
        0,
      );
      if (sumCourseCredits !== semester.totalCredits) {
        issues.push(
          `Semester ${semester.semester}: credits mismatch (${sumCourseCredits} vs ${semester.totalCredits}).`,
        );
      }

      for (const course of semester.courses) {
        const expectedHours = course.credits * 30;
        if (course.totalHours !== expectedHours) {
          issues.push(
            `Semester ${semester.semester} ${course.courseCode}: total hours (${course.totalHours}) must equal credits x 30 (${expectedHours}).`,
          );
        }
      }

      for (const [category, expectedCount] of Object.entries(
        semester.categoryCourseCounts,
      )) {
        const actualCount = semester.courses.filter(
          (course) => course.category === category,
        ).length;
        if (actualCount !== Number(expectedCount)) {
          issues.push(
            `Semester ${semester.semester} ${category}: allocated count (${expectedCount}) does not match generated courses (${actualCount}).`,
          );
        }
      }
    }

    return issues;
  };

  const handleTotalCreditsChange = (value: string) => {
    if (/^\d*$/.test(value)) {
      setTotalCredits(value);
      setTotalCreditsError("");
      return;
    }
    setTotalCreditsError("Total number of credits must be a whole number.");
  };

  const handleCategoryCreditChange = (
    code: string,
    field: string,
    value: string,
  ) => {
    if (code === "MC" && field === "design_percent") return;
    setCategoryCredits((prev) =>
      prev.map((c) =>
        c.category_code === code ? { ...c, [field]: Number(value) } : c,
      ),
    );
  };

  const handleSemesterCategoryChange = (
    semester: string,
    field: string,
    value: string,
  ) => {
    setSemesterCategories((prev) =>
      prev.map((s) =>
        s.semester === semester ? { ...s, [field]: Number(value) } : s,
      ),
    );
  };

  const fillSampleData = () => {
    const allocateSampleCredits = (total: number): Record<string, number> => {
      const rows = CURRICULUM_STRUCTURE_ROWS.map((item) => {
        const percentage = Number(SAMPLE_CATEGORY_PERCENTAGES[item.code] || 0);
        const raw = (total * percentage) / 100;
        const floorValue = Math.floor(raw);
        return {
          code: item.code,
          raw,
          floorValue,
          fraction: raw - floorValue,
        };
      });

      const allocation = rows.reduce(
        (acc, item) => ({ ...acc, [item.code]: item.floorValue }),
        {} as Record<string, number>,
      );

      let remaining =
        total - Object.values(allocation).reduce((sum, value) => sum + value, 0);

      const sorted = [...rows]
        .filter((item) => item.code !== "MC")
        .sort((left, right) => {
          if (right.fraction === left.fraction) return right.raw - left.raw;
          return right.fraction - left.fraction;
        });

      let index = 0;
      while (remaining > 0 && sorted.length > 0) {
        const target = sorted[index % sorted.length];
        allocation[target.code] = (allocation[target.code] || 0) + 1;
        remaining -= 1;
        index += 1;
      }

      allocation.MC = 0;
      return allocation;
    };

    const buildCategorySampleMetrics = (
      categoryCode: string,
      credits: number,
      courses: number,
    ) => {
      const totalHours = credits * 30;
      const safeCourses = Math.max(0, courses);
      if (categoryCode === "MC") {
        return {
          ...ZEROED_CATEGORY_FIELDS,
          credit: 0,
          hours_total: 0,
        };
      }

      if (categoryCode === "PR") {
        const hours_ci = credits * 4;
        const hours_t = credits * 3;
        const hours_li = credits * 14;
        const hours_twd = totalHours - (hours_ci + hours_t + hours_li);
        return {
          courses_t: 0,
          courses_p: 0,
          courses_tu: 0,
          courses_ll: safeCourses,
          hours_ci,
          hours_t,
          hours_li,
          hours_twd,
          hours_total: totalHours,
          credit: credits,
        };
      }

      if (categoryCode === "SE") {
        const hours_ci = credits * 6;
        const hours_t = credits * 4;
        const hours_li = credits * 14;
        const hours_twd = totalHours - (hours_ci + hours_t + hours_li);
        return {
          courses_t: Math.max(0, Math.round(safeCourses * 0.25)),
          courses_p: 0,
          courses_tu: 0,
          courses_ll: safeCourses,
          hours_ci,
          hours_t,
          hours_li,
          hours_twd,
          hours_total: totalHours,
          credit: credits,
        };
      }

      if (categoryCode === "ES") {
        const hours_ci = credits * 10;
        const hours_t = credits * 10;
        const hours_li = credits * 8;
        const hours_twd = totalHours - (hours_ci + hours_t + hours_li);
        return {
          courses_t: safeCourses,
          courses_p: 0,
          courses_tu: Math.max(0, Math.round(safeCourses * 0.3)),
          courses_ll: Math.max(0, Math.round(safeCourses * 0.4)),
          hours_ci,
          hours_t,
          hours_li,
          hours_twd,
          hours_total: totalHours,
          credit: credits,
        };
      }

      if (categoryCode === "HSS" || categoryCode === "AE" || categoryCode === "OE") {
        const hours_ci = credits * 12;
        const hours_t = credits * 12;
        const hours_li = credits * 6;
        const hours_twd = totalHours - (hours_ci + hours_t + hours_li);
        return {
          courses_t: safeCourses,
          courses_p: 0,
          courses_tu: Math.max(0, Math.round(safeCourses * 0.5)),
          courses_ll: 0,
          hours_ci,
          hours_t,
          hours_li,
          hours_twd,
          hours_total: totalHours,
          credit: credits,
        };
      }

      const hours_ci = credits * 14;
      const hours_t = credits * 10;
      const hours_li = credits * 6;
      const hours_twd = totalHours - (hours_ci + hours_t + hours_li);
      return {
        courses_t: safeCourses,
        courses_p: 0,
        courses_tu: Math.max(0, Math.round(safeCourses * 0.4)),
        courses_ll: 0,
        hours_ci,
        hours_t,
        hours_li,
        hours_twd,
        hours_total: totalHours,
        credit: credits,
      };
    };

    const buildGenericSemesterCounts = (
      semesterLabel: string,
      semesterCount: number,
    ) => {
      const semesterNo = getSemesterNumber(semesterLabel);
      const level = classifySemester(semesterNo, semesterCount);
      const base = {
        courses_bs: 0,
        courses_es: 0,
        courses_hss: 0,
        courses_pc: 0,
        courses_oe: 0,
        courses_mc: 0,
        courses_ae: 0,
        courses_se: 0,
        courses_int: 0,
        courses_pro: 0,
        courses_others: 0,
      };

      if (level === "Foundation") {
        return {
          ...base,
          courses_bs: 2,
          courses_es: 2,
          courses_hss: 1,
          courses_ae: 1,
          courses_mc: semesterNo === 1 ? 1 : 0,
        };
      }

      if (level === "Engineering Base") {
        return {
          ...base,
          courses_bs: 1,
          courses_es: 2,
          courses_hss: 1,
          courses_pc: 2,
          courses_ae: 1,
        };
      }

      if (level === "Professional Core") {
        return {
          ...base,
          courses_es: 1,
          courses_pc: 3,
          courses_se: 1,
          courses_oe: 1,
        };
      }

      if (level === "Specialization") {
        return {
          ...base,
          courses_pc: 2,
          courses_oe: 1,
          courses_others: 1,
          courses_se: 1,
          courses_pro: 1,
        };
      }

      return {
        ...base,
        courses_oe: 1,
        courses_others: 1,
        courses_pro: 2,
        courses_int: 1,
      };
    };

    const semesterCount = semesterLabels.length;
    const baseCredits = Math.floor(SAMPLE_TOTAL_CREDITS / Math.max(1, semesterCount));
    let remainder = SAMPLE_TOTAL_CREDITS - baseCredits * semesterCount;
    const sampleCategoryCredits = allocateSampleCredits(SAMPLE_TOTAL_CREDITS);

    setTotalCredits(String(SAMPLE_TOTAL_CREDITS));
    setTotalCreditsError("");
    setConventionalElective("None");
    setTransDisciplinaryElective("None");
    setGenerationErrors([]);
    setGenerationWarnings([
      "Sample data applied. You can edit table values or generate directly.",
    ]);

    setCategoryCredits((prev) =>
      prev.map((row) => ({
        ...row,
        design_percent: Number(SAMPLE_CATEGORY_PERCENTAGES[row.category_code] || 0),
        ...buildCategorySampleMetrics(
          row.category_code,
          Number(sampleCategoryCredits[row.category_code] || 0),
          Math.max(0, Math.round(Number(sampleCategoryCredits[row.category_code] || 0) / 3)),
        ),
      })),
    );

    setSemesterCategories((prev) =>
      prev.map((row) => {
        const additionalCredit = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        const semIndex = getSemesterNumber(row.semester) - 1;
        const genericCounts = buildGenericSemesterCounts(row.semester, semesterCount);

        let courses_bs = genericCounts.courses_bs;
        let courses_es = genericCounts.courses_es;
        let courses_hss = genericCounts.courses_hss;
        let courses_pc = genericCounts.courses_pc;
        let courses_oe = genericCounts.courses_oe;
        let courses_mc = genericCounts.courses_mc;
        let courses_ae = genericCounts.courses_ae;
        let courses_se = genericCounts.courses_se;
        let courses_int = genericCounts.courses_int;
        let courses_pro = genericCounts.courses_pro;
        let courses_others = genericCounts.courses_others;
        if (semesterCount === 8) {
          if (semIndex === 0) { courses_bs = 3; courses_es = 2; courses_hss = 1; courses_mc = 1; }
          else if (semIndex === 1) { courses_bs = 2; courses_es = 3; courses_hss = 1; courses_ae = 1; }
          else if (semIndex === 2) { courses_bs = 1; courses_pc = 4; courses_hss = 1; }
          else if (semIndex === 3) { courses_pc = 4; courses_ae = 1; courses_int = 1; }
          else if (semIndex === 4) { courses_pc = 4; courses_se = 1; courses_oe = 1; }
          else if (semIndex === 5) { courses_pc = 3; courses_se = 1; courses_oe = 1; }
          else if (semIndex === 6) { courses_oe = 2; courses_pro = 1; courses_mc = 1; }
          else if (semIndex === 7) { courses_oe = 2; courses_pro = 2; }
        } else {
          courses_bs = Math.floor(baseCredits / 6);
          courses_pc = Math.floor(baseCredits / 4);
        }

        return {
          ...row,
          no_of_credits: baseCredits + additionalCredit,
          courses_bs,
          courses_es,
          courses_hss,
          courses_pc,
          courses_oe,
          courses_mc,
          courses_ae,
          courses_se,
          courses_int,
          courses_pro,
          courses_others,
        };
      }),
    );
  };

  const ensureProgramContext = (): boolean => {
    if (!programId) {
      setGenerationErrors(["Program ID is required. Please select a program."]);
      return false;
    }
    if (!programName) {
      setGenerationErrors([
        "Program name could not be resolved. Reload the page or re-select the program.",
      ]);
      return false;
    }
    return true;
  };

  const aiFillAndGenerate = async () => {
    setGenerationErrors([]);
    setGenerationWarnings([]);

    if (!ensureProgramContext()) return;

    let total = Number(totalCredits);
    let categoryPercentages = buildCategoryPercentages();
    const semesterCountsFromTable = buildSemesterCategoryCounts();
    const hasTableSemesterAllocations = semesterCategories.some((row) =>
      SEMESTER_CATEGORY_COLUMNS.some(
        (column) => (Number(row?.[`courses_${column.toLowerCase()}`]) || 0) > 0,
      ),
    );
    let semesterCategoryCounts = hasTableSemesterAllocations
      ? semesterCountsFromTable
      : [];
    const shouldUseSample =
      !Number.isInteger(total) ||
      total <= 0 ||
      !isDesignPercentValid;

    if (shouldUseSample) {
      total = SAMPLE_TOTAL_CREDITS;
      categoryPercentages = {
        BS: SAMPLE_CATEGORY_PERCENTAGES.BS,
        ES: SAMPLE_CATEGORY_PERCENTAGES.ES,
        HSS: SAMPLE_CATEGORY_PERCENTAGES.HSS,
        PC: SAMPLE_CATEGORY_PERCENTAGES.PC,
        PE: SAMPLE_CATEGORY_PERCENTAGES.PE,
        OE: SAMPLE_CATEGORY_PERCENTAGES.OE,
        MC: 0,
        AE: SAMPLE_CATEGORY_PERCENTAGES.AE,
        SE: SAMPLE_CATEGORY_PERCENTAGES.SE,
        PR: SAMPLE_CATEGORY_PERCENTAGES.PR,
      };
      semesterCategoryCounts = [];
      fillSampleData();
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          programName,
          totalCredits: total,
          semesterCount: semesterLabels.length,
          categoryPercentages,
          semesterCategoryCounts,
          enableAiTitles: true,
          strictAcademicFlow: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerationErrors(
          Array.isArray(data.errors)
            ? data.errors
            : [data.error || "AI fill and generation failed."],
        );
        return;
      }

      const logicalIssues = validateGeneratedCurriculum(data.curriculum);
      if (logicalIssues.length > 0) {
        setGenerationErrors(logicalIssues);
        return;
      }

      setGeneratedCurriculum(data.curriculum);
      syncGeneratedData(data.curriculum);
      setGenerationWarnings([
        shouldUseSample
          ? "AI used sample data and filled all semester allocations logically."
          : "AI filled semester allocations from your table values logically.",
        ...(Array.isArray(data.warnings) ? data.warnings : []),
      ]);
    } catch (error: any) {
      setGenerationErrors([error.message || "AI fill and generation failed."]);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCurriculum = async () => {
    setGenerationErrors([]);
    setGenerationWarnings([]);

    if (!ensureProgramContext()) return;

    const total = Number(totalCredits);
    if (!Number.isInteger(total) || total <= 0) {
      setGenerationErrors(["Total credits must be a positive whole number."]);
      return;
    }
    if (!isDesignPercentValid) {
      setGenerationErrors([
        `Category percentage total must be 100. Current total is ${currentDesignPercentTotal.toFixed(
          2,
        )}.`,
      ]);
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          programName,
          totalCredits: total,
          semesterCount: semesterLabels.length,
          categoryPercentages: buildCategoryPercentages(),
          semesterCategoryCounts: buildSemesterCategoryCounts(),
          enableAiTitles: true,
          strictAcademicFlow: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerationErrors(
          Array.isArray(data.errors)
            ? data.errors
            : [data.error || "Curriculum generation failed."],
        );
        return;
      }

      const logicalIssues = validateGeneratedCurriculum(data.curriculum);
      if (logicalIssues.length > 0) {
        setGenerationErrors(logicalIssues);
        return;
      }

      setGeneratedCurriculum(data.curriculum);
      syncGeneratedData(data.curriculum);
      setGenerationWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (error: any) {
      setGenerationErrors([error.message || "Curriculum generation failed."]);
    } finally {
      setIsGenerating(false);
    }
  };

  const createAllSemesters = async () => {
    setGenerationErrors([]);
    setGenerationWarnings([]);

    if (!ensureProgramContext()) return;

    const total = Number(totalCredits);
    if (!Number.isInteger(total) || total <= 0) {
      setGenerationErrors(["Total credits must be a positive whole number."]);
      return;
    }
    if (!isDesignPercentValid) {
      setGenerationErrors([
        `Category percentage total must be 100. Current total is ${currentDesignPercentTotal.toFixed(
          2,
        )}.`,
      ]);
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          programName,
          totalCredits: total,
          semesterCount: semesterLabels.length,
          categoryPercentages: buildCategoryPercentages(),
          semesterCategoryCounts: [],
          enableAiTitles: true,
          strictAcademicFlow: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerationErrors(
          Array.isArray(data.errors)
            ? data.errors
            : [data.error || "Semester structure generation failed."],
        );
        return;
      }

      const logicalIssues = validateGeneratedCurriculum(data.curriculum);
      if (logicalIssues.length > 0) {
        setGenerationErrors(logicalIssues);
        return;
      }

      setGeneratedCurriculum(data.curriculum);
      syncGeneratedData(data.curriculum);
      setGenerationWarnings(
        Array.isArray(data.warnings)
          ? data.warnings
          : [
              "All semesters and subject allocations were created logically using AICTE rules.",
            ],
      );
    } catch (error: any) {
      setGenerationErrors([error.message || "Semester creation failed."]);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSemesterCourses = async () => {
    if (!generatedCurriculum) {
      setGenerationErrors([
        "Generate curriculum first before regenerating a semester.",
      ]);
      return;
    }

    setGenerationErrors([]);
    setGenerationWarnings([]);
    setIsRegenerating(true);

    try {
      const res = await fetch("/api/ai/regenerate-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: Number(regenerateSemester),
          curriculum: generatedCurriculum,
          programId,
          enableAiTitles: true,
          strictAcademicFlow: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerationErrors(
          Array.isArray(data.errors)
            ? data.errors
            : [data.error || "Semester regeneration failed."],
        );
        return;
      }

      const logicalIssues = validateGeneratedCurriculum(data.curriculum);
      if (logicalIssues.length > 0) {
        setGenerationErrors(logicalIssues);
        return;
      }

      setGeneratedCurriculum(data.curriculum);
      syncGeneratedData(data.curriculum);
      setGenerationWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (error: any) {
      setGenerationErrors([error.message || "Semester regeneration failed."]);
    } finally {
      setIsRegenerating(false);
    }
  };

  const saveCurriculum = async () => {
    if (!programId) {
      alert("No Program Selected");
      return;
    }
    if (!isDesignPercentValid) {
      setGenerationErrors([
        `Category percentage total must be exactly 100. Current total is ${currentDesignPercentTotal.toFixed(
          2,
        )}.`,
      ]);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/curriculum/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          categoryCredits,
          electivesSettings: {
            conventional_elective: conventionalElective,
            trans_disciplinary_elective: transDisciplinaryElective,
            total_credits: Number(totalCredits) || 0,
          },
          semesterCategories,
          curriculum: generatedCurriculum,
          strictAcademicFlow: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setGenerationWarnings(data.warnings);
      }
      alert("Curriculum details saved successfully.");
    } catch (e) {
      console.error(e);
      alert("Error saving curriculum details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-2">
          <div>
            <h3 className="text-xl font-semibold">Generate Curriculum Structure</h3>
            <p className="text-sm text-slate-600">
              Curriculum Structure, Learning Hours & Credits
            </p>
          </div>
          <button
            onClick={saveCurriculum}
            disabled={isSaving || !isDesignPercentValid}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Curriculum"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fillSampleData}
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Fill Sample Data
          </button>
          <button
            onClick={aiFillAndGenerate}
            type="button"
            disabled={isGenerating}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isGenerating ? "AI Filling..." : "AI Fill & Generate"}
          </button>
        </div>

        <p className="text-xs font-medium text-slate-600">
          Design percentage total:{" "}
          <span className={isDesignPercentValid ? "text-emerald-700" : "text-red-600"}>
            {currentDesignPercentTotal.toFixed(2)}%
          </span>
        </p>

        {!isDesignPercentValid && (
          <p className="text-xs font-medium text-red-600">
            {designDelta < 0
              ? `Your Design % is over by ${Math.abs(designDelta).toFixed(2)}%. Decrease some categories to reach exactly 100.00%.`
              : `Your Design % is short by ${Math.abs(designDelta).toFixed(2)}%. Increase some categories to reach exactly 100.00%.`} Higher values are allowed while editing.
          </p>
        )}

        {generationErrors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {generationErrors.map((item, index) => (
              <p key={`error-${index}`}>{item}</p>
            ))}
          </div>
        )}

        {generationWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {generationWarnings.map((item, index) => (
              <p key={`warning-${index}`}>{item}</p>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1300px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700">
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                Category
              </th>
              <th
                colSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Typical Credit Range (%)
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Your Design %
              </th>
              <th
                colSpan={4}
                className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Number of Courses
              </th>
              <th
                colSpan={6}
                className="border-b border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Suggested Learning Hours & Credit
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Min
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Max
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                T
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                P
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                TU
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                LL
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                CI
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                T
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                LI
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                TW/D
              </th>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Total
              </th>
              <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {CURRICULUM_STRUCTURE_ROWS.map((row) => {
              const rowData =
                categoryCredits.find((c) => c.category_code === row.code) || {};
              return (
                <tr key={row.code} className="hover:bg-slate-50/50">
                  <td className="border-b border-r border-slate-100 px-3 py-2 font-medium text-slate-700">
                    {row.category}
                  </td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-center text-slate-600">
                    {row.min}
                  </td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-center text-slate-600">
                    {row.max}
                  </td>
                  {CATEGORY_CELL_FIELDS.map((field, cellIndex) => (
                    <td
                      key={`${row.code}-cell-${cellIndex}`}
                      className="border-b border-r border-slate-100 px-2 py-1.5"
                    >
                      {row.code === "MC" && field === "design_percent" ? (
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={0}
                          disabled
                          className="w-full rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-right text-xs text-slate-500 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={rowData[field] || ""}
                          onChange={(e) =>
                            handleCategoryCreditChange(
                              row.code,
                              field,
                              e.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="0"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-3">
          <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Select the type of Elective Category (Conventional)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {CONVENTIONAL_ELECTIVE_OPTIONS.map((option) => {
              const id = `conventional-${option.toLowerCase()}`;
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    id={id}
                    type="radio"
                    name="conventional-elective"
                    value={option}
                    checked={conventionalElective === option}
                    onChange={(event) =>
                      setConventionalElective(event.target.value)
                    }
                    className="h-3.5 w-3.5 accent-slate-900"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-3">
          <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Select the type of Trans-Disciplinary Electives
          </legend>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {TRANS_DISCIPLINARY_OPTIONS.map((option) => {
              const id = `trans-${option
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    id={id}
                    type="radio"
                    name="trans-disciplinary-elective"
                    value={option}
                    checked={transDisciplinaryElective === option}
                    onChange={(event) =>
                      setTransDisciplinaryElective(event.target.value)
                    }
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-slate-900"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="space-y-2">
        <h4 className="text-base font-semibold text-slate-900">
          Select the Semester & Category of Courses
        </h4>
        <div className="max-w-xs">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Total number of Credits
          </label>
          <input
            value={totalCredits}
            onChange={(event) => handleTotalCreditsChange(event.target.value)}
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Whole number"
          />
          {totalCreditsError && (
            <p className="mt-1 text-xs font-medium text-red-600">{totalCreditsError}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700">
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                Semester
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                Semester Level
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-slate-200 px-3 py-3 text-left font-semibold"
              >
                No. of Credits
              </th>
              <th
                colSpan={SEMESTER_CATEGORY_COLUMNS.length + 1}
                className="border-b border-slate-200 px-3 py-3 text-center font-semibold"
              >
                Number of Courses
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-600">
              {SEMESTER_CATEGORY_COLUMNS.map((column) => (
                <th
                  key={column}
                  className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold"
                >
                  {column}
                </th>
              ))}
              <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {semesterLabels.map((semester) => {
              const semData =
                semesterCategories.find((s) => s.semester === semester) || {};
              return (
                <tr key={semester} className="hover:bg-slate-50/50">
                  <td className="border-b border-r border-slate-100 px-3 py-2 font-semibold text-slate-700">
                    {semester}
                  </td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600">
                    {getSemesterLevelLabel(semester)}
                  </td>
                  <td className="border-b border-r border-slate-100 px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={semData.no_of_credits || ""}
                      onChange={(e) =>
                        handleSemesterCategoryChange(
                          semester,
                          "no_of_credits",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      placeholder="0"
                    />
                  </td>
                  {SEMESTER_CATEGORY_COLUMNS.map((column) => {
                    const fieldName = `courses_${column.toLowerCase()}`;
                    return (
                      <td
                        key={`${semester}-${column}`}
                        className="border-b border-r border-slate-100 px-2 py-1.5"
                      >
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={semData[fieldName] || ""}
                          onChange={(e) =>
                            handleSemesterCategoryChange(
                              semester,
                              fieldName,
                              e.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="0"
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-right text-xs font-semibold text-slate-700">
                    {getSemesterCourseTotal(semData)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 text-slate-800">
              <td
                colSpan={2}
                className="border-t border-r border-slate-200 px-3 py-2 text-right font-semibold"
              >
                Total
              </td>
              <td className="border-t border-r border-slate-200 px-2 py-2 text-right font-semibold">
                {semesterCreditTotal}
              </td>
              {SEMESTER_CATEGORY_COLUMNS.map((column) => (
                <td
                  key={`total-${column}`}
                  className="border-t border-r border-slate-200 px-2 py-2 text-right font-semibold"
                >
                  {semesterColumnTotals[column] || 0}
                </td>
              ))}
              <td className="border-t border-slate-200 px-2 py-2 text-right font-semibold">
                {semesterGrandCourseTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <button
          onClick={createAllSemesters}
          disabled={isGenerating || !isDesignPercentValid}
          className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="h-4 w-4" />
          )}
          {isGenerating ? "Creating..." : "Create All Semesters"}
        </button>

        <button
          onClick={generateCurriculum}
          disabled={isGenerating || !isDesignPercentValid}
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="h-4 w-4" />
          )}
          {isGenerating ? "Generating..." : "Generate Curriculum"}
        </button>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Start Semester
          </label>
          <select
            value={regenerateSemester}
            onChange={(event) => setRegenerateSemester(event.target.value)}
            className="h-10 min-w-[160px] rounded-lg border border-slate-300 px-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {semesterLabels.map((semester) => (
              <option key={semester} value={ROMAN_TO_NUMBER[semester]}>
                Semester {semester}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={regenerateSemesterCourses}
          disabled={!generatedCurriculum || isRegenerating}
          className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          {isRegenerating ? "Generating..." : "Generate From Semester"}
        </button>

        <p className="text-xs text-slate-600">
          Fill values in tables, then use Create All Semesters or Generate Curriculum.
          Backend generation applies NEP-2020-first constraints with AICTE and UGC alignment.
        </p>
      </div>

      {generatedCurriculum && (
        <div className="space-y-3">
          <h4 className="text-base font-semibold text-slate-900">
            Generated Curriculum Result
          </h4>
          <div className="space-y-4">
            {generatedCurriculum.semesters.map((semester) => {
              const subCi = semester.courses.reduce(
                (acc, course) => acc + course.tHours,
                0,
              );
              const subT = semester.courses.reduce(
                (acc, course) => acc + course.tuHours,
                0,
              );
              const subLi = semester.courses.reduce(
                (acc, course) => acc + course.llHours,
                0,
              );
              const subTw = semester.courses.reduce(
                (acc, course) => acc + course.twHours,
                0,
              );
              const subTotal = semester.courses.reduce(
                (acc, course) => acc + course.totalHours,
                0,
              );
              const subCredit = semester.courses.reduce(
                (acc, course) => acc + course.credits,
                0,
              );

              return (
                <div
                  key={`generated-semester-${semester.semester}`}
                  className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"
                >
                  <table className="w-full min-w-[1300px] border-collapse text-xs">
                    <thead>
                      <tr>
                        <th
                          colSpan={10}
                          className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-left text-lg font-semibold text-slate-800"
                        >
                          Semester {getSemesterLabelFromNumber(semester.semester)} (
                          {semester.level})
                        </th>
                      </tr>
                      <tr className="bg-slate-50 text-slate-700">
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          No.
                        </th>
                        <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-semibold">
                          Course Title
                        </th>
                        <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-semibold">
                          POs / PSOs
                        </th>
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          CI
                        </th>
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          T
                        </th>
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          LI
                        </th>
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          TW+SL
                        </th>
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          Total
                        </th>
                        <th className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold">
                          Credit
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {semester.courses.map((course, index) => (
                        <tr
                          key={`${course.courseCode}-${course.semester}-${index}`}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {index + 1}
                          </td>
                          <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-700">
                            {course.courseTitle}
                          </td>
                          <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600">
                            {getPoPsoMapping(course.category)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {formatNumeric(course.tHours)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {formatNumeric(course.tuHours)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {formatNumeric(course.llHours)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {formatNumeric(course.twHours)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {formatNumeric(course.totalHours)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center text-slate-700">
                            {formatNumeric(course.credits)}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-3 py-2 font-semibold ${getCategoryColorClass(
                              course.category,
                            )}`}
                          >
                            {getCategoryDisplayLabel(course.category)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50">
                        <td
                          colSpan={3}
                          className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold text-slate-700"
                        >
                          Sub-total
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {formatNumeric(subCi)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {formatNumeric(subT)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {formatNumeric(subLi)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {formatNumeric(subTw)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {formatNumeric(subTotal)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {formatNumeric(subCredit)}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DevelopCurriculumPanel() {
  const headers = ["Semester", "Course Title", "Credits", "Category"];

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Develop Curriculum</h3>
      <p className="text-sm text-slate-600">
        Table opens on the right side. You can fill prescribed format directly
        or use Excel-assisted input.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          Upload Excel (Optional)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="block w-full text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td
                    key={header}
                    className="border-b border-slate-100 px-3 py-2"
                  >
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                      placeholder={header}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionPanel({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-700">
          Record status and communication reference numbers for this process
          step.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Mark In Progress
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Mark Completed
          </button>
        </div>
      </div>
    </div>
  );
}

function SharedForm({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>

      <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Title
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            placeholder="Enter title"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Reference ID
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            placeholder="Enter reference"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Notes
          </label>
          <textarea
            className="min-h-[130px] w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            placeholder="Enter details"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProcessStepPanel({ step }: ProcessStepPanelProps) {
  if (step.key === "council") {
    return <AcademicCouncilForm />;
  }

  if (step.key === "process-1") {
    return <OBEFrameworkForm />;
  }

  if (step.key === "process-3") {
    return <ProgramAdvisoryCommitteeForm />;
  }

  if (step.key === "process-4") {
    return <BoardOfStudiesForm />;
  }

  if (step.key === "process-5") {
    return <RepresentativeStakeholdersForm />;
  }

  if (step.key === "process-6") {
    return <VisionMissionGenerator />;
  }

  if (step.key === "process-7") {
    return <VMPEOFeedbackDashboard />;
  }

  if (step.key === "process-8") {
    return <ConsistencyMatrix />;
  }

  if (step.key === "process-9") {
    return <ProgramOutcomesForm />;
  }

  if (step.key === "process-10") {
    return <PsoGenerator />;
  }

  if (step.key === "process-12") {
    return <CurriculumStructurePanel />;
  }

  if (step.key === "process-13") {
    return <IdentifyOBECoursesPanel />;
  }

  if (step.key === "process-14") {
    return <CourseOutcomesPanel />;
  }

  if (step.key === "process-15") {
    return <DevelopCurriculumPanel />;
  }

  if (step.key === "process-16") {
    return <CurriculumFeedbackPanel />;
  }

  if (step.key === "process-17") {
    return <AccreditationAnalyticsPanel />;
  }

  if (step.key === "process-18") {
    return <AccreditationReportPanel />;
  }

  if (step.kind === "action" || step.kind === "info") {
    return <ActionPanel step={step} />;
  }

  if (
    step.kind === "form" &&
    ![
      "council",
      "process-3",
      "process-4",
      "process-5",
      "process-6",
      "process-7",
      "process-9",
      "process-10",
      "process-12",
      "process-13",
      "process-14",
      "process-15",
      "process-16",
      "process-17",
      "process-18",
    ].includes(step.key)
  ) {
    return <SharedForm step={step} />;
  }

  return <SharedForm step={step} />;
}
