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

type ProgramTrack = "CSE" | "ECE" | "EEE" | "MECH" | "CIVIL" | "CHEMICAL" | "TEXTILE" | "FASHION" | "GENERIC";

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

type TitlePool = {
  basic: string[];
  core: string[];
  advanced: string[];
};

const CATEGORY_TITLE_LIBRARY_V2: Record<CategoryCode, TitlePool> = {
  BS: {
    basic: [
      // Mathematics — Foundation Year
      "Calculus, Differential Equations and Transform Methods for Computational Systems",
      "Linear Algebra, Vector Spaces and Matrix Computation for Engineers",
      "Engineering Physics: Wave Mechanics, Optics and Electromagnetic Theory",
      "Engineering Chemistry: Materials Science, Electrochemistry and Corrosion Engineering",
      "Biology for Engineers: Principles of Life Sciences and Biotechnology",
    ],
    core: [
      // Mathematics — Core Year
      "Discrete Mathematics, Graph Theory and Combinatorial Optimization",
      "Probability Theory, Statistical Methods and Stochastic Processes",
      "Numerical Methods, Optimization Techniques and Mathematical Modeling",
      "Complex Variables, Transforms and Special Functions for Signal Processing",
    ],
    advanced: [
      // Mathematics — Advanced/Specialization Year
      "Computational Linear Algebra for Machine Learning and Data Science",
      "Operations Research, Decision Theory and Optimization",
      "Information Theory, Coding Theory and Cryptographic Mathematics",
    ],
  },
  ES: {
    basic: [
      // Engineering Science — Foundation Year
      "Structured Programming, Algorithms and Computational Problem Solving",
      "Engineering Graphics, Technical Drawing and Computer-Aided Design",
      "Electrical Circuits, Network Theory and Electronic Measurement Techniques",
      "Basic Electronics: Semiconductor Devices, Amplifiers and Signal Processing",
      "Engineering Mechanics: Statics, Dynamics and Strength of Materials",
      "Digital Logic Design, Boolean Algebra and Combinational Circuit Systems",
    ],
    core: [
      // Engineering Science — Core Year
      "Data Structures, Graph Algorithms and Efficient Computing Techniques",
      "Computer Organization, Microarchitecture and Assembly Language Programming",
      "Object-Oriented Design, Software Modelling and Programming Patterns",
      "Signals, Systems and Fourier Analysis for Engineers",
      "Microprocessors, Embedded Interfaces and System-Level Programming",
    ],
    advanced: [
      // Engineering Science — Advanced Year
      "Control Systems, Feedback Theory and Industrial Automation",
      "Analog and Digital Communication Systems and Protocols",
      "VLSI Design, Programmable Logic and Digital System Architecture",
    ],
  },
  HSS: {
    basic: [
      "Communicative English, Technical Writing and Presentation Skills",
      "Professional Ethics, Human Values and Engineering Society",
      "Constitution of India, Fundamental Rights and Democratic Governance",
      "Environmental Science, Ecology and Sustainable Engineering Practices",
    ],
    core: [
      "Economics for Engineers: Microeconomics, Macroeconomics and Financial Analysis",
      "Psychology for Engineers: Behavioral Science, Team Dynamics and Leadership",
      "Intellectual Property Rights, Patents and Technology Innovation Law",
    ],
    advanced: [
      "Research Methodology, Academic Writing and Scientific Communication",
      "Project Management, Risk Assessment and Organizational Leadership",
      "Entrepreneurship, Technology Commercialization and Startup Ecosystem",
    ],
  },
  PC: {
    basic: [],
    core: [
      // Professional Core — Core Year (Sem 3-5)
      "Design and Analysis of Algorithms for Efficient Computing",
      "Database Systems, Transaction Processing and Data Storage Architectures",
      "Operating System Architecture, Process Management and Concurrent Computing",
      "Computer Networking, Internet Protocols and Distributed Communication Systems",
      "Software Engineering, Software Lifecycle Management and Agile Development",
      "Theory of Computation, Automata and Formal Language Theory",
      "Computer Architecture, Instruction Set Design and Pipelined Processor Systems",
      "Compiler Design, Lexical Analysis and Code Optimization Techniques",
    ],
    advanced: [
      // Professional Core — Advanced Year (Sem 6-8)
      "Distributed Systems, Microservices and Fault-Tolerant Computing",
      "Artificial Intelligence, Knowledge Representation and Intelligent Decision Systems",
      "Web Technologies, Full Stack Development and RESTful API Architecture",
      "Information Security, Cryptography and Secure Software Systems",
      "Mobile Application Development, Cross-Platform Frameworks and UI Design",
      "Software Testing, Quality Assurance and DevOps Engineering",
    ],
  },
  PE: {
    basic: [],
    core: [
      "Introduction to Data Science, Exploratory Analysis and Visualization",
      "Python Programming for Data Engineering and Scientific Computing",
      "Java Enterprise Development, Spring Framework and Backend Architecture",
    ],
    advanced: [
      "Machine Learning Algorithms, Statistical Models and Predictive Analytics",
      "Cloud Computing Architectures, Microservices and Scalable Distributed Systems",
      "Cyber Security, Ethical Hacking and Secure Network Systems",
      "Blockchain Technologies, Smart Contracts and Decentralized Applications",
      "Internet of Things: Sensor Systems, Edge Computing and Connected Devices",
      "Deep Learning, Neural Network Architectures and AI Model Training",
      "Big Data Engineering, Data Warehousing and Distributed Data Processing",
      "Generative AI Systems, Large Language Models and Prompt Engineering",
      "Natural Language Processing, Text Analytics and Language Understanding Systems",
      "Computer Vision, Image Processing and Visual Intelligence Systems",
      "DevOps Engineering, CI/CD Pipelines and Infrastructure Automation",
      "Quantum Computing: Principles, Algorithms and Quantum Information Theory",
    ],
  },
  OE: {
    basic: [
      "Introduction to Finance, Investment Principles and Personal Wealth Management",
      "Yoga, Wellness and Mindfulness for Engineering Professionals",
    ],
    core: [
      "Entrepreneurship Development, Business Models and Market Validation",
      "Digital Marketing, SEO Strategies and Online Business Development",
      "Design Thinking, User Experience and Product Innovation",
    ],
    advanced: [
      "Sustainable Smart Cities, Urban Technology and Green Infrastructure",
      "Industrial Sociology, Organizational Behavior and Workforce Management",
      "Supply Chain Management, Logistics Technology and Global Operations",
      "Healthcare Informatics, Medical Devices and Digital Health Systems",
    ],
  },
  MC: {
    basic: ["Environmental Studies and Ecology Awareness", "Indian Constitution, Rights and Civic Responsibility"],
    core: ["Essence of Indian Traditional Knowledge and Science"],
    advanced: [],
  },
  AE: {
    basic: [
      "Communication Skills, Soft Skills and Professional Personality Development",
      "Technical English for Engineers: Reading, Writing and Presentation",
    ],
    core: [
      "Quantitative Aptitude, Logical Reasoning and Analytical Problem Solving",
      "Interview Skills, Resume Writing and Career Readiness",
    ],
    advanced: ["Leadership, Group Dynamics and Corporate Communication"],
  },
  SE: {
    basic: [
      "Programming and Problem Solving Lab using Python/C",
      "IT Workshop: Tools, Productivity Software and Digital Literacy",
    ],
    core: [
      "Data Structures and Algorithms Lab with Competitive Programming",
      "Full Stack Web Development Lab: React, Node and Database Integration",
      "Mobile Application Development Lab using Flutter/React Native",
    ],
    advanced: [
      "DevOps, CI/CD and Cloud Deployment Lab using AWS/GCP",
      "Machine Learning and Deep Learning Lab with PyTorch/TensorFlow",
      "Cybersecurity and Ethical Hacking Lab",
    ],
  },
  PR: {
    basic: [],
    core: [
      "Minor Project: Prototype Design and Technical Problem Solving",
      "Innovation Lab: Hackathon, Ideation and Proof-of-Concept Development",
    ],
    advanced: [
      "Industry Internship: Professional Experience and Applied Engineering",
      "Capstone Project Phase I: Research, Design and System Architecture",
      "Capstone Project Phase II: Implementation, Testing and Deployment",
    ],
  },
};

const PROGRAM_TRACK_TITLE_LIBRARY: Record<
  ProgramTrack,
  Partial<Record<CategoryCode, string[]>>
> = {
  CSE: {
    ES: [
      "Structured Programming, Algorithms and Computational Problem Solving",
      "Data Structures, Graph Algorithms and Efficient Computing Techniques",
      "Digital Logic Design, Boolean Algebra and Sequential Circuit Systems",
      "Computer Organization, Microarchitecture and Assembly Language Programming",
      "Object-Oriented Design, Software Modelling and Programming Patterns",
      "Web Programming Fundamentals: HTML, CSS, JavaScript and DOM Manipulation",
    ],
    PC: [
      "Database Systems, Transaction Processing and Data Storage Architectures",
      "Operating System Architecture, Process Management and Concurrent Computing",
      "Computer Networking, Internet Protocols and Distributed Communication Systems",
      "Design and Analysis of Algorithms for Efficient Computing",
      "Software Engineering, Software Lifecycle Management and Agile Development",
      "Theory of Computation, Automata and Formal Language Theory",
      "Compiler Design, Lexical Analysis and Code Optimization Techniques",
      "Computer Architecture, Instruction Set Design and Pipelined Processor Systems",
      "Information Security, Cryptography and Secure Software Systems",
      "Artificial Intelligence, Knowledge Representation and Intelligent Decision Systems",
      "Distributed Systems, Microservices and Fault-Tolerant Computing",
      "Web Technologies, Full Stack Development and RESTful API Architecture",
    ],
    PE: [
      "Machine Learning Algorithms, Statistical Models and Predictive Analytics",
      "Cloud Computing Architectures, Microservices and Scalable Distributed Systems",
      "Cyber Security, Ethical Hacking and Secure Network Systems",
      "Big Data Engineering, Data Warehousing and Distributed Data Processing",
      "Deep Learning, Neural Network Architectures and AI Model Training",
      "Natural Language Processing, Text Analytics and Language Understanding Systems",
      "Computer Vision, Image Processing and Visual Intelligence Systems",
      "Internet of Things: Sensor Systems, Edge Computing and Connected Devices",
      "Generative AI Systems, Large Language Models and Prompt Engineering",
      "DevOps Engineering, CI/CD Pipelines and Infrastructure Automation",
    ],
    SE: [
      "Data Structures and Algorithms Lab with Competitive Programming",
      "Full Stack Web Development Lab: React, Node and Database Integration",
      "Mobile Application Development Lab using Flutter/React Native",
      "DevOps, CI/CD and Cloud Deployment Lab using AWS/GCP",
      "Machine Learning and Deep Learning Lab with PyTorch/TensorFlow",
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
  CHEMICAL: {
    ES: ["Basic Chemical Engineering", "Material and Energy Balances", "Fluid Flow Operations", "Mechanical Operations", "Chemical Engineering Thermodynamics"],
    PC: ["Heat Transfer Operations", "Mass Transfer Operations", "Chemical Reaction Engineering", "Process Dynamics and Control", "Transport Phenomena", "Chemical Process Industries"],
    PE: ["Petroleum Refining", "Polymer Technology", "Nano Technology", "Industrial Safety and Hazard Management", "Biochemical Engineering"],
    SE: ["Chemical Engineering Lab", "Mass Transfer Lab", "Reaction Engineering Lab", "Process Control Lab"]
  },
  TEXTILE: {
    ES: ["Introduction to Textile Technology", "Textile Fibers", "Yarn Manufacture", "Fabric Manufacture", "Textile Chemical Processing"],
    PC: ["Spinning Technology", "Weaving Technology", "Knitting Technology", "Testing of Textiles", "Textile Finishing", "Apparel Technology"],
    PE: ["High Performance Fibers", "Technical Textiles", "Smart Textiles", "Eco-friendly Processing", "Computer Aided Design for Textiles"],
    SE: ["Fiber Identification Lab", "Spinning Lab", "Weaving Lab", "Textile Testing Lab"]
  },
  FASHION: {
    ES: ["Introduction to Fashion Industry", "History of Art and Design", "Elements of Design", "Pattern Making Basics", "Textile Science for Fashion"],
    PC: ["Draping", "Garment Construction", "Fashion Illustration", "Apparel Quality Management", "Fashion Merchandising", "Portfolio Development"],
    PE: ["Luxury Brand Management", "Sustainable Fashion", "Couture Design", "Fashion Journalism", "Global Marketing"],
    SE: ["Pattern Making Lab", "Garment Construction Studio", "Computer Aided Fashion Design Lab", "Fashion Illustration Studio"]
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

function getLevelForSemester(semester: number): keyof TitlePool {
  if (semester <= 2) return "basic";
  if (semester <= 5) return "core";
  return "advanced";
}

export function buildFallbackTitle(input: {
  programName: string;
  mode?: CurriculumMode;
  category: CategoryCode;
  semester: number;
  usedTitles?: Set<string>;
  categoryIndexInSemester?: number; // Optional: to help with multi-course same-category same-semester
}): string {
  const level = getLevelForSemester(input.semester);
  const categoryTitles = getCategoryTitlePool(input.programName, input.category, level);
  
  // Logic: try to pick a title based on cumulative index or semester progression
  // We use (semester * 2 + index) to spread titles across the library better
  const poolIndex = ((input.semester - 1) * 2 + (input.categoryIndexInSemester || 0)) % Math.max(1, categoryTitles.length);
  const baseName = categoryTitles[poolIndex] || `${input.category} Course`;

  const usedTitles = input.usedTitles;
  let candidate = baseName;
  if (!usedTitles) return candidate;

  let index = 1;
  // If we hit a duplicate, we try the NEXT title in the pool first before adding "2"
  let poolOffset = 1;
  while (usedTitles.has(normalizeCourseTitle(candidate))) {
    const nextPoolIndex = (poolIndex + poolOffset) % categoryTitles.length;
    const nextCandidate = categoryTitles[nextPoolIndex];
    
    if (nextCandidate && !usedTitles.has(normalizeCourseTitle(nextCandidate))) {
      candidate = nextCandidate;
      break; 
    }
    
    // If we've exhausted the pool or still hitting duplicates, add a suffix
    if (poolOffset >= categoryTitles.length) {
      index += 1;
      candidate = `${baseName} ${index}`;
    } else {
      poolOffset += 1;
    }
  }

  usedTitles.add(normalizeCourseTitle(candidate));
  return candidate;
}

function getCategoryTitlePool(programName: string, category: CategoryCode, level: keyof TitlePool): string[] {
  const track = detectProgramTrack(programName);
  const trackTitles = PROGRAM_TRACK_TITLE_LIBRARY[track]?.[category];
  
  // If we have track-specific titles, we use them (for now they aren't leveled but we can filter or just return)
  if (trackTitles && trackTitles.length > 0) return trackTitles;
  
  const poolObject = CATEGORY_TITLE_LIBRARY_V2[category];
  if (!poolObject) return [];

  let titles = poolObject[level];
  // Fallback progression: target level -> core -> basic
  if (titles.length === 0 && level === "advanced") titles = poolObject.core;
  if (titles.length === 0) titles = poolObject.basic;
  
  return titles;
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
  if (normalized.includes("CHEMICAL") || normalized.includes("PROCESS ENGINEERING")) return "CHEMICAL";
  if (normalized.includes("TEXTILE") || normalized.includes("FABRIC") || normalized.includes("YARN")) return "TEXTILE";
  if (normalized.includes("FASHION") || normalized.includes("APPAREL") || normalized.includes("DESIGN") && !normalized.includes("COMPUTER")) return "FASHION";
  
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
        
        // Count how many courses of this category are already in this semester
        const categoryCountInSem = semesters[semIndex].courses.filter(c => c.category === category).length;

        const title = buildFallbackTitle({
          programName,
          mode,
          category,
          semester: semesterNo,
          usedTitles,
          categoryIndexInSemester: categoryCountInSem,
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

        const categoryCountInSem = semesters[semIndex].courses.filter(c => c.category === category).length;

        const title = buildFallbackTitle({
          programName,
          mode,
          category,
          semester: fallbackSemester,
          usedTitles,
          categoryIndexInSemester: categoryCountInSem,
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
