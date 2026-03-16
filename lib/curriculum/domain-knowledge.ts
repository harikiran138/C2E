export type ProgramDomain = "CSE" | "ECE" | "EEE" | "MECH" | "CIVIL" | "GENERIC";

export interface ProgressionRule {
  prerequisiteKeywords: string[];
  dependentKeywords: string[];
  label: string;
}

export interface DomainKnowledgeGraph {
  coreTopics: string[];
  relatedTopics: string[];
  emergingTopics: string[];
  disallowedTopics: string[];
}

export interface FundamentalBackboneRule {
  id: string;
  title: string;
  keywords: string[];
  categoryHint: "BS" | "ES";
  preferredSemester: number;
}

export interface DomainKnowledgeProfile {
  domain: ProgramDomain;
  requiredCoreKeywords: string[];
  emergingKeywords: string[];
  restrictedKeywords: string[];
  progressionRules: ProgressionRule[];
  knowledgeGraph: DomainKnowledgeGraph;
}

export interface DomainAlignmentResult {
  isCore: boolean;
  isRelated: boolean;
  isEmerging: boolean;
  isDisallowed: boolean;
  isRelevant: boolean;
}

export const FUNDAMENTAL_BACKBONE_RULES: FundamentalBackboneRule[] = [
  {
    id: "math-calculus",
    title: "Calculus",
    keywords: ["calculus", "engineering mathematics", "linear algebra and calculus", "differential equations"],
    categoryHint: "BS",
    preferredSemester: 1,
  },
  {
    id: "math-linear-algebra",
    title: "Linear Algebra",
    keywords: ["linear algebra", "computational linear algebra"],
    categoryHint: "BS",
    preferredSemester: 1,
  },
  {
    id: "math-probability",
    title: "Probability",
    keywords: ["probability", "statistics", "stochastic", "probability statistics queuing"],
    categoryHint: "BS",
    preferredSemester: 2,
  },
  {
    id: "math-discrete",
    title: "Discrete Mathematics",
    keywords: ["discrete mathematics", "discrete math", "graph theory", "discrete mathematics and graph theory"],
    categoryHint: "BS",
    preferredSemester: 2,
  },
  {
    id: "science-physics",
    title: "Engineering Physics",
    keywords: ["engineering physics", "physics", "waves and quantum"],
    categoryHint: "BS",
    preferredSemester: 1,
  },
  {
    id: "science-chemistry",
    title: "Engineering Chemistry",
    keywords: ["engineering chemistry", "chemistry", "material science"],
    categoryHint: "BS",
    preferredSemester: 1,
  },
  {
    id: "basic-programming",
    title: "Programming Fundamentals",
    keywords: [
      "programming fundamentals",
      "introduction to programming",
      "programming for problem solving",
      "programming",
      "problem solving",
    ],
    categoryHint: "ES",
    preferredSemester: 1,
  },
  {
    id: "basic-electrical",
    title: "Basic Electrical Engineering",
    keywords: [
      "basic electrical engineering",
      "basic electrical",
      "electrical engineering basics",
      "electrical and electronics engineering",
    ],
    categoryHint: "ES",
    preferredSemester: 2,
  },
  {
    id: "basic-drawing",
    title: "Engineering Drawing",
    keywords: ["engineering drawing", "engineering graphics", "graphics and design", "engineering graphics and design"],
    categoryHint: "ES",
    preferredSemester: 2,
  },
];

export const FUNDAMENTAL_KEYWORDS: string[][] = FUNDAMENTAL_BACKBONE_RULES.map(
  (rule) => rule.keywords,
);

const AI_DS_CORE_TOPICS = [
  "machine learning",
  "deep learning",
  "natural language processing",
  "computer vision",
  "reinforcement learning",
  "data mining",
  "big data",
  "ai ethics",
  "graph learning",
  "generative ai",
];

const AI_DS_RELATED_TOPICS = [
  "algorithms",
  "operating systems",
  "computer networks",
  "database systems",
  "software engineering",
  "distributed systems",
];

const AI_DS_DISALLOWED_TOPICS = [
  "mechanical design",
  "thermodynamics",
  "structural engineering",
  "fluid mechanics",
  "heat transfer",
  "advanced welding",
];

const DOMAIN_PROFILES: Record<ProgramDomain, DomainKnowledgeProfile> = {
  CSE: {
    domain: "CSE",
    requiredCoreKeywords: [
      "programming fundamentals",
      "data structures",
      "algorithms",
      "operating systems",
      "computer networks",
      "database",
    ],
    emergingKeywords: [
      "artificial intelligence",
      "machine learning",
      "deep learning",
      "generative ai",
      "cloud computing",
      "cybersecurity",
      "edge ai",
    ],
    restrictedKeywords: AI_DS_DISALLOWED_TOPICS,
    progressionRules: [
      {
        // Programming must appear BEFORE data structures — if both are semester 1, fine.
        // But if data structures is in sem 1 and programming wasn't seen, it's a problem.
        prerequisiteKeywords: ["programming fundamentals", "object oriented programming", "programming for problem solving"],
        dependentKeywords: ["data structures and applications", "data structures"],
        label: "Programming -> Data Structures",
      },
      {
        prerequisiteKeywords: ["data structures"],
        dependentKeywords: ["algorithms", "design and analysis of algorithms"],
        label: "Data Structures -> Algorithms",
      },
      {
        prerequisiteKeywords: ["algorithms", "design and analysis of algorithms"],
        dependentKeywords: ["machine learning", "artificial intelligence"],
        label: "Algorithms -> AI/ML",
      },
      {
        prerequisiteKeywords: ["machine learning", "artificial intelligence"],
        dependentKeywords: ["deep learning"],
        label: "Machine Learning -> Deep Learning",
      },
    ],
    knowledgeGraph: {
      coreTopics: AI_DS_CORE_TOPICS,
      relatedTopics: AI_DS_RELATED_TOPICS,
      emergingTopics: [
        "generative ai",
        "edge ai",
        "cloud computing",
        "cybersecurity",
        "graph learning",
      ],
      disallowedTopics: AI_DS_DISALLOWED_TOPICS,
    },
  },
  ECE: {
    domain: "ECE",
    requiredCoreKeywords: [
      "signals and systems",
      "digital communication",
      "analog communication",
      "embedded systems",
      "vlsi",
    ],
    emergingKeywords: ["5g", "wireless", "iot", "edge computing", "embedded ai"],
    restrictedKeywords: ["thermodynamics", "machine design", "structural engineering"],
    progressionRules: [
      {
        prerequisiteKeywords: ["signals and systems"],
        dependentKeywords: ["digital signal processing"],
        label: "Signals and Systems -> DSP",
      },
      {
        prerequisiteKeywords: ["digital electronics", "microprocessor"],
        dependentKeywords: ["embedded systems"],
        label: "Digital Electronics -> Embedded Systems",
      },
    ],
    knowledgeGraph: {
      coreTopics: [
        "signals and systems",
        "analog communication",
        "digital communication",
        "vlsi",
        "embedded systems",
      ],
      relatedTopics: ["control systems", "microprocessor", "wireless communication"],
      emergingTopics: ["iot", "5g", "embedded ai", "edge computing"],
      disallowedTopics: ["thermodynamics", "machine design", "compiler design"],
    },
  },
  EEE: {
    domain: "EEE",
    requiredCoreKeywords: [
      "electrical circuits",
      "electrical machines",
      "power systems",
      "control systems",
      "power electronics",
    ],
    emergingKeywords: ["smart grid", "electric vehicle", "energy storage"],
    restrictedKeywords: ["compiler design", "operating systems", "structural engineering"],
    progressionRules: [
      {
        prerequisiteKeywords: ["electrical circuits"],
        dependentKeywords: ["power system analysis"],
        label: "Electrical Circuits -> Power Systems",
      },
      {
        prerequisiteKeywords: ["control systems"],
        dependentKeywords: ["industrial automation"],
        label: "Control Systems -> Automation",
      },
    ],
    knowledgeGraph: {
      coreTopics: [
        "electrical circuits",
        "electrical machines",
        "power systems",
        "control systems",
        "power electronics",
      ],
      relatedTopics: ["drives", "measurements", "instrumentation"],
      emergingTopics: ["smart grid", "electric vehicle", "renewable energy"],
      disallowedTopics: ["compiler design", "distributed systems", "structural engineering"],
    },
  },
  MECH: {
    domain: "MECH",
    requiredCoreKeywords: [
      "thermodynamics",
      "fluid mechanics",
      "machine design",
      "manufacturing",
      "strength of materials",
    ],
    emergingKeywords: ["robotics", "digital twin", "additive manufacturing"],
    restrictedKeywords: ["operating systems", "compiler design", "database systems"],
    progressionRules: [
      {
        prerequisiteKeywords: ["engineering mechanics"],
        dependentKeywords: ["machine design"],
        label: "Engineering Mechanics -> Machine Design",
      },
      {
        prerequisiteKeywords: ["thermodynamics"],
        dependentKeywords: ["heat transfer"],
        label: "Thermodynamics -> Heat Transfer",
      },
    ],
    knowledgeGraph: {
      coreTopics: [
        "thermodynamics",
        "fluid mechanics",
        "machine design",
        "manufacturing",
        "strength of materials",
      ],
      relatedTopics: ["cad", "cam", "automobile engineering"],
      emergingTopics: ["robotics", "digital twin", "additive manufacturing"],
      disallowedTopics: ["operating systems", "computer networks", "database systems"],
    },
  },
  CIVIL: {
    domain: "CIVIL",
    requiredCoreKeywords: [
      "structural analysis",
      "geotechnical engineering",
      "transportation engineering",
      "environmental engineering",
      "surveying",
    ],
    emergingKeywords: ["smart cities", "gis", "sustainable infrastructure"],
    restrictedKeywords: ["compiler design", "operating systems", "machine design"],
    progressionRules: [
      {
        prerequisiteKeywords: ["strength of materials"],
        dependentKeywords: ["structural analysis"],
        label: "Strength of Materials -> Structural Analysis",
      },
      {
        prerequisiteKeywords: ["fluid mechanics"],
        dependentKeywords: ["hydrology", "water resources engineering"],
        label: "Fluid Mechanics -> Water Resources",
      },
    ],
    knowledgeGraph: {
      coreTopics: [
        "structural analysis",
        "geotechnical engineering",
        "transportation engineering",
        "environmental engineering",
        "surveying",
      ],
      relatedTopics: ["construction planning", "concrete technology"],
      emergingTopics: ["smart cities", "gis", "remote sensing"],
      disallowedTopics: ["compiler design", "distributed systems", "machine design"],
    },
  },
  GENERIC: {
    domain: "GENERIC",
    requiredCoreKeywords: [],
    emergingKeywords: ["ai", "cloud computing", "automation", "sustainability"],
    restrictedKeywords: [],
    progressionRules: [],
    knowledgeGraph: {
      coreTopics: [],
      relatedTopics: [],
      emergingTopics: ["ai", "cloud computing", "automation"],
      disallowedTopics: [],
    },
  },
};

export function normalizeKnowledgeText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function keywordMatch(title: string, keywords: string[]): boolean {
  const normalizedTitle = normalizeKnowledgeText(title);
  return keywords.some((keyword) =>
    normalizedTitle.includes(normalizeKnowledgeText(keyword)),
  );
}

export function evaluateDomainAlignment(
  profile: DomainKnowledgeProfile,
  courseTitle: string,
): DomainAlignmentResult {
  const graph = profile.knowledgeGraph;
  const isCore = keywordMatch(courseTitle, graph.coreTopics);
  const isRelated = keywordMatch(courseTitle, graph.relatedTopics);
  const isEmerging = keywordMatch(courseTitle, graph.emergingTopics);
  const isDisallowed = keywordMatch(courseTitle, graph.disallowedTopics);

  return {
    isCore,
    isRelated,
    isEmerging,
    isDisallowed,
    isRelevant: !isDisallowed && (isCore || isRelated || isEmerging),
  };
}

export function getAllowedTopicsForDomain(profile: DomainKnowledgeProfile): string[] {
  return Array.from(
    new Set([
      ...profile.knowledgeGraph.coreTopics,
      ...profile.knowledgeGraph.relatedTopics,
      ...profile.knowledgeGraph.emergingTopics,
    ]),
  );
}

export function detectProgramDomain(programName: string): ProgramDomain {
  const normalized = String(programName || "").toUpperCase();
  if (
    normalized.includes("COMPUTER") ||
    normalized.includes("CSE") ||
    normalized.includes("INFORMATION TECHNOLOGY") ||
    normalized.includes("AI") ||
    normalized.includes("DATA SCIENCE")
  ) {
    return "CSE";
  }
  if (normalized.includes("ELECTRONICS") || normalized.includes("ECE")) {
    return "ECE";
  }
  if (normalized.includes("ELECTRICAL") || normalized.includes("EEE")) {
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

export function getDomainKnowledgeProfile(programName: string): DomainKnowledgeProfile {
  const domain = detectProgramDomain(programName);
  return DOMAIN_PROFILES[domain];
}
