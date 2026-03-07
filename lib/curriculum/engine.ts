export const CATEGORY_CODES = [
  "BS",
  "ES",
  "HSS",
  "PC",
  "PE",
  "OE",
  "MC",
  "AE",
  "SE",
  "PR",
] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];
export type CurriculumMode = "AICTE_MODEL" | "INDUSTRY_ALIGNED" | "RESEARCH_UNIVERSITY";

type SemesterLevel =
  | "Foundation"
  | "Engineering Base"
  | "Professional Core"
  | "Specialization"
  | "Capstone";

export interface SemesterCategoryCountInput {
  semester: number;
  counts: Partial<Record<CategoryCode, number>>;
}

export interface GeneratedCourse {
  semester: number;
  category: CategoryCode;
  courseCode: string;
  courseTitle: string;
  prerequisites?: string[];
  tHours: number;
  tuHours: number;
  llHours: number;
  twHours: number;
  totalHours: number;
  learningHours?: number;
  credits: number;
}

export interface GeneratedSemester {
  semester: number;
  level: SemesterLevel;
  totalCredits: number;
  categoryCourseCounts: Record<CategoryCode, number>;
  courses: GeneratedCourse[];
}

export interface CategorySummary {
  categoryCode: CategoryCode;
  percentage: number;
  credits: number;
  numCourses: number;
  coursesT: number;
  coursesP: number;
  coursesTU: number;
  coursesLL: number;
  hoursCI: number;
  hoursT: number;
  hoursLI: number;
  hoursTWD: number;
  hoursTotal: number;
}

export interface GeneratedCurriculum {
  programName: string;
  totalCredits: number;
  semesterCount: number;
  mode: CurriculumMode;
  generatedAt: string;
  categorySummary: CategorySummary[];
  semesters: GeneratedSemester[];
}

interface BuildCurriculumInput {
  programName: string;
  totalCredits: number;
  semesterCount?: number;
  mode?: CurriculumMode;
  categoryPercentages?: Partial<Record<CategoryCode, number>>;
  semesterCategoryCounts?: SemesterCategoryCountInput[];
}

interface BuildCurriculumResult {
  curriculum: GeneratedCurriculum | null;
  errors: string[];
  warnings: string[];
}

type ProgramTrack = "CSE" | "ECE" | "EEE" | "MECH" | "CIVIL" | "GENERIC";

const DEFAULT_CATEGORY_PERCENTAGES: Record<CategoryCode, number> = {
  BS: 22,
  ES: 18,
  HSS: 12,
  PC: 28,
  PE: 8,
  OE: 5,
  MC: 0,
  AE: 3,
  SE: 2,
  PR: 2,
};

const CATEGORY_LEVEL_WEIGHTS: Record<CategoryCode, Record<SemesterLevel, number>> = {
  BS: {
    Foundation: 5,
    "Engineering Base": 3,
    "Professional Core": 0,
    Specialization: 0,
    Capstone: 0,
  },
  ES: {
    Foundation: 4,
    "Engineering Base": 4,
    "Professional Core": 1,
    Specialization: 0,
    Capstone: 0,
  },
  HSS: {
    Foundation: 3,
    "Engineering Base": 2,
    "Professional Core": 1,
    Specialization: 0,
    Capstone: 0,
  },
  PC: {
    Foundation: 0,
    "Engineering Base": 3,
    "Professional Core": 6,
    Specialization: 2,
    Capstone: 0,
  },
  PE: {
    Foundation: 0,
    "Engineering Base": 0,
    "Professional Core": 2,
    Specialization: 5,
    Capstone: 1,
  },
  OE: {
    Foundation: 0,
    "Engineering Base": 0,
    "Professional Core": 2,
    Specialization: 4,
    Capstone: 1,
  },
  MC: {
    Foundation: 0,
    "Engineering Base": 0,
    "Professional Core": 0,
    Specialization: 0,
    Capstone: 0,
  },
  AE: {
    Foundation: 3,
    "Engineering Base": 2,
    "Professional Core": 1,
    Specialization: 0,
    Capstone: 0,
  },
  SE: {
    Foundation: 0,
    "Engineering Base": 2,
    "Professional Core": 3,
    Specialization: 2,
    Capstone: 0,
  },
  PR: {
    Foundation: 0,
    "Engineering Base": 0,
    "Professional Core": 0,
    Specialization: 3,
    Capstone: 8,
  },
};

const CATEGORY_TITLE_LIBRARY: Record<CategoryCode, string[]> = {
  BS: [
    "Engineering Mathematics I",
    "Engineering Mathematics II",
    "Linear Algebra and Calculus",
    "Engineering Physics",
    "Engineering Chemistry",
    "Probability and Statistics",
    "Applied Numerical Methods",
    "Discrete Mathematics",
    "Computational Mathematics",
    "Data Science Mathematics",
  ],
  ES: [
    "Programming Fundamentals",
    "Engineering Graphics",
    "Basic Electrical and Electronics Engineering",
    "Engineering Workshop",
    "Digital Logic Design",
    "Data Structures",
    "Computer Organization",
    "Object Oriented Programming",
    "Signals and Systems",
    "Embedded Systems Basics",
  ],
  HSS: [
    "Technical Communication",
    "Professional Ethics and Human Values",
    "Constitution of India",
    "Environmental Science",
    "Economics for Engineers",
    "Psychology for Engineers",
    "Sociology and Sustainable Development",
    "Research Writing and Presentation",
  ],
  PC: [
    "Design and Analysis of Algorithms",
    "Database Management Systems",
    "Operating Systems",
    "Computer Networks",
    "Software Engineering",
    "Theory of Computation",
    "Compiler Design",
    "Distributed Systems",
    "Web Technologies",
    "Information Security",
  ],
  PE: [
    "Artificial Intelligence",
    "Machine Learning",
    "Cloud Computing",
    "Cyber Security",
    "Blockchain Technologies",
    "Internet of Things",
    "Natural Language Processing",
    "Computer Vision",
    "Data Engineering",
    "Generative AI Systems",
  ],
  OE: [
    "Design Thinking and Innovation",
    "Entrepreneurship and Startup Management",
    "Digital Marketing",
    "Financial Literacy for Engineers",
    "Public Policy and Technology",
    "Green Technology and Climate Action",
    "Introduction to Psychology",
    "Management Principles",
    "Indian Knowledge Systems",
    "Sustainable Smart Cities",
  ],
  MC: [],
  AE: [
    "Communication Skills Lab",
    "Critical Thinking and Problem Solving",
    "Professional Writing",
    "Life Skills and Leadership",
    "Quantitative Aptitude",
    "Career Readiness",
  ],
  SE: [
    "Full Stack Development Lab",
    "Mobile Application Development Lab",
    "DevOps and Automation Lab",
    "Data Analytics Practice",
    "IoT and Sensor Systems Lab",
    "UI/UX Prototyping Studio",
  ],
  PR: [
    "Mini Project",
    "Industry Internship",
    "Capstone Project Phase I",
    "Capstone Project Phase II",
    "Innovation and Prototype Lab",
    "Research Project",
  ],
};

const PROGRAM_TRACK_TITLE_LIBRARY: Record<
  ProgramTrack,
  Partial<Record<CategoryCode, string[]>>
> = {
  CSE: {
    ES: [
      "Programming Fundamentals",
      "Data Structures",
      "Digital Logic Design",
      "Computer Organization",
      "Object Oriented Programming",
      "Software Tools and Practices",
      "Web Programming Basics",
      "Operating System Concepts",
    ],
    PC: [
      "Database Management Systems",
      "Operating Systems",
      "Computer Networks",
      "Design and Analysis of Algorithms",
      "Software Engineering",
      "Theory of Computation",
      "Compiler Design",
      "Information Security",
      "Distributed Systems",
      "Web Technologies",
    ],
    PE: [
      "Artificial Intelligence",
      "Machine Learning",
      "Cloud Computing",
      "Cyber Security",
      "Natural Language Processing",
      "Computer Vision",
      "Big Data Analytics",
      "Blockchain Technologies",
    ],
    SE: [
      "Full Stack Development Lab",
      "DevOps and Automation Lab",
      "Mobile Application Development Lab",
      "Data Analytics Practice",
      "Cyber Security Practice Lab",
    ],
  },
  ECE: {
    ES: [
      "Basic Electronics Engineering",
      "Circuit Theory",
      "Signals and Systems",
      "Electronic Devices",
      "Digital Electronics",
      "Microprocessor Fundamentals",
      "Analog Circuits",
      "Communication Fundamentals",
    ],
    PC: [
      "Analog Communication",
      "Digital Communication",
      "Microcontrollers and Interfacing",
      "VLSI Design",
      "Electromagnetic Theory",
      "Control Systems",
      "Digital Signal Processing",
      "Embedded Systems",
      "Antenna and Wave Propagation",
    ],
    PE: [
      "Wireless Communication",
      "IoT Systems",
      "5G Communication Technologies",
      "Advanced VLSI",
      "RF Circuit Design",
      "Image and Video Processing",
      "Satellite Communication",
    ],
    SE: [
      "Embedded Systems Lab",
      "VLSI Design Lab",
      "DSP Applications Lab",
      "Communication Systems Lab",
      "IoT Prototyping Lab",
    ],
  },
  EEE: {
    ES: [
      "Basic Electrical Engineering",
      "Electrical Circuits",
      "Electromagnetic Fields",
      "Electrical Machines I",
      "Power Systems Basics",
      "Control Engineering Fundamentals",
      "Power Electronics",
      "Measurements and Instrumentation",
    ],
    PC: [
      "Electrical Machines II",
      "Power System Analysis",
      "Control Systems",
      "Power Electronics and Drives",
      "Switchgear and Protection",
      "Renewable Energy Systems",
      "Industrial Automation",
      "High Voltage Engineering",
    ],
    PE: [
      "Smart Grid Technologies",
      "Electric Vehicle Systems",
      "Advanced Power Electronics",
      "Energy Storage Systems",
      "Industrial IoT for Electrical Systems",
      "Modern Control Applications",
    ],
    SE: [
      "Electrical Machines Lab",
      "Power Electronics Lab",
      "Control Systems Lab",
      "Electrical Drives Lab",
      "Power System Simulation Lab",
    ],
  },
  MECH: {
    ES: [
      "Engineering Mechanics",
      "Engineering Thermodynamics",
      "Manufacturing Processes",
      "Fluid Mechanics",
      "Strength of Materials",
      "Material Science for Mechanical Engineers",
      "Kinematics of Machines",
      "Thermal Engineering Basics",
    ],
    PC: [
      "Machine Design",
      "Heat Transfer",
      "Dynamics of Machinery",
      "Manufacturing Technology",
      "Refrigeration and Air Conditioning",
      "Finite Element Methods",
      "Automobile Engineering",
      "Industrial Engineering",
    ],
    PE: [
      "CAD/CAM",
      "Robotics and Automation",
      "Additive Manufacturing",
      "Advanced Thermal Systems",
      "Computational Fluid Dynamics",
      "Mechatronics",
    ],
    SE: [
      "Manufacturing Lab",
      "Thermal Engineering Lab",
      "CAD/CAM Lab",
      "Automobile Systems Lab",
      "Robotics Practice Lab",
    ],
  },
  CIVIL: {
    ES: [
      "Engineering Geology",
      "Surveying",
      "Building Materials",
      "Fluid Mechanics for Civil Engineering",
      "Strength of Materials",
      "Environmental Engineering Fundamentals",
      "Transportation Engineering Basics",
      "Construction Practices",
    ],
    PC: [
      "Structural Analysis",
      "Design of Reinforced Concrete Structures",
      "Geotechnical Engineering",
      "Water Resources Engineering",
      "Transportation Engineering",
      "Construction Planning and Management",
      "Environmental Engineering",
      "Foundation Engineering",
    ],
    PE: [
      "Earthquake Engineering",
      "Advanced Concrete Technology",
      "Urban Infrastructure Planning",
      "Smart and Sustainable Cities",
      "Remote Sensing and GIS",
      "Advanced Geotechnical Engineering",
    ],
    SE: [
      "Surveying Lab",
      "Concrete Technology Lab",
      "Geotechnical Lab",
      "Environmental Engineering Lab",
      "Structural Design Studio",
    ],
  },
  GENERIC: {},
};

export function normalizeCourseTitle(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFallbackTitle(input: {
  programName: string;
  mode?: CurriculumMode;
  category: CategoryCode;
  semester: number;
  usedTitles?: Set<string>;
}): string {
  const categoryTitles = getCategoryTitlePool(input.programName, input.category);
  const baseName =
    categoryTitles[(Math.max(1, input.semester) - 1) % Math.max(1, categoryTitles.length)] ||
    `${input.category} Course`;

  const usedTitles = input.usedTitles;
  let candidate = baseName;
  if (!usedTitles) return candidate;

  let index = 1;
  while (usedTitles.has(normalizeCourseTitle(candidate))) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }

  usedTitles.add(normalizeCourseTitle(candidate));
  return candidate;
}

function getCategoryTitlePool(programName: string, category: CategoryCode): string[] {
  const track = detectProgramTrack(programName);
  const trackTitles = PROGRAM_TRACK_TITLE_LIBRARY[track]?.[category];
  if (trackTitles && trackTitles.length > 0) return trackTitles;
  return CATEGORY_TITLE_LIBRARY[category] || [];
}

function detectProgramTrack(programName: string): ProgramTrack {
  const normalized = String(programName || "").toUpperCase();
  if (
    normalized.includes("COMPUTER") ||
    normalized.includes("CSE") ||
    normalized.includes("INFORMATION TECHNOLOGY") ||
    normalized.includes("DATA SCIENCE") ||
    normalized.includes("AI")
  ) {
    return "CSE";
  }
  if (normalized.includes("ELECTRONICS") || normalized.includes("ECE")) {
    return "ECE";
  }
  if (
    normalized.includes("ELECTRICAL") ||
    normalized.includes("EEE") ||
    normalized.includes("POWER SYSTEM")
  ) {
    return "EEE";
  }
  if (normalized.includes("MECHANICAL") || normalized.includes("MECH")) {
    return "MECH";
  }
  if (normalized.includes("CIVIL")) {
    return "CIVIL";
  }
  return "GENERIC";
}

export function validateSemesterRegenerationRules(
  semester: number,
  counts: Record<CategoryCode, number>,
  semesterCount: number,
): string[] {
  const warnings: string[] = [];
  const level = classifySemester(semester, semesterCount);

  if (semester <= 2 && (counts.PE > 0 || counts.PR > 0)) {
    warnings.push(
      `Semester ${semester} is ${level}; PE/PR allocations were requested early. Review for NEP progression compliance.`,
    );
  }

  if (semester >= Math.max(semesterCount - 1, 1) && counts.PR <= 0) {
    warnings.push(
      `Semester ${semester} is near completion stage; consider adding Project/Internship (PR) credits.`,
    );
  }

  if (counts.MC > 0) {
    warnings.push(
      `Semester ${semester} includes MC courses in generated counts. MC is forced to 0 in this design workflow.`,
    );
  }

  return warnings;
}

export function buildCurriculum(input: BuildCurriculumInput): BuildCurriculumResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const programName = String(input.programName || "").trim();
  const totalCredits = Math.floor(Number(input.totalCredits || 0));
  const semesterCount = sanitizeSemesterCount(input.semesterCount);
  const mode: CurriculumMode = input.mode || "AICTE_MODEL";

  if (!programName) {
    errors.push("programName is required.");
    return { curriculum: null, errors, warnings };
  }

  if (!Number.isInteger(totalCredits) || totalCredits <= 0) {
    errors.push("totalCredits must be a positive whole number.");
    return { curriculum: null, errors, warnings };
  }

  const normalizedPercentages = normalizeCategoryPercentages(
    input.categoryPercentages,
    warnings,
  );
  const percentageTotal = getPercentageTotal(normalizedPercentages);
  if (Math.abs(percentageTotal - 100) > 0.01) {
    errors.push(
      `Category percentage total must be exactly 100. Current total is ${percentageTotal.toFixed(2)}.`,
    );
    return { curriculum: null, errors, warnings };
  }

  const categoryCredits = allocateCategoryCredits(normalizedPercentages, totalCredits);

  const categoryCourseCredits: Record<CategoryCode, number[]> = {
    BS: buildCourseCredits(categoryCredits.BS),
    ES: buildCourseCredits(categoryCredits.ES),
    HSS: buildCourseCredits(categoryCredits.HSS),
    PC: buildCourseCredits(categoryCredits.PC),
    PE: buildCourseCredits(categoryCredits.PE),
    OE: buildCourseCredits(categoryCredits.OE),
    MC: [],
    AE: buildCourseCredits(categoryCredits.AE),
    SE: buildCourseCredits(categoryCredits.SE),
    PR: buildCourseCredits(categoryCredits.PR),
  };

  const semesterCategoryCounts = normalizeSemesterCounts({
    semesterCount,
    providedCounts: input.semesterCategoryCounts || [],
    categoryCourseCredits,
    warnings,
  });

  const semesters: GeneratedSemester[] = Array.from({ length: semesterCount }, (_, index) => {
    const semesterNo = index + 1;
    return {
      semester: semesterNo,
      level: classifySemester(semesterNo, semesterCount),
      totalCredits: 0,
      categoryCourseCounts: createEmptyCategoryCounts(),
      courses: [],
    };
  });

  const usedTitles = new Set<string>();
  const semesterCourseSequence: number[] = Array.from({ length: semesterCount }, () => 0);

  for (const category of CATEGORY_CODES) {
    if (category === "MC") {
      for (let semIndex = 0; semIndex < semesterCount; semIndex += 1) {
        semesters[semIndex].categoryCourseCounts.MC = 0;
      }
      continue;
    }

    const creditPool = [...categoryCourseCredits[category]];

    for (let semIndex = 0; semIndex < semesterCount; semIndex += 1) {
      const semesterNo = semIndex + 1;
      const expectedCount = semesterCategoryCounts[semIndex][category];
      semesters[semIndex].categoryCourseCounts[category] = expectedCount;

      for (let item = 0; item < expectedCount; item += 1) {
        const courseCredits = creditPool.shift();
        if (!courseCredits) {
          warnings.push(
            `Insufficient ${category} credit pool while assigning semester ${semesterNo}; allocation was automatically trimmed.`,
          );
          semesters[semIndex].categoryCourseCounts[category] = item;
          break;
        }

        semesterCourseSequence[semIndex] += 1;
        const title = buildFallbackTitle({
          programName,
          mode,
          category,
          semester: semesterNo,
          usedTitles,
        });

        const hourBreakdown = buildHourBreakdown(category, courseCredits);

        semesters[semIndex].courses.push({
          semester: semesterNo,
          category,
          courseCode: buildCourseCode(
            programName,
            semesterNo,
            category,
            semesterCourseSequence[semIndex],
          ),
          courseTitle: title,
          prerequisites: [],
          tHours: hourBreakdown.ci,
          tuHours: hourBreakdown.tutorial,
          llHours: hourBreakdown.lab,
          twHours: hourBreakdown.teamwork,
          totalHours: hourBreakdown.total,
          learningHours: hourBreakdown.total,
          credits: courseCredits,
        });
      }
    }

    if (creditPool.length > 0) {
      warnings.push(
        `${category} allocation left ${creditPool.length} unassigned courses. They were placed in latest valid semesters.`,
      );
      for (const courseCredits of creditPool) {
        const fallbackSemester = pickFallbackSemesterForCategory(category, semesterCount);
        const semIndex = fallbackSemester - 1;
        semesterCourseSequence[semIndex] += 1;
        semesters[semIndex].categoryCourseCounts[category] += 1;

        const title = buildFallbackTitle({
          programName,
          mode,
          category,
          semester: fallbackSemester,
          usedTitles,
        });

        const hourBreakdown = buildHourBreakdown(category, courseCredits);

        semesters[semIndex].courses.push({
          semester: fallbackSemester,
          category,
          courseCode: buildCourseCode(
            programName,
            fallbackSemester,
            category,
            semesterCourseSequence[semIndex],
          ),
          courseTitle: title,
          prerequisites: [],
          tHours: hourBreakdown.ci,
          tuHours: hourBreakdown.tutorial,
          llHours: hourBreakdown.lab,
          twHours: hourBreakdown.teamwork,
          totalHours: hourBreakdown.total,
          learningHours: hourBreakdown.total,
          credits: courseCredits,
        });
      }
    }
  }

  for (const semester of semesters) {
    semester.courses.sort((left, right) => {
      const categoryDelta = CATEGORY_CODES.indexOf(left.category) - CATEGORY_CODES.indexOf(right.category);
      if (categoryDelta !== 0) return categoryDelta;
      return left.courseTitle.localeCompare(right.courseTitle);
    });

    semester.courses = semester.courses.map((course, index) => ({
      ...course,
      courseCode: buildCourseCode(programName, semester.semester, course.category, index + 1),
    }));

    semester.totalCredits = semester.courses.reduce((sum, course) => sum + course.credits, 0);
  }

  warnings.push(...validateSemesterLoad(semesters, totalCredits));

  const generatedTotal = semesters.reduce((sum, semester) => sum + semester.totalCredits, 0);
  if (generatedTotal !== totalCredits) {
    errors.push(
      `Generated curriculum credits (${generatedTotal}) do not match requested total (${totalCredits}).`,
    );
    return { curriculum: null, errors, warnings };
  }

  const categorySummary = buildCategorySummary(semesters, totalCredits);

  const curriculum: GeneratedCurriculum = {
    programName,
    totalCredits,
    semesterCount,
    mode,
    generatedAt: new Date().toISOString(),
    categorySummary,
    semesters,
  };

  return {
    curriculum,
    errors,
    warnings,
  };
}

function sanitizeSemesterCount(semesterCount?: number): number {
  const parsed = Math.floor(Number(semesterCount || 0));
  if (!Number.isFinite(parsed) || parsed <= 0) return 8;
  return Math.min(12, Math.max(2, parsed));
}

function normalizeCategoryPercentages(
  percentages: Partial<Record<CategoryCode, number>> | undefined,
  warnings: string[],
): Record<CategoryCode, number> {
  const hasInput =
    !!percentages &&
    CATEGORY_CODES.some(
      (category) => category !== "MC" && Number.isFinite(Number(percentages[category])),
    );

  const base = hasInput ? createEmptyCategoryPercentages() : { ...DEFAULT_CATEGORY_PERCENTAGES };

  if (!hasInput) {
    warnings.push(
      "No category percentages supplied. Default AICTE-aligned distribution was applied.",
    );
  }

  if (percentages) {
    for (const category of CATEGORY_CODES) {
      const value = Number(percentages[category]);
      if (!Number.isFinite(value)) continue;
      if (category === "MC") continue;
      base[category] = Math.max(0, Number(value.toFixed(2)));
    }
  }

  if (Number(percentages?.MC || 0) !== 0) {
    warnings.push("Audit / Mandatory Courses (MC) is forced to 0 in this design section.");
  }

  base.MC = 0;
  return base;
}

function createEmptyCategoryPercentages(): Record<CategoryCode, number> {
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

function getPercentageTotal(percentages: Record<CategoryCode, number>): number {
  return CATEGORY_CODES.reduce((sum, category) => {
    if (category === "MC") return sum;
    return sum + (Number(percentages[category]) || 0);
  }, 0);
}

function allocateCategoryCredits(
  percentages: Record<CategoryCode, number>,
  totalCredits: number,
): Record<CategoryCode, number> {
  const allocated = createEmptyCategoryPercentages();

  const rawEntries = CATEGORY_CODES.map((category) => {
    const raw = category === "MC" ? 0 : (percentages[category] / 100) * totalCredits;
    const floorValue = Math.floor(raw);
    allocated[category] = floorValue;
    return {
      category,
      raw,
      fraction: raw - floorValue,
    };
  });

  let remaining = totalCredits - CATEGORY_CODES.reduce((sum, category) => sum + allocated[category], 0);

  if (remaining > 0) {
    const ordered = rawEntries
      .filter((entry) => entry.category !== "MC")
      .sort((left, right) => {
        if (right.fraction === left.fraction) {
          return right.raw - left.raw;
        }
        return right.fraction - left.fraction;
      });

    for (let index = 0; index < remaining; index += 1) {
      const target = ordered[index % ordered.length]?.category;
      if (!target) continue;
      allocated[target] += 1;
    }
  }

  allocated.MC = 0;
  return allocated;
}

function buildCourseCredits(totalCategoryCredits: number): number[] {
  const total = Math.max(0, Math.floor(totalCategoryCredits));
  if (total === 0) return [];

  let courseCount = Math.max(1, Math.round(total / 3));

  while (courseCount > 1 && total < courseCount * 2) {
    courseCount -= 1;
  }

  while (total > courseCount * 4) {
    courseCount += 1;
  }

  const base = Math.floor(total / courseCount);
  let remainder = total - base * courseCount;

  const output: number[] = Array.from({ length: courseCount }, () => base);
  for (let index = 0; index < output.length && remainder > 0; index += 1) {
    output[index] += 1;
    remainder -= 1;
  }

  return output.sort((left, right) => right - left);
}

function normalizeSemesterCounts(input: {
  semesterCount: number;
  providedCounts: SemesterCategoryCountInput[];
  categoryCourseCredits: Record<CategoryCode, number[]>;
  warnings: string[];
}): Record<CategoryCode, number>[] {
  const { semesterCount, providedCounts, categoryCourseCredits, warnings } = input;

  const matrix: Record<CategoryCode, number>[] = Array.from({ length: semesterCount }, () =>
    createEmptyCategoryCounts(),
  );

  const providedMatrix: Array<Partial<Record<CategoryCode, number>>> = Array.from(
    { length: semesterCount },
    () => ({}),
  );

  for (const row of providedCounts) {
    const semester = Math.floor(Number(row?.semester || 0));
    if (semester < 1 || semester > semesterCount) continue;

    for (const category of CATEGORY_CODES) {
      const value = Math.floor(Number(row?.counts?.[category] || 0));
      if (!Number.isFinite(value) || value <= 0) continue;
      if (category === "MC") continue;
      const previous = Number(providedMatrix[semester - 1][category] || 0);
      providedMatrix[semester - 1][category] = previous + value;
    }
  }

  for (const category of CATEGORY_CODES) {
    if (category === "MC") continue;

    const requiredTotal = categoryCourseCredits[category].length;
    if (requiredTotal <= 0) {
      for (let semIndex = 0; semIndex < semesterCount; semIndex += 1) {
        matrix[semIndex][category] = 0;
      }
      continue;
    }

    const providedWeights = providedMatrix.map((row, semIndex) => {
      const raw = Number(row[category] || 0);
      if (raw <= 0) return 0;
      const level = classifySemester(semIndex + 1, semesterCount);
      const semesterNumber = semIndex + 1;

      if ((category === "PE" || category === "OE") && semesterNumber <= 4) {
        warnings.push(
          `${category} allocation in semester ${semesterNumber} was moved because electives are allowed only after semester 4.`,
        );
        return 0;
      }

      if (category === "PR" && semesterNumber < 4) {
        warnings.push(
          `PR allocation in semester ${semesterNumber} was moved because internship/project starts from semester 4.`,
        );
        return 0;
      }
      if (category === "PR" && semesterNumber >= 4) {
        return raw;
      }

      if (!isCategoryAllowedInLevel(category, level)) {
        warnings.push(
          `${category} allocation in semester ${semesterNumber} was moved to a valid semester level.`,
        );
        return 0;
      }
      return raw;
    });

    const hasProvidedWeights = providedWeights.some((value) => value > 0);

    const finalCounts = hasProvidedWeights
      ? distributeIntegerByWeights(requiredTotal, providedWeights)
      : autoDistributeByLevel(category, requiredTotal, semesterCount);

    for (let semIndex = 0; semIndex < semesterCount; semIndex += 1) {
      matrix[semIndex][category] = finalCounts[semIndex] || 0;
    }
  }

  for (let semIndex = 0; semIndex < semesterCount; semIndex += 1) {
    matrix[semIndex].MC = 0;
  }

  return matrix;
}

function autoDistributeByLevel(
  category: CategoryCode,
  requiredTotal: number,
  semesterCount: number,
): number[] {
  const weights: number[] = [];
  for (let sem = 1; sem <= semesterCount; sem += 1) {
    const level = classifySemester(sem, semesterCount);
    const baseWeight = CATEGORY_LEVEL_WEIGHTS[category][level] || 0;

    if ((category === "PE" || category === "OE") && sem <= 4) {
      weights.push(0);
      continue;
    }

    if (category === "PR" && sem < 4) {
      weights.push(0);
      continue;
    }

    if (category === "PR" && sem === semesterCount) {
      weights.push(baseWeight + 6);
      continue;
    }

    if (category === "PR" && (sem === 4 || sem === 6)) {
      weights.push(baseWeight + 2);
      continue;
    }

    if (category === "BS" && sem <= 2) {
      weights.push(baseWeight + 1);
      continue;
    }

    weights.push(baseWeight);
  }

  return distributeIntegerByWeights(requiredTotal, weights);
}

function distributeIntegerByWeights(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const sanitized = weights.map((weight) => (weight > 0 ? weight : 0));
  const weightSum = sanitized.reduce((sum, value) => sum + value, 0);

  if (weightSum <= 0) {
    const evenWeights = Array.from({ length: weights.length }, () => 1);
    return distributeIntegerByWeights(total, evenWeights);
  }

  const result = sanitized.map((weight) => Math.floor((weight / weightSum) * total));
  let assigned = result.reduce((sum, value) => sum + value, 0);

  if (assigned < total) {
    const remainders = sanitized
      .map((weight, index) => ({
        index,
        remainder: (weight / weightSum) * total - result[index],
      }))
      .sort((left, right) => right.remainder - left.remainder);

    let pointer = 0;
    while (assigned < total) {
      const target = remainders[pointer % remainders.length];
      result[target.index] += 1;
      assigned += 1;
      pointer += 1;
    }
  }

  return result;
}

function classifySemester(semesterNumber: number, semesterCount: number): SemesterLevel {
  if (semesterNumber <= 0) return "Foundation";
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

function isCategoryAllowedInLevel(category: CategoryCode, level: SemesterLevel): boolean {
  return (CATEGORY_LEVEL_WEIGHTS[category][level] || 0) > 0;
}

function createEmptyCategoryCounts(): Record<CategoryCode, number> {
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

function buildCourseCode(
  programName: string,
  semester: number,
  category: CategoryCode,
  index: number,
): string {
  const tag = buildProgramTag(programName);
  const sem = String(Math.max(1, semester)).padStart(2, "0");
  const seq = String(Math.max(1, index)).padStart(2, "0");
  return `${tag}${sem}${category}${seq}`;
}

function buildProgramTag(programName: string): string {
  const normalized = programName.toUpperCase();
  if (normalized.includes("COMPUTER") && normalized.includes("SCIENCE")) return "CSE";
  if (normalized.includes("ELECTRONICS") && normalized.includes("COMMUNICATION")) {
    return "ECE";
  }
  if (normalized.includes("MECHANICAL")) return "MEC";
  if (normalized.includes("CIVIL")) return "CIV";

  const tokens = normalized
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && token !== "B" && token !== "TECH");

  const initials = tokens.slice(0, 3).map((token) => token[0]).join("");
  if (initials.length >= 2) return initials.padEnd(3, initials[initials.length - 1]);

  return "PRG";
}

function buildHourBreakdown(
  category: CategoryCode,
  credits: number,
): { ci: number; tutorial: number; lab: number; teamwork: number; total: number } {
  const total = Math.max(0, Math.floor(credits) * 30);

  if (total === 0) {
    return { ci: 0, tutorial: 0, lab: 0, teamwork: 0, total: 0 };
  }

  if (category === "HSS" || category === "AE" || category === "OE") {
    const ci = Math.min(total, roundToNearest15(total * 0.7));
    const tutorial = Math.min(total - ci, roundToNearest15(total * 0.2));
    const lab = 0;
    const teamwork = Math.max(0, total - ci - tutorial - lab);
    return { ci, tutorial, lab, teamwork, total };
  }

  if (category === "PR") {
    const ci = Math.min(total, roundToNearest15(total * 0.2));
    const tutorial = 0;
    const lab = Math.min(total - ci, roundToNearest15(total * 0.4));
    const teamwork = Math.max(0, total - ci - tutorial - lab);
    return { ci, tutorial, lab, teamwork, total };
  }

  if (category === "SE") {
    const ci = Math.min(total, roundToNearest15(total * 0.4));
    const tutorial = Math.min(total - ci, roundToNearest15(total * 0.1));
    const lab = Math.min(total - ci - tutorial, roundToNearest15(total * 0.35));
    const teamwork = Math.max(0, total - ci - tutorial - lab);
    return { ci, tutorial, lab, teamwork, total };
  }

  if (category === "PE") {
    const ci = Math.min(total, roundToNearest15(total * 0.55));
    const tutorial = Math.min(total - ci, roundToNearest15(total * 0.15));
    const lab = Math.min(total - ci - tutorial, roundToNearest15(total * 0.2));
    const teamwork = Math.max(0, total - ci - tutorial - lab);
    return { ci, tutorial, lab, teamwork, total };
  }

  const ci = Math.min(total, roundToNearest15(total * 0.5));
  const tutorial = Math.min(total - ci, roundToNearest15(total * 0.15));
  const lab = Math.min(total - ci - tutorial, roundToNearest15(total * 0.25));
  const teamwork = Math.max(0, total - ci - tutorial - lab);
  return { ci, tutorial, lab, teamwork, total };
}

function roundToNearest15(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 15) * 15;
}

function pickFallbackSemesterForCategory(category: CategoryCode, semesterCount: number): number {
  for (let sem = semesterCount; sem >= 1; sem -= 1) {
    const level = classifySemester(sem, semesterCount);
    if (isCategoryAllowedInLevel(category, level)) return sem;
  }
  return semesterCount;
}

function validateSemesterLoad(
  semesters: GeneratedSemester[],
  totalCredits: number,
): string[] {
  const warnings: string[] = [];
  if (semesters.length === 0) return warnings;

  const idealLoad = totalCredits / semesters.length;
  for (const semester of semesters) {
    const delta = semester.totalCredits - idealLoad;
    if (Math.abs(delta) > 6) {
      warnings.push(
        `Semester ${semester.semester} has ${semester.totalCredits} credits; rebalance may be needed around ideal ${idealLoad.toFixed(1)} credits.`,
      );
    }
  }

  const lastSemester = semesters[semesters.length - 1];
  if ((lastSemester?.categoryCourseCounts.PR || 0) <= 0) {
    warnings.push(
      "Final semester has no Project/Internship (PR) course allocation. Consider adding capstone activity.",
    );
  }

  return warnings;
}

function buildCategorySummary(
  semesters: GeneratedSemester[],
  totalCredits: number,
): CategorySummary[] {
  return CATEGORY_CODES.map((categoryCode) => {
    const courses = semesters.flatMap((semester) =>
      semester.courses.filter((course) => course.category === categoryCode),
    );

    const credits = courses.reduce((sum, course) => sum + course.credits, 0);
    const hoursCI = courses.reduce((sum, course) => sum + course.tHours, 0);
    const hoursT = courses.reduce((sum, course) => sum + course.tuHours, 0);
    const hoursLI = courses.reduce((sum, course) => sum + course.llHours, 0);
    const hoursTWD = courses.reduce((sum, course) => sum + course.twHours, 0);
    const hoursTotal = courses.reduce((sum, course) => sum + course.totalHours, 0);

    return {
      categoryCode,
      percentage: totalCredits > 0 ? Number(((credits / totalCredits) * 100).toFixed(2)) : 0,
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
