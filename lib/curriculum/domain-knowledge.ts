export type ProgramDomain = "CSE" | "ECE" | "EEE" | "MECH" | "CIVIL" | "GENERIC";

export interface ProgressionRule {
  prerequisiteKeywords: string[];
  dependentKeywords: string[];
  label: string;
}

export interface DomainKnowledgeProfile {
  domain: ProgramDomain;
  requiredCoreKeywords: string[];
  emergingKeywords: string[];
  restrictedKeywords: string[];
  progressionRules: ProgressionRule[];
}

export const FUNDAMENTAL_KEYWORDS: string[][] = [
  ["mathematics", "calculus", "linear algebra"],
  ["physics", "engineering physics"],
  [
    "engineering mechanics",
    "basic electrical",
    "engineering drawing",
    "programming fundamentals",
  ],
];

const DOMAIN_PROFILES: Record<ProgramDomain, DomainKnowledgeProfile> = {
  CSE: {
    domain: "CSE",
    requiredCoreKeywords: [
      "data structures",
      "operating systems",
      "computer networks",
      "database",
      "algorithms",
    ],
    emergingKeywords: [
      "artificial intelligence",
      "machine learning",
      "cloud",
      "cyber",
      "blockchain",
      "generative ai",
      "edge computing",
    ],
    restrictedKeywords: [
      "advanced welding",
      "heat transfer",
      "fluid power",
      "thermodynamics",
      "manufacturing",
    ],
    progressionRules: [
      {
        prerequisiteKeywords: ["programming fundamentals", "object oriented programming"],
        dependentKeywords: ["data structures"],
        label: "Programming Fundamentals -> Data Structures",
      },
      {
        prerequisiteKeywords: ["data structures"],
        dependentKeywords: ["design and analysis of algorithms", "algorithms"],
        label: "Data Structures -> Algorithms",
      },
      {
        prerequisiteKeywords: ["design and analysis of algorithms", "algorithms"],
        dependentKeywords: ["machine learning", "artificial intelligence"],
        label: "Algorithms -> AI/ML",
      },
    ],
  },
  ECE: {
    domain: "ECE",
    requiredCoreKeywords: [
      "signals",
      "digital communication",
      "analog communication",
      "embedded systems",
      "vlsi",
    ],
    emergingKeywords: [
      "iot",
      "5g",
      "wireless",
      "advanced vlsi",
      "edge computing",
      "ai",
    ],
    restrictedKeywords: ["thermodynamics", "machine design", "compiler design"],
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
  },
  EEE: {
    domain: "EEE",
    requiredCoreKeywords: [
      "electrical machines",
      "power systems",
      "control systems",
      "power electronics",
      "drives",
    ],
    emergingKeywords: [
      "smart grid",
      "electric vehicle",
      "renewable",
      "energy storage",
      "industrial iot",
    ],
    restrictedKeywords: ["compiler design", "operating systems", "thermodynamics"],
    progressionRules: [
      {
        prerequisiteKeywords: ["electrical circuits"],
        dependentKeywords: ["power system analysis"],
        label: "Electrical Circuits -> Power System Analysis",
      },
      {
        prerequisiteKeywords: ["control engineering", "control systems"],
        dependentKeywords: ["industrial automation"],
        label: "Control Systems -> Industrial Automation",
      },
    ],
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
    emergingKeywords: [
      "robotics",
      "advanced manufacturing",
      "additive manufacturing",
      "digital twin",
      "autonomous",
    ],
    restrictedKeywords: [
      "operating systems",
      "distributed computing",
      "compiler design",
      "database",
      "computer networks",
    ],
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
      {
        prerequisiteKeywords: ["fluid mechanics"],
        dependentKeywords: ["computational fluid dynamics"],
        label: "Fluid Mechanics -> CFD",
      },
    ],
  },
  CIVIL: {
    domain: "CIVIL",
    requiredCoreKeywords: [
      "structural analysis",
      "geotechnical",
      "transportation engineering",
      "environmental engineering",
      "surveying",
    ],
    emergingKeywords: [
      "smart cities",
      "gis",
      "remote sensing",
      "sustainable infrastructure",
      "earthquake engineering",
    ],
    restrictedKeywords: ["compiler design", "operating systems", "machine design"],
    progressionRules: [
      {
        prerequisiteKeywords: ["strength of materials"],
        dependentKeywords: ["structural analysis"],
        label: "Strength of Materials -> Structural Analysis",
      },
      {
        prerequisiteKeywords: ["fluid mechanics"],
        dependentKeywords: ["water resources engineering", "hydrology"],
        label: "Fluid Mechanics -> Water Resources",
      },
    ],
  },
  GENERIC: {
    domain: "GENERIC",
    requiredCoreKeywords: [],
    emergingKeywords: ["ai", "cloud", "automation", "sustainability"],
    restrictedKeywords: [],
    progressionRules: [],
  },
};

export function detectProgramDomain(programName: string): ProgramDomain {
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
