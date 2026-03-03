import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Short-lived in-memory cache (server instance local)
const ai_cache: Record<string, string> = {};

type GenerationMode = "vision" | "mission" | "both";
type StatementKind = "vision" | "mission";
type ThemeCategory =
  | "global_positioning"
  | "innovation_technology"
  | "sustainability_society"
  | "professional_values"
  | "educational_philosophy"
  | "custom";

interface SemanticOptionConfig {
  label: string;
  category: ThemeCategory;
  semantic_intent: string[];
  accreditation_relevance: string[];
  weight: number;
}

interface SemanticOption extends SemanticOptionConfig {
  normalizedLabel: string;
  keywords: string[];
}

interface ThemeCluster {
  category: ThemeCategory;
  categoryLabel: string;
  options: SemanticOption[];
  weightScore: number;
  semanticIntents: string[];
  accreditationTags: string[];
}

interface DistributionSlot {
  index: number;
  categories: ThemeCategory[];
  emphasisLabels: string[];
}

interface ValidationBreakdown {
  themeCoverage: number;
  structuralDiversity: number;
  compliance: number;
  linguisticQuality: number;
  strategicBalance: number;
}

interface ValidationResult {
  totalScore: number;
  pass: boolean;
  details: ValidationBreakdown;
  missingThemes: string[];
  missingCategories: string[];
  repeatedStartPattern: boolean;
  perStatementCoverage: Array<{
    statement: string;
    coveredThemes: number;
    coveredCategories: string[];
  }>;
  violations: string[];
}

interface GenerationResult {
  statements: string[];
  validation: ValidationResult;
  attempts: number;
}

interface VisionMissionPair {
  vision: string;
  mission: string;
}

interface CoupledMissionHint {
  index: number;
  vision: string;
  dominantCategories: ThemeCategory[];
  focusKeywords: string[];
  requiredPillars: string[];
}

interface PairAlignmentDetail {
  index: number;
  vision: string;
  mission: string;
  requiredCategories: string[];
  coveredCategories: string[];
  keywordHits: string[];
  missingCategories: string[];
  missingOperationalPillars: string[];
  score: number;
}

interface PairAlignmentResult {
  totalScore: number;
  pass: boolean;
  details: PairAlignmentDetail[];
  violations: string[];
}

interface CoupledMissionGenerationResult extends GenerationResult {
  alignment: PairAlignmentResult;
  hints: CoupledMissionHint[];
}

interface StrategicValidationScores {
  vision_quality: number;
  mission_quality: number;
  alignment_strength: number;
  measurability_potential: number;
  overall_strategic_soundness: number;
}

interface StrategicValidationItem {
  index: number;
  vision: string;
  mission: string;
  scores: StrategicValidationScores;
  long_term_issues: string[];
  alignment_gaps: string[];
  mission_pillars: string[];
  missing_mission_pillars: string[];
  kpi_categories: string[];
  realism_flags: string[];
  accreditation_flags: string[];
  flow_flags: string[];
  identified_weaknesses: string[];
  rewrite_suggestions: string[];
  final_verdict: string;
}

interface StrategicValidationSummary {
  validator: "SLCA";
  approval_threshold: number;
  overall_average: number;
  approved: boolean;
  items: StrategicValidationItem[];
  source: "ai" | "fallback";
}

const MAX_COUNT = 10;
const MAX_REGEN_ATTEMPTS = 3;
const STRATEGIC_APPROVAL_THRESHOLD = 90;
const VISION_APPROVAL_THRESHOLD = 90;
const VISION_MAX_PILLARS = 3;
const VISION_SIMILARITY_THRESHOLD = 0.75;
const MISSION_APPROVAL_THRESHOLD = 90;

const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  global_positioning: "Global Positioning",
  innovation_technology: "Innovation & Technology",
  sustainability_society: "Sustainability & Society",
  professional_values: "Professional Values",
  educational_philosophy: "Educational Philosophy",
  custom: "Contextual Priorities",
};

const CATEGORY_FOCUS_PHRASES: Record<ThemeCategory, string> = {
  global_positioning: "global benchmarking and international quality",
  innovation_technology: "innovation and technology leadership",
  sustainability_society: "sustainability and societal impact",
  professional_values: "ethics and professional responsibility",
  educational_philosophy: "outcome-oriented learning quality",
  custom: "program-specific strategic priorities",
};

const VISION_PILLAR_PHRASES: Record<ThemeCategory, string> = {
  global_positioning: "benchmark-quality global standards",
  innovation_technology: "transformative innovation leadership",
  sustainability_society: "sustainable societal contribution",
  professional_values: "ethical professional standards",
  educational_philosophy: "scholarly excellence and lifelong growth",
  custom: "program-specific strategic identity",
};

const CATEGORY_SIGNAL_TERMS: Record<ThemeCategory, string[]> = {
  global_positioning: ["global", "international", "benchmark", "competitive"],
  innovation_technology: [
    "innovation",
    "technology",
    "future",
    "interdisciplinary",
    "research",
  ],
  sustainability_society: [
    "sustainable",
    "sustainability",
    "societal",
    "community",
    "social",
    "human",
  ],
  professional_values: [
    "ethic",
    "integrity",
    "professional",
    "responsibility",
    "leadership",
    "teamwork",
  ],
  educational_philosophy: [
    "outcome",
    "learning",
    "curriculum",
    "education",
    "academic",
    "lifelong",
  ],
  custom: ["priority", "strategic", "mission"],
};

const CATEGORY_OPERATIONAL_PILLARS: Record<ThemeCategory, string[]> = {
  global_positioning: [
    "international collaboration",
    "global benchmarking",
    "external standards",
  ],
  innovation_technology: [
    "research ecosystem",
    "innovation culture",
    "industry collaboration",
  ],
  sustainability_society: [
    "sustainable practices",
    "societal engagement",
    "community impact",
  ],
  professional_values: [
    "ethical responsibility",
    "professional integrity",
    "leadership development",
  ],
  educational_philosophy: [
    "outcome-based curriculum",
    "continuous improvement",
    "lifelong learning",
  ],
  custom: [
    "stakeholder engagement",
    "strategic academic priorities",
    "mission-driven planning",
  ],
};

const DEFAULT_MISSION_INPUT_BY_CATEGORY: Record<ThemeCategory, string> = {
  global_positioning: "Global collaboration and benchmarking",
  innovation_technology: "Innovation and entrepreneurship",
  sustainability_society: "Sustainability consciousness",
  professional_values: "Ethical engineering practice",
  educational_philosophy: "Outcome Based Education",
  custom: "Continuous academic improvement",
};

const KPI_CATEGORY_SIGNALS: Array<{ category: string; terms: string[] }> = [
  {
    category: "Curriculum and Learning Quality",
    terms: [
      "curriculum",
      "learning",
      "outcome",
      "assessment",
      "pedagogy",
      "teaching",
    ],
  },
  {
    category: "Research and Innovation",
    terms: [
      "research",
      "innovation",
      "technology",
      "laboratory",
      "entrepreneurship",
    ],
  },
  {
    category: "Industry and Employability",
    terms: [
      "industry",
      "internship",
      "employability",
      "professional",
      "career",
    ],
  },
  {
    category: "Ethics and Professional Responsibility",
    terms: ["ethical", "integrity", "responsibility", "professional standards"],
  },
  {
    category: "Sustainability and Societal Impact",
    terms: [
      "sustainable",
      "societal",
      "community",
      "public",
      "social",
      "environment",
    ],
  },
  {
    category: "Global and Benchmarking",
    terms: [
      "global",
      "international",
      "benchmark",
      "competitive",
      "external standards",
    ],
  },
];

const ABSOLUTE_TERMS = [
  "all graduates",
  "every graduate",
  "always",
  "guarantee",
  "100%",
];
const OUTCOME_STYLE_TERMS = [
  "at graduation",
  "on graduation",
  "student will be able to",
  "students will be able to",
  "immediate capability",
];
const FORBIDDEN_TERMS = ["ensure all", "master", "excel in all", "guarantee"];
const VISION_MEASURABLE_VERBS = [
  "calculate",
  "design",
  "implement",
  "code",
  "program",
  "build",
  "develop",
  "measure",
  "evaluate",
  "analyze",
  "cultivate",
  "provide",
  "deliver",
  "strengthen",
  "teaching",
  "fostering",
];

const VISION_OPERATIONAL_TERMS = Array.from(
  new Set([
    ...VISION_MEASURABLE_VERBS,
    "education",
    "teaching",
    "learning",
    "curriculum",
    "pedagogy",
    "classroom",
    "coursework",
    "assessment",
    "faculty",
    "students",
    "student",
    "deliverables",
    "training",
    "train",
    "prepare",
    "nurture",
    "empower",
    "enable",
    "foster",
    "outcome based",
    "outcome-oriented",
    "outcome oriented",
    "through education",
    "through teaching",
  ]),
);

const VISION_MARKETING_TERMS = [
  "destination",
  "hub",
  "world-class",
  "best-in-class",
  "unmatched",
];
const REDUNDANCY_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "through",
  "toward",
  "towards",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "by",
  "be",
  "or",
  "is",
  "are",
  "as",
  "at",
  "program",
  "engineering",
  "institutional",
  "strategic",
  "long",
  "term",
  "future",
  "sustained",
  "societal",
  "professional",
  "global",
  "globally",
  "international",
  "internationally",
]);
const REDUNDANCY_SUFFIXES = [
  "ization",
  "ation",
  "ition",
  "tion",
  "sion",
  "ment",
  "ness",
  "ity",
  "ship",
  "ing",
  "ed",
  "es",
  "s",
];
const SYNONYM_STACK_GROUPS: Array<{
  label: string;
  terms: string[];
  threshold: number;
}> = [
  {
    label: "distinction-concept stacking",
    terms: ["distinction", "excellence", "premier", "leadership", "leading"],
    threshold: 3,
  },
  {
    label: "innovation-concept stacking",
    terms: [
      "innovation",
      "innovative",
      "transformative",
      "foresight",
      "advancement",
    ],
    threshold: 3,
  },
];
const MISSION_OPERATIONAL_VERBS = [
  "deliver",
  "strengthen",
  "foster",
  "promote",
  "advance",
  "implement",
  "integrate",
  "enable",
  "support",
  "build",
  "sustain",
];
const MISSION_MARKETING_TERMS = VISION_MARKETING_TERMS;
const MISSION_PILLAR_SIGNALS = {
  academic: [
    "curriculum",
    "outcome-based",
    "outcome based",
    "academic",
    "learning",
    "pedagogy",
    "continuous improvement",
    "rigor",
  ],
  research_industry: [
    "research",
    "industry",
    "innovation",
    "laboratory",
    "hands-on",
    "internship",
    "collaboration",
  ],
  professional_standards: [
    "professional standards",
    "engineering standards",
    "quality standards",
    "standards alignment",
  ],
  ethics_society: [
    "ethical",
    "ethics",
    "societal",
    "community",
    "sustainable",
    "responsibility",
    "public",
  ],
} as const;

const VISION_POSITIONING_STARTERS = [
  "To be globally recognized for",
  "To emerge as",
  "To achieve distinction in",
  "To advance as a leading",
  "To be globally respected for",
];

const VISION_GLOBAL_POSITIONING_PATTERNS: Array<{
  concept: string;
  regex: RegExp;
}> = [
  { concept: "globally recognized", regex: /\bglobally recognized\b/i },
  { concept: "globally respected", regex: /\bglobally respected\b/i },
  {
    concept: "internationally benchmarked",
    regex: /\binternationally benchmarked\b/i,
  },
  { concept: "global leadership", regex: /\bglobal leadership\b/i },
  {
    concept: "global distinction",
    regex: /\b(global distinction|achieve distinction|distinction in)\b/i,
  },
  { concept: "leading advancement", regex: /\badvance as a leading\b/i },
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "through",
  "toward",
  "towards",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "by",
  "be",
  "or",
  "is",
  "are",
  "as",
  "at",
]);

const ALIGNMENT_KEYWORD_STOP_WORDS = new Set([
  ...Array.from(STOP_WORDS),
  "program",
  "engineering",
  "engineers",
  "graduates",
  "graduate",
  "vision",
  "mission",
  "long",
  "term",
  "future",
  "quality",
  "aligned",
  "alignment",
  "responsible",
  "leadership",
  "global",
  "international",
  "education",
  "learning",
  "professional",
  "institutional",
]);

const VISION_OPTION_LIBRARY: Record<
  string,
  Omit<SemanticOptionConfig, "label">
> = {
  "Global Engineering Excellence": {
    category: "global_positioning",
    semantic_intent: [
      "international leadership",
      "global standards",
      "world-class recognition",
    ],
    accreditation_relevance: ["quality", "benchmarking", "competitiveness"],
    weight: 1.0,
  },
  "Future-ready engineers": {
    category: "innovation_technology",
    semantic_intent: [
      "future readiness",
      "emerging technologies",
      "adaptive capability",
    ],
    accreditation_relevance: ["continuous improvement", "industry readiness"],
    weight: 1.0,
  },
  "Innovation-driven education": {
    category: "innovation_technology",
    semantic_intent: [
      "innovation culture",
      "creative problem solving",
      "technology infusion",
    ],
    accreditation_relevance: ["curriculum modernization", "relevance"],
    weight: 1.1,
  },
  "Technology with purpose": {
    category: "sustainability_society",
    semantic_intent: [
      "purposeful technology",
      "human impact",
      "responsible engineering",
    ],
    accreditation_relevance: ["societal impact", "ethics"],
    weight: 1.1,
  },
  "Engineering for societal impact": {
    category: "sustainability_society",
    semantic_intent: [
      "societal development",
      "community outcomes",
      "public benefit",
    ],
    accreditation_relevance: ["societal responsibility", "sustainability"],
    weight: 1.2,
  },
  "Internationally benchmarked": {
    category: "global_positioning",
    semantic_intent: [
      "global benchmarking",
      "international comparability",
      "quality assurance",
    ],
    accreditation_relevance: ["quality systems", "external standards"],
    weight: 1.0,
  },
  "Outcome-oriented education": {
    category: "educational_philosophy",
    semantic_intent: [
      "outcome orientation",
      "learning effectiveness",
      "OBE alignment",
    ],
    accreditation_relevance: ["OBE", "assessment alignment"],
    weight: 1.2,
  },
  "Professional engineering standards": {
    category: "professional_values",
    semantic_intent: [
      "professional rigor",
      "engineering standards",
      "responsible practice",
    ],
    accreditation_relevance: ["professional practice", "quality"],
    weight: 1.1,
  },
  "Globally competitive graduates": {
    category: "global_positioning",
    semantic_intent: [
      "global competitiveness",
      "career mobility",
      "international relevance",
    ],
    accreditation_relevance: ["employability", "benchmarking"],
    weight: 1.0,
  },
  "Ethics and integrity": {
    category: "professional_values",
    semantic_intent: [
      "ethical responsibility",
      "integrity",
      "professional accountability",
    ],
    accreditation_relevance: ["ABET_SO4", "professional responsibility"],
    weight: 1.2,
  },
  "Sustainable development": {
    category: "sustainability_society",
    semantic_intent: [
      "sustainable development",
      "environmental stewardship",
      "long-term impact",
    ],
    accreditation_relevance: ["sustainability", "societal impact"],
    weight: 1.2,
  },
  "Human-centric engineering": {
    category: "sustainability_society",
    semantic_intent: [
      "human-centered design",
      "inclusive engineering",
      "social relevance",
    ],
    accreditation_relevance: ["public welfare", "ethics"],
    weight: 1.1,
  },
  "Responsible innovation": {
    category: "professional_values",
    semantic_intent: [
      "responsible innovation",
      "ethical innovation",
      "risk-aware progress",
    ],
    accreditation_relevance: ["ethics", "professional judgment"],
    weight: 1.2,
  },
};

const MISSION_OPTION_LIBRARY: Record<
  string,
  Omit<SemanticOptionConfig, "label">
> = {
  "Outcome Based Education": {
    category: "educational_philosophy",
    semantic_intent: [
      "outcome based education",
      "assessment alignment",
      "learning outcomes",
    ],
    accreditation_relevance: ["OBE", "continuous improvement"],
    weight: 1.2,
  },
  "Experiential learning": {
    category: "educational_philosophy",
    semantic_intent: [
      "experiential learning",
      "practice-based learning",
      "hands-on pedagogy",
    ],
    accreditation_relevance: ["curriculum effectiveness"],
    weight: 1.1,
  },
  "Strong theoretical foundation": {
    category: "educational_philosophy",
    semantic_intent: [
      "theoretical foundation",
      "conceptual rigor",
      "fundamental knowledge",
    ],
    accreditation_relevance: ["discipline depth"],
    weight: 1.0,
  },
  "Practice-oriented curriculum": {
    category: "educational_philosophy",
    semantic_intent: [
      "practice-oriented curriculum",
      "application focus",
      "industry relevance",
    ],
    accreditation_relevance: ["curriculum relevance"],
    weight: 1.1,
  },
  "Continuous academic improvement": {
    category: "educational_philosophy",
    semantic_intent: [
      "continuous improvement",
      "quality enhancement",
      "evidence-based refinement",
    ],
    accreditation_relevance: ["CQI", "quality assurance"],
    weight: 1.2,
  },
  "Industry-aligned curriculum": {
    category: "innovation_technology",
    semantic_intent: [
      "industry alignment",
      "market relevance",
      "professional readiness",
    ],
    accreditation_relevance: ["employability", "stakeholder needs"],
    weight: 1.1,
  },
  "Hands-on laboratories": {
    category: "innovation_technology",
    semantic_intent: [
      "laboratory learning",
      "experimental skills",
      "technical practice",
    ],
    accreditation_relevance: ["practical competence"],
    weight: 1.0,
  },
  "Internship-embedded learning": {
    category: "innovation_technology",
    semantic_intent: [
      "internship integration",
      "industry exposure",
      "workplace readiness",
    ],
    accreditation_relevance: ["professional preparation"],
    weight: 1.0,
  },
  "Professional skill development": {
    category: "professional_values",
    semantic_intent: [
      "professional skills",
      "career readiness",
      "workplace capability",
    ],
    accreditation_relevance: ["professional growth"],
    weight: 1.1,
  },
  "Employability enhancement": {
    category: "professional_values",
    semantic_intent: [
      "employability",
      "career progression",
      "industry readiness",
    ],
    accreditation_relevance: ["constituency needs"],
    weight: 1.0,
  },
  "Research-led teaching": {
    category: "innovation_technology",
    semantic_intent: [
      "research-led teaching",
      "inquiry mindset",
      "evidence-based learning",
    ],
    accreditation_relevance: ["innovation", "academic quality"],
    weight: 1.0,
  },
  "Innovation and entrepreneurship": {
    category: "innovation_technology",
    semantic_intent: [
      "innovation",
      "entrepreneurial mindset",
      "value creation",
    ],
    accreditation_relevance: ["industry impact", "career pathways"],
    weight: 1.1,
  },
  "Problem-based learning": {
    category: "educational_philosophy",
    semantic_intent: [
      "problem-based learning",
      "real-world context",
      "active pedagogy",
    ],
    accreditation_relevance: ["learning effectiveness"],
    weight: 1.1,
  },
  "Interdisciplinary approach": {
    category: "innovation_technology",
    semantic_intent: [
      "interdisciplinary learning",
      "cross-domain collaboration",
      "integrated thinking",
    ],
    accreditation_relevance: ["complex problem solving"],
    weight: 1.0,
  },
  "Critical thinking": {
    category: "professional_values",
    semantic_intent: [
      "critical thinking",
      "reasoned judgment",
      "analytical rigor",
    ],
    accreditation_relevance: ["professional decision making"],
    weight: 1.1,
  },
  "Problem solving": {
    category: "professional_values",
    semantic_intent: [
      "problem solving",
      "engineering judgment",
      "solution orientation",
    ],
    accreditation_relevance: ["engineering competence"],
    weight: 1.1,
  },
  "Teamwork and leadership": {
    category: "professional_values",
    semantic_intent: ["teamwork", "leadership", "collaboration"],
    accreditation_relevance: ["professional skills"],
    weight: 1.1,
  },
  "Effective communication": {
    category: "professional_values",
    semantic_intent: [
      "effective communication",
      "stakeholder engagement",
      "professional expression",
    ],
    accreditation_relevance: ["communication competency"],
    weight: 1.0,
  },
  "Ethical engineering practice": {
    category: "professional_values",
    semantic_intent: [
      "ethical engineering practice",
      "integrity",
      "public responsibility",
    ],
    accreditation_relevance: ["ABET_SO4", "ethics"],
    weight: 1.2,
  },
  "Sustainability consciousness": {
    category: "sustainability_society",
    semantic_intent: [
      "sustainability awareness",
      "environmental responsibility",
      "long-term stewardship",
    ],
    accreditation_relevance: ["sustainability", "societal impact"],
    weight: 1.2,
  },
  "Social responsibility": {
    category: "sustainability_society",
    semantic_intent: [
      "social responsibility",
      "community contribution",
      "public good",
    ],
    accreditation_relevance: ["societal impact", "ethics"],
    weight: 1.2,
  },
  "Lifelong learning mindset": {
    category: "educational_philosophy",
    semantic_intent: [
      "lifelong learning",
      "continuous growth",
      "self-directed development",
    ],
    accreditation_relevance: ["professional growth", "continuous learning"],
    weight: 1.1,
  },
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sanitizeStatement(text: string) {
  return normalizeWhitespace(text)
    .replace(/\bexcellence in\b/gi, "leadership in")
    .replace(/\bexcellence\b/gi, "leadership")
    .replace(/\bexcel in\b/gi, "advance in")
    .replace(/\bexcel\b/gi, "advance")
    .replace(/\ball graduates\b/gi, "graduates")
    .replace(/\bevery graduate\b/gi, "graduates");
}

function stripOptionPrefix(text: string) {
  return text
    .replace(/^option\s*\d+\s*:\s*/i, "")
    .replace(/^vision\s*\d+\s*:\s*/i, "")
    .replace(/^mission\s*\d+\s*:\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function ensureSentence(text: string) {
  const trimmed = normalizeWhitespace(text).replace(/[.?!]+$/, "");
  return trimmed.length > 0 ? `${trimmed}.` : trimmed;
}

function splitSentences(text: string) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clampCount(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeWhitespace(String(item))).filter(Boolean);
}

function formatList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function statementKey(statement: string) {
  return statement.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupeStatements(statements: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const statement of statements) {
    const normalized = normalizeWhitespace(statement);
    const key = statementKey(normalized);
    if (normalized && !seen.has(key)) {
      seen.add(key);
      unique.push(normalized);
    }
  }

  return unique;
}

function clampScore(value: unknown, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeStringList(value: unknown, max = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeWhitespace(String(item)))
    .filter(Boolean)
    .slice(0, max);
}

function validateInstituteContext(text: string): boolean {
  if (!text) return false;
  const cleaned = normalizeWhitespace(text).toLowerCase();
  // Filter out common placeholders and very short/low-quality inputs
  if (cleaned.length < 10) return false;
  if (
    ["hello", "nil", "n/a", "none", "not specified", "placeholder"].includes(
      cleaned,
    )
  )
    return false;
  return true;
}

function getBaselineInstituteVision(programName: string): string {
  return `To be a globally recognized institution committed to excellence in technical education, research, and societal development, fostering innovation in fields like ${programName}.`;
}

function getBaselineInstituteMission(programName: string): string {
  return `To provide quality education, foster research and innovation, and promote ethical values and sustainability for long-term societal impact through disciplinary strengths in ${programName}.`;
}

function calculateJaccardSimilarity(s1: string, s2: string): number {
  const k1 = new Set(extractKeywords(s1));
  const k2 = new Set(extractKeywords(s2));
  if (k1.size === 0 || k2.size === 0) return 0;

  const intersection = new Set([...k1].filter((x) => k2.has(x)));
  const union = new Set([...k1, ...k2]);
  return intersection.size / union.size;
}

function parseJsonResponse(rawText: string): any | null {
  const cleaned = rawText
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting the largest JSON-like block.
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue to array extraction.
    }
  }

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const candidate = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}

function parseOptions(rawText: string): string[] {
  const cleaned = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fallback handled below
  }

  return cleaned
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function extractKeywords(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function inferCategoryFromLabel(label: string): ThemeCategory {
  const lower = label.toLowerCase();

  if (
    /(global|international|benchmark|competitive|world|recognition)/.test(lower)
  ) {
    return "global_positioning";
  }
  if (
    /(innovation|technology|interdisciplinary|research|future|lab|internship)/.test(
      lower,
    )
  ) {
    return "innovation_technology";
  }
  if (/(sustain|societ|social|human|community|environment)/.test(lower)) {
    return "sustainability_society";
  }
  if (
    /(ethic|integrity|leadership|teamwork|communication|professional|responsibility)/.test(
      lower,
    )
  ) {
    return "professional_values";
  }
  if (
    /(outcome|education|learning|curriculum|academic|lifelong|theoretical|practice|problem-based)/.test(
      lower,
    )
  ) {
    return "educational_philosophy";
  }

  return "custom";
}

function buildCustomSemanticOption(label: string): SemanticOption {
  const normalizedLabel = normalizeWhitespace(label);
  const category = inferCategoryFromLabel(normalizedLabel);
  const semantic_intent = [normalizedLabel.toLowerCase()];
  const accreditation_relevance = [
    "program mission alignment",
    "quality improvement",
  ];
  const keywords = uniq(extractKeywords(normalizedLabel));

  return {
    label: normalizedLabel,
    normalizedLabel: normalizedLabel.toLowerCase(),
    category,
    semantic_intent,
    accreditation_relevance,
    weight: 1.0,
    keywords,
  };
}

function buildSemanticOption(
  label: string,
  kind: StatementKind,
): SemanticOption {
  const normalizedLabel = normalizeWhitespace(label);
  const library =
    kind === "vision" ? VISION_OPTION_LIBRARY : MISSION_OPTION_LIBRARY;
  const fromLibrary = library[normalizedLabel];

  if (!fromLibrary) {
    return buildCustomSemanticOption(normalizedLabel);
  }

  const keywords = uniq([
    ...extractKeywords(normalizedLabel),
    ...fromLibrary.semantic_intent.flatMap((phrase) => extractKeywords(phrase)),
    ...fromLibrary.accreditation_relevance.flatMap((phrase) =>
      extractKeywords(phrase),
    ),
  ]);

  return {
    label: normalizedLabel,
    normalizedLabel: normalizedLabel.toLowerCase(),
    category: fromLibrary.category,
    semantic_intent: fromLibrary.semantic_intent,
    accreditation_relevance: fromLibrary.accreditation_relevance,
    weight: fromLibrary.weight,
    keywords,
  };
}

function buildSemanticObjects(labels: string[], kind: StatementKind) {
  const dedupedLabels = uniq(
    labels.map((label) => normalizeWhitespace(label)).filter(Boolean),
  );
  return dedupedLabels.map((label) => buildSemanticOption(label, kind));
}

function resolveMissionInputsForGeneration(
  selectedMissionInputs: string[],
  visionClusters: ThemeCluster[],
) {
  if (selectedMissionInputs.length > 0) {
    return selectedMissionInputs;
  }

  const derived = uniq(
    visionClusters
      .map((cluster) => DEFAULT_MISSION_INPUT_BY_CATEGORY[cluster.category])
      .filter(Boolean),
  );

  if (derived.length > 0) {
    return derived;
  }

  return ["Outcome Based Education", "Continuous academic improvement"];
}

function buildThemeClusters(options: SemanticOption[]): ThemeCluster[] {
  const grouped = new Map<ThemeCategory, SemanticOption[]>();

  for (const option of options) {
    const current = grouped.get(option.category) || [];
    current.push(option);
    grouped.set(option.category, current);
  }

  const clusters: ThemeCluster[] = [];
  for (const [category, categoryOptions] of grouped.entries()) {
    clusters.push({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      options: categoryOptions,
      weightScore: Number(
        categoryOptions
          .reduce((sum, option) => sum + option.weight, 0)
          .toFixed(2),
      ),
      semanticIntents: uniq(
        categoryOptions.flatMap((option) => option.semantic_intent),
      ),
      accreditationTags: uniq(
        categoryOptions.flatMap((option) => option.accreditation_relevance),
      ),
    });
  }

  return clusters.sort((a, b) => b.weightScore - a.weightScore);
}

function buildDistributionPlan(
  clusters: ThemeCluster[],
  count: number,
): DistributionSlot[] {
  if (clusters.length === 0) {
    return Array.from({ length: count }, (_, index) => ({
      index,
      categories: ["custom"],
      emphasisLabels: [],
    }));
  }

  const sorted = [...clusters].sort((a, b) => b.weightScore - a.weightScore);
  const slots: DistributionSlot[] = [];
  let previousPrimary: ThemeCategory | null = null;

  for (let i = 0; i < count; i += 1) {
    let primaryIndex = i % sorted.length;
    if (
      sorted.length > 1 &&
      sorted[primaryIndex].category === previousPrimary
    ) {
      primaryIndex = (primaryIndex + 1) % sorted.length;
    }

    const primary = sorted[primaryIndex];
    const categories: ThemeCategory[] = [primary.category];

    for (
      let step = 1;
      step < sorted.length && categories.length < 4;
      step += 1
    ) {
      const candidate = sorted[(primaryIndex + step) % sorted.length];
      if (!categories.includes(candidate.category)) {
        categories.push(candidate.category);
      }
      if (categories.length >= 2 && (i + step) % 2 === 0) {
        break;
      }
    }

    if (categories.length < 2 && sorted.length > 1) {
      const backup = sorted.find(
        (cluster) => cluster.category !== primary.category,
      );
      if (backup) categories.push(backup.category);
    }

    const emphasisLabels = categories
      .flatMap(
        (category) =>
          sorted.find((cluster) => cluster.category === category)?.options[0]
            ?.label || [],
      )
      .slice(0, 4);

    slots.push({ index: i, categories, emphasisLabels });
    previousPrimary = categories[0] || null;
  }

  // Ensure each category appears at least once across the plan.
  const coveredCategories = new Set(slots.flatMap((slot) => slot.categories));
  for (const cluster of sorted) {
    if (!coveredCategories.has(cluster.category)) {
      const target = [...slots].sort(
        (a, b) => a.categories.length - b.categories.length,
      )[0];
      if (
        target &&
        !target.categories.includes(cluster.category) &&
        target.categories.length < 4
      ) {
        target.categories.push(cluster.category);
        coveredCategories.add(cluster.category);
      }
    }
  }

  return slots;
}

function containsAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBoundedTerm(text: string, term: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(term.toLowerCase())}\\b`, "i");
  return pattern.test(text);
}

function findMatchedTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.filter((term) => containsBoundedTerm(lower, term));
}

function getCoveredCategoriesForStatement(
  statement: string,
  clusters: ThemeCluster[],
) {
  return clusters
    .filter((cluster) =>
      matchesCategory(statement, cluster.category, cluster.options),
    )
    .map((cluster) => cluster.category);
}

function extractGlobalPositioningConcepts(statement: string) {
  const lower = statement.toLowerCase();
  const concepts = VISION_GLOBAL_POSITIONING_PATTERNS.filter(({ regex }) =>
    regex.test(lower),
  ).map(({ concept }) => concept);
  const globalTokenHits =
    lower.match(/\b(global|globally|international|internationally|world)\b/g) ||
    [];
  return {
    concepts: uniq(concepts),
    globalTokenHits: globalTokenHits.length,
  };
}

function getRepeatedTokenSignals(statement: string) {
  const lower = statement.toLowerCase();
  const monitoredTokens = [
    "global",
    "globally",
    "international",
    "internationally",
    "leadership",
    "distinction",
    "recognized",
    "benchmarked",
  ];

  return monitoredTokens.filter((token) => {
    const matches =
      lower.match(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g")) || [];
    return matches.length > 1;
  });
}

function normalizeRootToken(token: string) {
  let root = token.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!root || root.length <= 4) return root;

  for (const suffix of REDUNDANCY_SUFFIXES) {
    if (root.endsWith(suffix) && root.length - suffix.length >= 4) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }

  return root;
}

function getRepeatedRootSignals(statement: string) {
  const tokens = normalizeWhitespace(statement)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5 && !REDUNDANCY_STOP_WORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    const root = normalizeRootToken(token);
    if (!root || REDUNDANCY_STOP_WORDS.has(root)) continue;
    counts.set(root, (counts.get(root) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([root]) => root);
}

function getDuplicatePhraseSignals(statement: string) {
  const tokens = normalizeWhitespace(statement)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const bigramCounts = new Map<string, number>();

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const first = tokens[i];
    const second = tokens[i + 1];
    if (
      first.length < 5 ||
      second.length < 5 ||
      REDUNDANCY_STOP_WORDS.has(first) ||
      REDUNDANCY_STOP_WORDS.has(second)
    ) {
      continue;
    }

    const bigram = `${first} ${second}`;
    bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
  }

  return [...bigramCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([phrase]) => phrase);
}

function getSynonymStackingSignals(statement: string) {
  const lower = statement.toLowerCase();
  const signals: string[] = [];

  for (const group of SYNONYM_STACK_GROUPS) {
    const matched = group.terms.filter((term) =>
      new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(lower),
    );
    if (uniq(matched).length >= group.threshold) {
      signals.push(group.label);
    }
  }

  return signals;
}

function evaluateVisionStrategicQuality(
  statement: string,
  semanticOptions: SemanticOption[],
  clusters: ThemeCluster[],
) {
  const normalized = normalizeWhitespace(statement);
  const lower = normalized.toLowerCase();
  const words = normalized
    .replace(/[.?!]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  const longTermSignals = [
    "long-term",
    "long horizon",
    "future",
    "sustained",
    "enduring",
    "institutional",
  ];
  const positioningSignals = [
    "recognition",
    "recognized",
    "distinction",
    "leadership",
    "benchmarked",
  ];

  const operationalMatches = findMatchedTerms(lower, VISION_OPERATIONAL_TERMS);
  const marketingMatches = findMatchedTerms(lower, VISION_MARKETING_TERMS);
  const immediateOutcomeMatches = OUTCOME_STYLE_TERMS.filter((term) =>
    lower.includes(term),
  );
  const globalPositioning = extractGlobalPositioningConcepts(normalized);
  const coveredCategories = getCoveredCategoriesForStatement(
    normalized,
    clusters,
  );
  const repeatedTokenSignals = getRepeatedTokenSignals(normalized);
  const repeatedRootSignals = getRepeatedRootSignals(normalized);
  const duplicatePhraseSignals = getDuplicatePhraseSignals(normalized);
  const synonymStackingSignals = getSynonymStackingSignals(normalized);

  const hardViolations: string[] = [];
  if (operationalMatches.length > 0) {
    hardViolations.push(
      `operational leakage: ${uniq(operationalMatches).slice(0, 6).join(", ")}`,
    );
  }
  if (marketingMatches.length > 0) {
    hardViolations.push(
      `marketing language detected: ${uniq(marketingMatches).join(", ")}`,
    );
  }
  if (immediateOutcomeMatches.length > 0) {
    hardViolations.push("immediate-outcome language detected");
  }
  if (globalPositioning.concepts.length !== 1) {
    hardViolations.push(
      `must contain exactly one global positioning concept (found ${globalPositioning.concepts.length})`,
    );
  }
  if (globalPositioning.globalTokenHits > 1) {
    hardViolations.push("global positioning phrase stacking detected");
  }
  if (coveredCategories.length > VISION_MAX_PILLARS) {
    hardViolations.push(
      `more than ${VISION_MAX_PILLARS} strategic pillars detected`,
    );
  }
  if (repeatedRootSignals.length > 0) {
    hardViolations.push(
      `repeated root words detected: ${repeatedRootSignals.join(", ")}`,
    );
  }
  if (duplicatePhraseSignals.length > 0) {
    hardViolations.push(
      `duplicate noun phrases detected: ${duplicatePhraseSignals.join(", ")}`,
    );
  }
  if (synonymStackingSignals.length > 0) {
    hardViolations.push(
      `synonym stacking detected: ${synonymStackingSignals.join(", ")}`,
    );
  }

  let longTermAbstraction = 100;
  if (words.length < 15 || words.length > 25) {
    longTermAbstraction -= 35;
  }
  if (!longTermSignals.some((signal) => lower.includes(signal))) {
    longTermAbstraction -= 30;
  }
  if (immediateOutcomeMatches.length > 0) {
    longTermAbstraction -= 35;
  }

  let institutionalPositioning = 100;
  if (
    !VISION_POSITIONING_STARTERS.some((start) =>
      lower.startsWith(start.toLowerCase()),
    )
  ) {
    institutionalPositioning -= 35;
  }
  if (!positioningSignals.some((signal) => lower.includes(signal))) {
    institutionalPositioning -= 30;
  }
  if (globalPositioning.concepts.length !== 1) {
    institutionalPositioning -= 35;
  }

  let noOperationalLeakage = 100;
  if (operationalMatches.length > 0) {
    noOperationalLeakage = Math.max(0, 100 - operationalMatches.length * 30);
  }

  let redundancyControl = 100;
  if (repeatedTokenSignals.length > 0) {
    redundancyControl -= 40;
  }
  if (repeatedRootSignals.length > 0) {
    redundancyControl -= Math.min(65, repeatedRootSignals.length * 22);
  }
  if (duplicatePhraseSignals.length > 0) {
    redundancyControl -= Math.min(55, duplicatePhraseSignals.length * 25);
  }
  if (synonymStackingSignals.length > 0) {
    redundancyControl -= 35;
  }
  if (globalPositioning.globalTokenHits > 1) {
    redundancyControl -= 35;
  }

  let strategicClarity = 100;
  if (marketingMatches.length > 0) strategicClarity -= 40;
  if (words.length < 15 || words.length > 25) strategicClarity -= 20;
  if (coveredCategories.length > VISION_MAX_PILLARS) strategicClarity -= 35;
  if (repeatedRootSignals.length > 0) strategicClarity -= 30;
  if (duplicatePhraseSignals.length > 0) strategicClarity -= 30;
  if (synonymStackingSignals.length > 0) strategicClarity -= 25;

  let alignmentWithFocusAreas = 100;
  if (semanticOptions.length > 0) {
    const matchedOptions = semanticOptions.filter((option) =>
      matchesSemanticOption(normalized, option),
    ).length;
    const ratio = matchedOptions / semanticOptions.length;
    alignmentWithFocusAreas = Math.round(Math.min(100, ratio * 100));
  } else if (clusters.length > 0) {
    const ratio =
      coveredCategories.length / Math.min(clusters.length, VISION_MAX_PILLARS);
    alignmentWithFocusAreas = Math.round(Math.min(100, ratio * 100));
  }

  const weightedScore = Math.round(
    longTermAbstraction * 0.2 +
      institutionalPositioning * 0.2 +
      noOperationalLeakage * 0.2 +
      redundancyControl * 0.15 +
      strategicClarity * 0.15 +
      alignmentWithFocusAreas * 0.1,
  );

  const overall = clampScore(weightedScore);
  const score = hardViolations.length > 0 ? Math.min(overall, 79) : overall;

  return {
    score,
    coveredCategories,
    hardViolations,
    repeatedTokenSignals,
    repeatedRootSignals,
    duplicatePhraseSignals,
    synonymStackingSignals,
    globalConcepts: globalPositioning.concepts,
    dimensions: {
      long_term_abstraction: clampScore(longTermAbstraction),
      institutional_positioning: clampScore(institutionalPositioning),
      no_operational_leakage: clampScore(noOperationalLeakage),
      redundancy_control: clampScore(redundancyControl),
      strategic_clarity: clampScore(strategicClarity),
      alignment_with_focus_areas: clampScore(alignmentWithFocusAreas),
    },
  };
}

function getMissionPillarHits(statement: string) {
  const lower = statement.toLowerCase();
  const hits = {
    academic: MISSION_PILLAR_SIGNALS.academic.some((term) =>
      containsPhraseEvidence(lower, term),
    ),
    research_industry: MISSION_PILLAR_SIGNALS.research_industry.some((term) =>
      containsPhraseEvidence(lower, term),
    ),
    professional_standards: MISSION_PILLAR_SIGNALS.professional_standards.some(
      (term) => containsPhraseEvidence(lower, term),
    ),
    ethics_society: MISSION_PILLAR_SIGNALS.ethics_society.some((term) =>
      containsPhraseEvidence(lower, term),
    ),
  };

  return {
    ...hits,
    total: Object.values(hits).filter(Boolean).length,
  };
}

function evaluateMissionStrategicQuality(params: {
  statement: string;
  referenceVision?: string;
  semanticOptions: SemanticOption[];
  clusters: ThemeCluster[];
}) {
  const { statement, referenceVision = "", semanticOptions, clusters } = params;
  const normalized = normalizeWhitespace(statement);
  const lower = normalized.toLowerCase();
  const words = normalized
    .replace(/[.?!]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  const sentenceCount = splitSentences(normalized).length;

  const operationalHits = findMatchedTerms(lower, MISSION_OPERATIONAL_VERBS);
  const marketingHits = findMatchedTerms(lower, MISSION_MARKETING_TERMS);
  const repeatedRoots = getRepeatedRootSignals(normalized);
  const duplicatePhrases = getDuplicatePhraseSignals(normalized);
  const synonymStacking = getSynonymStackingSignals(normalized);
  const immediateOutcomeMatches = OUTCOME_STYLE_TERMS.filter((term) =>
    lower.includes(term),
  );
  const restrictedHits = [...ABSOLUTE_TERMS, ...FORBIDDEN_TERMS].filter(
    (term) => lower.includes(term),
  );
  const pillarHits = getMissionPillarHits(normalized);
  const categoryHits = getCoveredCategoriesForStatement(
    normalized,
    clusters,
  ).length;

  const overlap = referenceVision
    ? keywordOverlapRatio(referenceVision, normalized)
    : 0.35;
  const lexicalLeakage = referenceVision
    ? calculateJaccardSimilarity(referenceVision, normalized)
    : 0;
  const visionKeywordHits = referenceVision
    ? extractAlignmentKeywords(referenceVision).filter((keyword) =>
        lower.includes(keyword),
      ).length
    : 0;
  const requiredVisionKeywordHits = referenceVision
    ? Math.min(2, extractAlignmentKeywords(referenceVision).length)
    : 0;

  const hardViolations: string[] = [];
  if (operationalHits.length < 2) {
    hardViolations.push("insufficient operational action verbs in mission");
  }
  if (sentenceCount < 3 || sentenceCount > 4) {
    hardViolations.push("mission must contain 3 to 4 structured sentences");
  }
  if (pillarHits.total < 3) {
    hardViolations.push(
      "mission must operationalize at least three strategic pillars",
    );
  }
  if (repeatedRoots.length > 0) {
    hardViolations.push(
      `repeated root words detected: ${repeatedRoots.join(", ")}`,
    );
  }
  if (duplicatePhrases.length > 0) {
    hardViolations.push(
      `duplicate noun phrases detected: ${duplicatePhrases.join(", ")}`,
    );
  }
  if (synonymStacking.length > 0) {
    hardViolations.push(
      `synonym stacking detected: ${synonymStacking.join(", ")}`,
    );
  }
  if (marketingHits.length > 0) {
    hardViolations.push(
      `marketing language detected: ${marketingHits.join(", ")}`,
    );
  }
  if (immediateOutcomeMatches.length > 0) {
    hardViolations.push("immediate-outcome language detected");
  }
  if (restrictedHits.length > 0) {
    hardViolations.push(
      `restricted language detected: ${restrictedHits.join(", ")}`,
    );
  }
  if (lexicalLeakage > 0.72) {
    hardViolations.push("mission repeats vision phrasing too closely");
  }

  let alignmentWithVision = 100;
  if (referenceVision) {
    const overlapScore = Math.round(Math.min(100, overlap * 100));
    const keywordScore =
      requiredVisionKeywordHits === 0
        ? 100
        : Math.min(
            100,
            Math.round((visionKeywordHits / requiredVisionKeywordHits) * 100),
          );
    const categoryScore =
      clusters.length === 0
        ? 90
        : Math.min(100, Math.round((categoryHits / clusters.length) * 100));
    alignmentWithVision = Math.round(
      overlapScore * 0.5 + keywordScore * 0.2 + categoryScore * 0.3,
    );
  }

  let operationalClarity = 100;
  if (operationalHits.length < 2) operationalClarity -= 45;
  if (pillarHits.total < 3) operationalClarity -= 35;
  if (sentenceCount < 3 || sentenceCount > 4) operationalClarity -= 25;

  let noRedundancy = 100;
  if (repeatedRoots.length > 0)
    noRedundancy -= Math.min(65, repeatedRoots.length * 22);
  if (duplicatePhrases.length > 0)
    noRedundancy -= Math.min(60, duplicatePhrases.length * 25);
  if (synonymStacking.length > 0) noRedundancy -= 35;

  let accreditationTone = 100;
  if (marketingHits.length > 0) accreditationTone -= 45;
  if (immediateOutcomeMatches.length > 0) accreditationTone -= 40;
  if (restrictedHits.length > 0) accreditationTone -= 35;
  if (operationalHits.length < 2) accreditationTone -= 20;

  let strategicCoherence = 100;
  if (sentenceCount < 3 || sentenceCount > 4) strategicCoherence -= 35;
  if (words.length < 45 || words.length > 110) strategicCoherence -= 25;
  if (pillarHits.total < 3) strategicCoherence -= 25;
  if (lexicalLeakage > 0.72) strategicCoherence -= 30;

  const weightedScore = Math.round(
    alignmentWithVision * 0.25 +
      operationalClarity * 0.2 +
      noRedundancy * 0.15 +
      accreditationTone * 0.2 +
      strategicCoherence * 0.2,
  );

  const overall = clampScore(weightedScore);
  const score = hardViolations.length > 0 ? Math.min(overall, 79) : overall;

  return {
    score,
    hardViolations,
    dimensions: {
      alignment_with_vision: clampScore(alignmentWithVision),
      operational_clarity: clampScore(operationalClarity),
      no_redundancy: clampScore(noRedundancy),
      accreditation_tone: clampScore(accreditationTone),
      strategic_coherence: clampScore(strategicCoherence),
    },
    diagnostics: {
      operationalHits,
      repeatedRoots,
      duplicatePhrases,
      synonymStacking,
      sentenceCount,
      wordCount: words.length,
      pillarCoverage: pillarHits.total,
      lexicalLeakage: Number(lexicalLeakage.toFixed(3)),
    },
  };
}

function hasComplianceViolation(statement: string, kind: StatementKind) {
  const lower = statement.toLowerCase();
  const violations: string[] = [];

  for (const term of [...ABSOLUTE_TERMS, ...FORBIDDEN_TERMS]) {
    if (lower.includes(term)) {
      violations.push(`contains restricted phrase: "${term}"`);
    }
  }

  if (containsAny(lower, OUTCOME_STYLE_TERMS)) {
    violations.push("uses immediate-outcome wording");
  }

  if (kind === "vision") {
    const operational = findMatchedTerms(lower, VISION_OPERATIONAL_TERMS);
    for (const term of operational) {
      violations.push(`uses measurable/operational term: "${term}"`);
    }

    const marketing = findMatchedTerms(lower, VISION_MARKETING_TERMS);
    for (const term of marketing) {
      violations.push(`uses marketing tone: "${term}"`);
    }
  }

  return violations;
}

function sanitizeCompliance(statement: string, kind: StatementKind) {
  let cleaned = sanitizeStatement(statement);

  for (const term of ABSOLUTE_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(escaped, "gi"), "graduates");
  }

  cleaned = cleaned
    .replace(/\bat graduation\b/gi, "in their professional journey")
    .replace(/\bon graduation\b/gi, "in their professional journey")
    .replace(/\bstudent[s]?\s+will\s+be\s+able\s+to\b/gi, "graduates will");

  return normalizeWhitespace(cleaned);
}

function matchesSemanticOption(statement: string, option: SemanticOption) {
  const lower = statement.toLowerCase();

  if (lower.includes(option.normalizedLabel)) {
    return true;
  }

  if (
    option.semantic_intent.some((intent) =>
      lower.includes(intent.toLowerCase()),
    )
  ) {
    return true;
  }

  const keywordMatches = option.keywords.filter((keyword) =>
    lower.includes(keyword),
  ).length;
  if (option.keywords.length <= 2) {
    return keywordMatches >= 1;
  }

  return keywordMatches >= 2;
}

function matchesCategory(
  statement: string,
  category: ThemeCategory,
  optionsInCategory: SemanticOption[],
) {
  const lower = statement.toLowerCase();

  if (
    optionsInCategory.some((option) => matchesSemanticOption(statement, option))
  ) {
    return true;
  }

  const signals = CATEGORY_SIGNAL_TERMS[category] || [];
  const hits = signals.filter((term) => lower.includes(term)).length;
  return (
    hits >= 2 ||
    (signals.length > 0 && hits >= 1 && lower.includes(category.split("_")[0]))
  );
}

function categoryEvidenceScore(
  statement: string,
  category: ThemeCategory,
  optionsInCategory: SemanticOption[],
) {
  const lower = statement.toLowerCase();
  let score = 0;

  for (const option of optionsInCategory) {
    if (lower.includes(option.normalizedLabel)) {
      score += 4;
    }
    for (const intent of option.semantic_intent) {
      if (lower.includes(intent.toLowerCase())) {
        score += 2;
      }
    }
    score += option.keywords.filter((keyword) =>
      lower.includes(keyword),
    ).length;
  }

  const signals = CATEGORY_SIGNAL_TERMS[category] || [];
  const signalHits = signals.filter((term) => lower.includes(term)).length;
  score += signalHits * 2;

  return score;
}

function getDominantCategoriesForStatement(
  statement: string,
  referenceClusters: ThemeCluster[],
) {
  const categories =
    referenceClusters.length > 0
      ? referenceClusters.map((cluster) => cluster.category)
      : (Object.keys(CATEGORY_LABELS) as ThemeCategory[]).filter(
          (category) => category !== "custom",
        );

  if (categories.length === 0) {
    return ["custom"] as ThemeCategory[];
  }

  const ranked = categories
    .map((category) => {
      const options =
        referenceClusters.find((cluster) => cluster.category === category)
          ?.options || [];
      return {
        category,
        score: categoryEvidenceScore(statement, category, options),
      };
    })
    .sort((a, b) => b.score - a.score);

  const targetCount = Math.min(2, Math.max(1, categories.length));
  const dominant = ranked
    .filter((entry) => entry.score > 0)
    .slice(0, targetCount)
    .map((entry) => entry.category);

  if (dominant.length >= targetCount) {
    return dominant;
  }

  const fallbackOrder =
    referenceClusters.length > 0
      ? referenceClusters.map((cluster) => cluster.category)
      : ranked.map((entry) => entry.category);

  for (const category of fallbackOrder) {
    if (!dominant.includes(category)) {
      dominant.push(category);
    }
    if (dominant.length >= targetCount) break;
  }

  return dominant;
}

function extractAlignmentKeywords(statement: string) {
  return uniq(
    extractKeywords(statement)
      .filter(
        (word) => word.length >= 5 && !ALIGNMENT_KEYWORD_STOP_WORDS.has(word),
      )
      .slice(0, 6),
  );
}

function containsPhraseEvidence(text: string, phrase: string) {
  const lower = text.toLowerCase();
  const phraseLower = phrase.toLowerCase();

  if (lower.includes(phraseLower)) {
    return true;
  }

  const parts = phraseLower
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length >= 5);
  if (parts.length === 0) {
    return false;
  }

  return parts.some((part) => lower.includes(part));
}

function missionSupportsCategory(statement: string, category: ThemeCategory) {
  const lower = statement.toLowerCase();
  const pillars = CATEGORY_OPERATIONAL_PILLARS[category] || [];
  const signals = CATEGORY_SIGNAL_TERMS[category] || [];

  if (pillars.some((pillar) => containsPhraseEvidence(lower, pillar))) {
    return true;
  }

  const signalHits = signals.filter((signal) => lower.includes(signal)).length;
  return signalHits >= 2;
}

function getStatementStartPattern(statement: string) {
  return statement
    .toLowerCase()
    .replace(/^[^a-z0-9]+/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

function getVisionOpeningPhrase(statement: string) {
  const normalized = normalizeWhitespace(statement).toLowerCase();
  const orderedStarters = [...VISION_POSITIONING_STARTERS].sort(
    (a, b) => b.length - a.length,
  );
  for (const starter of orderedStarters) {
    if (normalized.startsWith(starter.toLowerCase())) {
      return starter;
    }
  }
  return getStatementStartPattern(statement);
}

function stripVisionOpening(statement: string) {
  let cleaned = normalizeWhitespace(statement).replace(/[.?!]+$/, "");
  const orderedStarters = [...VISION_POSITIONING_STARTERS].sort(
    (a, b) => b.length - a.length,
  );
  for (const starter of orderedStarters) {
    if (cleaned.toLowerCase().startsWith(starter.toLowerCase())) {
      cleaned = cleaned.slice(starter.length).trim();
      break;
    }
  }
  return cleaned;
}

function rewriteVisionOpening(statement: string, starter: string) {
  const body = stripVisionOpening(statement);
  const fallbackBody =
    body.length > 0
      ? body
      : "long-term institutional distinction through strategic innovation and sustainable societal contribution";
  return ensureVisionWordWindow(ensureSentence(`${starter} ${fallbackBody}`));
}

function enforceVisionSetDiversity(params: {
  statements: string[];
  clusters: ThemeCluster[];
  semanticOptions: SemanticOption[];
  fallbackFactory: (index: number) => string;
}): string[] {
  const { statements, clusters, semanticOptions, fallbackFactory } = params;
  const diversified: string[] = [];
  const usedOpenings = new Set<string>();

  for (let i = 0; i < statements.length; i += 1) {
    let candidate = statements[i];
    let attempts = 0;

    while (attempts < 6) {
      const preferredStarter =
        VISION_POSITIONING_STARTERS[
          (i + attempts) % VISION_POSITIONING_STARTERS.length
        ];
      candidate = rewriteVisionOpening(candidate, preferredStarter);

      const opening = getVisionOpeningPhrase(candidate);
      const repeatedOpening = usedOpenings.has(opening);
      const tooSimilar = diversified.some(
        (existing) =>
          calculateJaccardSimilarity(existing, candidate) >
          VISION_SIMILARITY_THRESHOLD,
      );
      const quality = evaluateVisionStrategicQuality(
        candidate,
        semanticOptions,
        clusters,
      );

      if (
        !repeatedOpening &&
        !tooSimilar &&
        quality.score >= VISION_APPROVAL_THRESHOLD
      ) {
        break;
      }

      candidate = normalizeVisionStatement(
        fallbackFactory(i + statements.length * (attempts + 1)),
        clusters,
      );
      attempts += 1;
    }

    const finalOpening = getVisionOpeningPhrase(candidate);
    usedOpenings.add(finalOpening);
    diversified.push(candidate);
  }

  return diversified;
}

function ensureVisionWordWindow(statement: string) {
  const minWords = 15;
  const maxWords = 25;
  let words = normalizeWhitespace(statement)
    .replace(/[.?!]+$/, "")
    .split(/\s+/);

  const filler = [
    "with",
    "long-term",
    "institutional",
    "aspiration",
    "for",
    "strategic",
    "distinction",
  ];
  let fillerIndex = 0;
  while (words.length < minWords) {
    words.push(filler[fillerIndex % filler.length]);
    fillerIndex += 1;
  }

  if (words.length > maxWords) {
    words = words.slice(0, maxWords);
  }

  return ensureSentence(words.join(" "));
}

function ensureMissionSentenceWindow(sentences: string[]) {
  const normalized = sentences.map((sentence) => ensureSentence(sentence));

  const support = [
    "Strengthen industry collaboration, ethical practice, and sustainability-oriented problem solving.",
    "Promote innovation, teamwork, communication, and lifelong learning for long-term professional growth.",
    "Sustain continuous academic quality enhancement aligned with institutional and program mission priorities.",
  ];

  let idx = 0;
  while (normalized.length < 3 && idx < support.length) {
    const candidate = support[idx];
    if (
      !normalized.some((line) => line.toLowerCase() === candidate.toLowerCase())
    ) {
      normalized.push(candidate);
    }
    idx += 1;
  }

  return normalized.slice(0, 5);
}

function ensureAllCategoriesReferenced(
  statement: string,
  clusters: ThemeCluster[],
  kind: StatementKind,
) {
  if (clusters.length === 0) {
    return ensureSentence(statement);
  }

  const lower = statement.toLowerCase();
  const covered = new Set<ThemeCategory>();

  for (const cluster of clusters) {
    const matched = matchesCategory(lower, cluster.category, cluster.options);
    if (matched) covered.add(cluster.category);
  }

  const maxPillars = kind === "vision" ? VISION_MAX_PILLARS : 4;
  const missingSlots = Math.max(0, maxPillars - covered.size);
  const missing = clusters
    .filter((cluster) => !covered.has(cluster.category))
    .slice(0, missingSlots);
  if (missing.length === 0) {
    return ensureSentence(statement);
  }

  const phraseCatalog =
    kind === "vision" ? VISION_PILLAR_PHRASES : CATEGORY_FOCUS_PHRASES;
  const missingPhrase = formatList(
    missing.map((cluster) => phraseCatalog[cluster.category]),
  );

  const connector =
    kind === "vision"
      ? ` while integrating ${missingPhrase}`
      : ` with integrated emphasis on ${missingPhrase}`;

  return ensureSentence(`${statement.replace(/[.?!]+$/, "")}${connector}`);
}

function diversifyVisionStarts(statements: string[]) {
  const starters = VISION_POSITIONING_STARTERS;
  const used = new Set<string>();

  return statements.map((statement, index) => {
    const currentStart = getStatementStartPattern(statement);
    if (!used.has(currentStart)) {
      used.add(currentStart);
      return statement;
    }

    const targetStarter = starters[index % starters.length];
    const body = statement.replace(
      /^[A-Za-z\-]+(?:\s+[A-Za-z\-]+){0,6}\s+/u,
      "",
    );
    const rewritten = `${targetStarter} ${body}`;
    const rewrittenPattern = getStatementStartPattern(rewritten);
    used.add(rewrittenPattern);
    return ensureVisionWordWindow(rewritten);
  });
}

function normalizeVisionStatement(
  rawStatement: string,
  clusters: ThemeCluster[],
) {
  let statement = sanitizeCompliance(stripOptionPrefix(rawStatement), "vision");
  statement = ensureSentence(statement);
  statement = ensureAllCategoriesReferenced(statement, clusters, "vision");
  statement = ensureVisionWordWindow(statement);
  return statement;
}

function normalizeMissionStatement(
  rawStatement: string,
  clusters: ThemeCluster[],
) {
  let statement = sanitizeCompliance(
    stripOptionPrefix(rawStatement),
    "mission",
  );
  let sentences = splitSentences(statement);

  if (sentences.length === 0) {
    sentences = [
      "Deliver quality engineering education through mission-aligned curriculum and continuous improvement.",
    ];
  }

  sentences = sentences.map((sentence) =>
    sanitizeCompliance(sentence, "mission"),
  );
  sentences = ensureMissionSentenceWindow(sentences);

  if (sentences.length > 0) {
    sentences[0] = ensureAllCategoriesReferenced(
      sentences[0],
      clusters,
      "mission",
    );
  }

  return sentences.map((sentence) => ensureSentence(sentence)).join(" ");
}

function fillToTargetCount(
  statements: string[],
  targetCount: number,
  fallbackFactory: (index: number) => string,
  excludedStatements: string[],
) {
  const excludedKeys = new Set(
    excludedStatements.map((item) => statementKey(item)),
  );
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const statement of dedupeStatements(statements)) {
    const key = statementKey(statement);
    if (!excludedKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      unique.push(statement);
    }
    if (unique.length >= targetCount) break;
  }

  let fallbackIndex = 0;
  while (unique.length < targetCount && fallbackIndex < targetCount * 40) {
    const candidate = normalizeWhitespace(fallbackFactory(fallbackIndex));
    const key = statementKey(candidate);
    if (candidate && !excludedKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
    fallbackIndex += 1;
  }

  return unique.slice(0, targetCount);
}

function buildVisionFallbackStatement(
  programName: string,
  slot: DistributionSlot,
  index: number,
) {
  const selectedCategories = slot.categories.slice(0, VISION_MAX_PILLARS);
  const focusPhrase = formatList(
    selectedCategories.map((category) => VISION_PILLAR_PHRASES[category]),
  );
  const variants = [
    `To be globally recognized for long-term ${programName} distinction through ${focusPhrase} with sustained institutional and societal impact`,
    `To emerge as a long-horizon ${programName} benchmark for globally respected distinction through ${focusPhrase} and enduring strategic relevance`,
    `To achieve distinction in ${programName} through sustained ${focusPhrase} and long-term institutional contribution`,
    `To advance as a leading ${programName} program through sustained ${focusPhrase}, institutional leadership, and enduring strategic contribution`,
    `To be globally respected for sustained ${programName} excellence through ${focusPhrase} with long-horizon societal relevance`,
  ];

  return ensureSentence(variants[index % variants.length]);
}

function buildMissionFallbackStatement(
  programName: string,
  slot: DistributionSlot,
  index: number,
) {
  const focusPhrase = formatList(
    slot.categories.map((category) => CATEGORY_FOCUS_PHRASES[category]),
  );
  const openings = [
    `Deliver ${programName} education with integrated emphasis on ${focusPhrase} through continuous academic quality improvement.`,
    `Provide an outcome-oriented ${programName} curriculum aligned with ${focusPhrase}, professional ethics, and institutional mission priorities.`,
    `Implement learner-centered ${programName} pathways that translate ${focusPhrase} into sustainable professional and societal impact.`,
    `Strengthen ${programName} teaching-learning systems by embedding ${focusPhrase} across curriculum, pedagogy, and stakeholder engagement.`,
    `Advance ${programName} program mission through coherent academic processes anchored in ${focusPhrase} and responsible engineering practice.`,
  ];

  return [
    openings[index % openings.length],
    "Strengthen industry collaboration, ethical practice, and sustainability-oriented problem solving.",
    "Promote innovation, teamwork, communication, and lifelong learning for long-term professional growth.",
  ].join(" ");
}

function buildMissionQualityFallbackStatement(index: number) {
  const variants = [
    "Deliver a rigorous program curriculum through outcome-based education, continuous assessment, and evidence-driven academic improvement.",
    `Strengthen research engagement, industry collaboration, and hands-on practice to align graduate preparation with professional engineering standards.`,
    `Foster ethical responsibility, innovation capability, and societal awareness to sustain long-term professional growth and community impact.`,
  ];

  const rotated = [
    variants[index % variants.length],
    variants[(index + 1) % variants.length],
    variants[(index + 2) % variants.length],
  ];

  return rotated.join(" ");
}

function buildCoupledMissionHints(
  visions: string[],
  visionClusters: ThemeCluster[],
  missionClusters: ThemeCluster[],
) {
  const referenceClusters =
    visionClusters.length > 0 ? visionClusters : missionClusters;

  return visions.map((vision, index) => {
    const dominantCategories = getDominantCategoriesForStatement(
      vision,
      referenceClusters,
    );
    const focusKeywords = extractAlignmentKeywords(vision);
    const requiredPillars = uniq(
      dominantCategories.flatMap(
        (category) => CATEGORY_OPERATIONAL_PILLARS[category] || [],
      ),
    ).slice(0, 5);

    return {
      index,
      vision,
      dominantCategories,
      focusKeywords,
      requiredPillars,
    } satisfies CoupledMissionHint;
  });
}

function buildCoupledMissionFallbackStatement(
  programName: string,
  hint: CoupledMissionHint,
  index: number,
) {
  const focusPhrase = formatList(
    hint.dominantCategories.map((category) => CATEGORY_FOCUS_PHRASES[category]),
  );
  const pillarPhrase = formatList(hint.requiredPillars.slice(0, 3));
  const keywordPhrase = formatList(hint.focusKeywords.slice(0, 2));

  const openings = [
    `To realize this ${programName} vision, we implement mission-driven academic systems focused on ${focusPhrase} through coherent curriculum and quality enhancement.`,
    `We operationalize this ${programName} vision by strengthening ${focusPhrase} through structured teaching-learning processes, institutional review, and stakeholder partnerships.`,
    `This ${programName} mission advances ${focusPhrase} by integrating curricular rigor, research engagement, and professional responsibility in every stage of program delivery.`,
  ];

  return [
    openings[index % openings.length],
    `Translate the vision intent into practice through ${pillarPhrase || "continuous improvement, research engagement, and ethical practice"}.`,
    `Sustain long-term relevance through industry engagement, societal contribution, and context-aware implementation${keywordPhrase ? ` aligned with ${keywordPhrase}` : ""}.`,
  ].join(" ");
}

function buildVisionMissionPairs(visions: string[], missions: string[]) {
  const pairCount = Math.min(visions.length, missions.length);
  const pairs: VisionMissionPair[] = [];

  for (let i = 0; i < pairCount; i += 1) {
    pairs.push({
      vision: visions[i],
      mission: missions[i],
    });
  }

  return pairs;
}

function validateVisionMissionAlignment(params: {
  visions: string[];
  missions: string[];
  hints: CoupledMissionHint[];
  missionClusters: ThemeCluster[];
}) {
  const { visions, missions, hints, missionClusters } = params;

  const details: PairAlignmentDetail[] = [];
  const violations: string[] = [];

  if (visions.length !== missions.length) {
    violations.push(
      `Vision and Mission count mismatch for coupled mode (visions: ${visions.length}, missions: ${missions.length}).`,
    );
  }

  const count = Math.min(visions.length, missions.length);
  for (let i = 0; i < count; i += 1) {
    const vision = visions[i];
    const mission = missions[i];
    const hint = hints[i];

    const requiredCategories = hint?.dominantCategories || ["custom"];
    const coveredCategories = requiredCategories.filter((category) => {
      const options =
        missionClusters.find((cluster) => cluster.category === category)
          ?.options || [];
      return (
        matchesCategory(mission, category, options) ||
        missionSupportsCategory(mission, category)
      );
    });

    const missingCategories = requiredCategories.filter(
      (category) => !coveredCategories.includes(category),
    );

    const keywordHits = (hint?.focusKeywords || []).filter((keyword) =>
      mission.toLowerCase().includes(keyword),
    );
    const requiredKeywordHits = (hint?.focusKeywords?.length || 0) >= 3 ? 1 : 0;
    const missingOperationalPillars = (hint?.requiredPillars || []).filter(
      (pillar) => !containsPhraseEvidence(mission, pillar),
    );

    const categoryScore =
      requiredCategories.length === 0
        ? 100
        : Math.round(
            (coveredCategories.length / requiredCategories.length) * 100,
          );
    const keywordScore =
      requiredKeywordHits === 0
        ? 100
        : Math.min(
            100,
            Math.round((keywordHits.length / requiredKeywordHits) * 100),
          );
    const minPillarHits = Math.min(2, hint?.requiredPillars?.length || 0);
    const actualPillarHits =
      (hint?.requiredPillars?.length || 0) - missingOperationalPillars.length;
    const pillarScore =
      minPillarHits === 0
        ? 100
        : Math.min(100, Math.round((actualPillarHits / minPillarHits) * 100));
    const score = Math.round(
      categoryScore * 0.5 + keywordScore * 0.2 + pillarScore * 0.3,
    );

    if (missingCategories.length > 0) {
      violations.push(
        `Pair ${i + 1}: Mission does not operationalize vision categories ${missingCategories
          .map((category) => CATEGORY_LABELS[category])
          .join(", ")}.`,
      );
    }
    if (requiredKeywordHits > 0 && keywordHits.length < requiredKeywordHits) {
      violations.push(
        `Pair ${i + 1}: Mission language is weakly aligned with the associated vision intent.`,
      );
    }
    if (minPillarHits > 0 && actualPillarHits < minPillarHits) {
      violations.push(
        `Pair ${i + 1}: Mission is missing operational pirllars expected from the associated vision emphasis.`,
      );
    }

    details.push({
      index: i,
      vision,
      mission,
      requiredCategories: requiredCategories.map(
        (category) => CATEGORY_LABELS[category],
      ),
      coveredCategories: coveredCategories.map(
        (category) => CATEGORY_LABELS[category],
      ),
      keywordHits,
      missingCategories: missingCategories.map(
        (category) => CATEGORY_LABELS[category],
      ),
      missingOperationalPillars,
      score,
    });
  }

  const totalScore =
    details.length === 0
      ? 0
      : Math.round(
          details.reduce((sum, detail) => sum + detail.score, 0) /
            details.length,
        );

  const pass = violations.length === 0 && totalScore >= 80;

  return {
    totalScore,
    pass,
    details,
    violations,
  } satisfies PairAlignmentResult;
}

function keywordOverlapRatio(source: string, target: string) {
  const sourceKeywords = new Set(
    extractKeywords(source).filter((word) => word.length >= 5),
  );
  const targetKeywords = new Set(
    extractKeywords(target).filter((word) => word.length >= 5),
  );

  if (sourceKeywords.size === 0 || targetKeywords.size === 0) {
    return 0;
  }

  const intersection = [...sourceKeywords].filter((keyword) =>
    targetKeywords.has(keyword),
  ).length;
  const union = new Set([...sourceKeywords, ...targetKeywords]).size;
  return union === 0 ? 0 : intersection / union;
}

function detectKpiCategories(vision: string, mission: string) {
  const corpus = `${vision} ${mission}`.toLowerCase();
  const categories = KPI_CATEGORY_SIGNALS.filter((signal) =>
    signal.terms.some((term) => corpus.includes(term.toLowerCase())),
  ).map((signal) => signal.category);

  return categories.length > 0
    ? categories
    : ["Curriculum and Learning Quality"];
}

function buildStrategicValidationPrompt(params: {
  programName: string;
  instituteVision: string;
  instituteMission: string;
  pairs: VisionMissionPair[];
  approvalThreshold: number;
}) {
  const {
    programName,
    instituteVision,
    instituteMission,
    pairs,
    approvalThreshold,
  } = params;

  const pairPayload = pairs.map((pair, index) => ({
    index: index + 1,
    vision: pair.vision,
    mission: pair.mission,
  }));

  return `
You are a Strategic Accreditation Evaluator.

Evaluate each Vision and Mission pair logically and structurally for the program "${programName}".
Institute Vision Context: ${instituteVision || "Not specified"}
Institute Mission Context: ${instituteMission || "Not specified"}

Pairs:
${JSON.stringify(pairPayload, null, 2)}

Framework:
1. Long-Term Validity Check (Vision): 10-15 year aspiration, broadness, realism, and long-horizon wording.
2. Strategic Alignment Check: whether Mission explains HOW Vision will be achieved; map Vision intent to Mission pillars.
3. Measurability Logic: identify feasible KPI categories for major Vision/Mission clauses.
4. Feasibility and Realism: flag exaggerated or absolute commitments.
5. Accreditation Compatibility (ABET/NBA style): strategic tone, no classroom-level operational verbs, no vague-only language.
6. Redundancy and Logical Flow: detect direct repetition and weak progression from Vision to Mission.
7. Mission Decomposition Check: Ensure the Mission sentences explicitly map to strict operational pillars: Curriculum, Research, Industry, Ethics, Sustainability.
8. Scoring (0-100): vision_quality, mission_quality, alignment_strength, measurability_potential, overall_strategic_soundness.

Output requirements:
- Return STRICT JSON only.
- Return one item per pair in the same order.
- Use this schema:
{
  "items": [
    {
      "index": 1,
      "scores": {
        "vision_quality": 0,
        "mission_quality": 0,
        "alignment_strength": 0,
        "measurability_potential": 0,
        "overall_strategic_soundness": 0
      },
      "long_term_issues": [],
      "alignment_gaps": [],
      "mission_pillars": [],
      "missing_mission_pillars": [],
      "kpi_categories": [],
      "realism_flags": [],
      "accreditation_flags": [],
      "flow_flags": [],
      "identified_weaknesses": [],
      "rewrite_suggestions": [],
      "final_verdict": ""
    }
  ],
  "overall_average": 0,
  "approved": false
}

Rules:
- Be strict and analytical.
- Do not rewrite unless weaknesses are found.
- Set "approved" true only if overall_average >= ${approvalThreshold} and no critical gaps.
`;
}

function buildFallbackStrategicValidation(params: {
  pairs: VisionMissionPair[];
  approvalThreshold: number;
  alignmentResult?: PairAlignmentResult | null;
}): StrategicValidationSummary {
  const { pairs, approvalThreshold, alignmentResult } = params;

  const items: StrategicValidationItem[] = pairs.map((pair, idx) => {
    const vision = normalizeWhitespace(pair.vision);
    const mission = normalizeWhitespace(pair.mission);

    const visionIssues: string[] = [];
    const missionIssues: string[] = [];
    const realismFlags: string[] = [];
    const accreditationFlags: string[] = [];
    const flowFlags: string[] = [];
    const alignmentDetail = alignmentResult?.details[idx];

    const visionWordCount = vision
      .replace(/[.?!]+$/, "")
      .split(/\s+/)
      .filter(Boolean).length;
    if (visionWordCount < 15 || visionWordCount > 25) {
      visionIssues.push(
        "Vision length is outside the preferred 15-25 word window.",
      );
    }

    const visionCompliance = hasComplianceViolation(vision, "vision");
    const missionCompliance = hasComplianceViolation(mission, "mission");

    visionIssues.push(
      ...visionCompliance
        .filter(
          (issue) =>
            issue.includes("measurable/operational verb") ||
            issue.includes("immediate-outcome"),
        )
        .map((issue) => `Vision ${issue}.`),
    );
    missionIssues.push(
      ...missionCompliance
        .filter((issue) => issue.includes("immediate-outcome"))
        .map((issue) => `Mission ${issue}.`),
    );

    const combinedLower = `${vision} ${mission}`.toLowerCase();
    for (const restricted of [...ABSOLUTE_TERMS, ...FORBIDDEN_TERMS]) {
      if (combinedLower.includes(restricted)) {
        realismFlags.push(
          `Contains unrealistic or absolute wording: "${restricted}".`,
        );
      }
    }

    for (const verb of VISION_MEASURABLE_VERBS) {
      if (mission.toLowerCase().includes(verb)) {
        accreditationFlags.push(
          `Mission uses classroom-level operational verb "${verb}".`,
        );
      }
    }

    const overlap = keywordOverlapRatio(vision, mission);
    if (!alignmentDetail) {
      if (overlap > 0.65) {
        flowFlags.push("Mission repeats Vision wording too closely.");
      }
      if (overlap < 0.15) {
        flowFlags.push(
          "Mission has weak lexical continuity with the Vision intent.",
        );
      }
    }

    const alignmentGaps: string[] = [];
    if (alignmentDetail?.missingCategories?.length) {
      alignmentGaps.push(
        `Missing category alignment: ${alignmentDetail.missingCategories.join(", ")}.`,
      );
    }
    if (alignmentDetail?.missingOperationalPillars?.length) {
      alignmentGaps.push(
        `Missing operational pillars: ${alignmentDetail.missingOperationalPillars.join(", ")}.`,
      );
    }

    const kpiCategories = detectKpiCategories(vision, mission);

    const visionQuality = clampScore(
      100 - visionIssues.length * 12 - visionCompliance.length * 8,
      72,
    );
    const missionQuality = clampScore(
      100 -
        missionIssues.length * 10 -
        missionCompliance.length * 8 -
        accreditationFlags.length * 10,
      72,
    );
    const alignmentStrength = clampScore(
      alignmentDetail?.score ??
        Math.round(60 + overlap * 40 - alignmentGaps.length * 12),
      70,
    );
    const measurabilityPotential = clampScore(
      52 +
        kpiCategories.length * 9 -
        alignmentGaps.length * 8 -
        realismFlags.length * 6,
      68,
    );
    const overall = clampScore(
      (visionQuality +
        missionQuality +
        alignmentStrength +
        measurabilityPotential) /
        4,
      70,
    );

    const identifiedWeaknesses = uniq([
      ...visionIssues,
      ...alignmentGaps,
      ...realismFlags,
      ...accreditationFlags,
      ...flowFlags,
    ]).slice(0, 10);

    const rewriteSuggestions: string[] = [];
    if (visionIssues.length > 0) {
      rewriteSuggestions.push(
        "Use long-horizon aspirational language in Vision and avoid short-term operational verbs.",
      );
    }
    if (alignmentGaps.length > 0) {
      rewriteSuggestions.push(
        "Convert each missing Vision theme into explicit Mission action pillars (curriculum, research, collaboration, ethics, sustainability).",
      );
    }
    if (realismFlags.length > 0) {
      rewriteSuggestions.push(
        "Replace absolute promises with attainable and assessable institutional commitments.",
      );
    }
    if (flowFlags.length > 0) {
      rewriteSuggestions.push(
        "Improve progression: Vision states destination, Mission states operational pathway.",
      );
    }

    const verdict =
      overall >= approvalThreshold && identifiedWeaknesses.length === 0
        ? "Approved for strategic use."
        : overall >= approvalThreshold
          ? "Conditionally acceptable with minor refinements."
          : "Needs refinement before approval.";

    return {
      index: idx + 1,
      vision,
      mission,
      scores: {
        vision_quality: visionQuality,
        mission_quality: missionQuality,
        alignment_strength: alignmentStrength,
        measurability_potential: measurabilityPotential,
        overall_strategic_soundness: overall,
      },
      long_term_issues: visionIssues,
      alignment_gaps: alignmentGaps,
      mission_pillars: [],
      missing_mission_pillars: [],
      kpi_categories: kpiCategories,
      realism_flags: realismFlags,
      accreditation_flags: accreditationFlags,
      flow_flags: flowFlags,
      identified_weaknesses: identifiedWeaknesses,
      rewrite_suggestions: rewriteSuggestions,
      final_verdict: verdict,
    };
  });

  const overallAverage =
    items.length === 0
      ? 0
      : clampScore(
          items.reduce(
            (sum, item) => sum + item.scores.overall_strategic_soundness,
            0,
          ) / items.length,
        );

  const approved =
    items.length > 0 &&
    overallAverage >= approvalThreshold &&
    items.every(
      (item) => item.scores.overall_strategic_soundness >= approvalThreshold,
    );

  return {
    validator: "SLCA",
    approval_threshold: approvalThreshold,
    overall_average: overallAverage,
    approved,
    items,
    source: "fallback",
  };
}

function normalizeAiStrategicValidation(params: {
  parsed: any;
  pairs: VisionMissionPair[];
  approvalThreshold: number;
  fallback: StrategicValidationSummary;
}): StrategicValidationSummary {
  const { parsed, pairs, approvalThreshold, fallback } = params;
  const rawItems: any[] = Array.isArray(parsed?.items)
    ? parsed.items
    : Array.isArray(parsed)
      ? parsed
      : [];

  const items: StrategicValidationItem[] = pairs.map((pair, idx) => {
    const fallbackItem = fallback.items[idx];
    const candidate =
      rawItems.find(
        (item) =>
          Number(item?.index) === idx + 1 || Number(item?.index) === idx,
      ) || rawItems[idx];

    if (!candidate || typeof candidate !== "object") {
      return fallbackItem;
    }

    const candidateScores = candidate.scores || candidate;
    const scores: StrategicValidationScores = {
      vision_quality: clampScore(
        candidateScores.vision_quality,
        fallbackItem.scores.vision_quality,
      ),
      mission_quality: clampScore(
        candidateScores.mission_quality,
        fallbackItem.scores.mission_quality,
      ),
      alignment_strength: clampScore(
        candidateScores.alignment_strength,
        fallbackItem.scores.alignment_strength,
      ),
      measurability_potential: clampScore(
        candidateScores.measurability_potential,
        fallbackItem.scores.measurability_potential,
      ),
      overall_strategic_soundness: clampScore(
        candidateScores.overall_strategic_soundness,
        fallbackItem.scores.overall_strategic_soundness,
      ),
    };

    return {
      index: idx + 1,
      vision: normalizeWhitespace(String(candidate.vision || pair.vision)),
      mission: normalizeWhitespace(String(candidate.mission || pair.mission)),
      scores,
      long_term_issues: normalizeStringList(candidate.long_term_issues),
      alignment_gaps: normalizeStringList(candidate.alignment_gaps),
      mission_pillars: normalizeStringList(candidate.mission_pillars),
      missing_mission_pillars: normalizeStringList(
        candidate.missing_mission_pillars,
      ),
      kpi_categories: normalizeStringList(candidate.kpi_categories),
      realism_flags: normalizeStringList(candidate.realism_flags),
      accreditation_flags: normalizeStringList(candidate.accreditation_flags),
      flow_flags: normalizeStringList(candidate.flow_flags),
      identified_weaknesses: normalizeStringList(
        candidate.identified_weaknesses,
        12,
      ),
      rewrite_suggestions: normalizeStringList(
        candidate.rewrite_suggestions,
        8,
      ),
      final_verdict: normalizeWhitespace(
        String(candidate.final_verdict || fallbackItem.final_verdict),
      ),
    };
  });

  const computedAverage =
    items.length === 0
      ? 0
      : clampScore(
          items.reduce(
            (sum, item) => sum + item.scores.overall_strategic_soundness,
            0,
          ) / items.length,
        );

  const overallAverage = clampScore(parsed?.overall_average, computedAverage);
  const approvedFromItems =
    items.length > 0 &&
    overallAverage >= approvalThreshold &&
    items.every(
      (item) => item.scores.overall_strategic_soundness >= approvalThreshold,
    );
  const approved =
    typeof parsed?.approved === "boolean"
      ? parsed.approved && approvedFromItems
      : approvedFromItems;

  return {
    validator: "SLCA",
    approval_threshold: approvalThreshold,
    overall_average: overallAverage,
    approved,
    items,
    source: "ai",
  };
}

async function evaluateStrategicValidation(params: {
  programName: string;
  instituteVision: string;
  instituteMission: string;
  pairs: VisionMissionPair[];
  approvalThreshold: number;
  alignmentResult?: PairAlignmentResult | null;
}): Promise<StrategicValidationSummary | null> {
  const {
    programName,
    instituteVision,
    instituteMission,
    pairs,
    approvalThreshold,
    alignmentResult,
  } = params;

  if (pairs.length === 0) {
    return null;
  }

  const fallback = buildFallbackStrategicValidation({
    pairs,
    approvalThreshold,
    alignmentResult,
  });

  try {
    const prompt = buildStrategicValidationPrompt({
      programName,
      instituteVision,
      instituteMission,
      pairs,
      approvalThreshold,
    });
    const raw = await callGemini(prompt);
    const parsed = parseJsonResponse(raw);
    if (!parsed) {
      return fallback;
    }
    return normalizeAiStrategicValidation({
      parsed,
      pairs,
      approvalThreshold,
      fallback,
    });
  } catch {
    return fallback;
  }
}

function calculateCoverage(
  statements: string[],
  semanticOptions: SemanticOption[],
  clusters: ThemeCluster[],
) {
  const missingThemes: string[] = [];
  const coveredThemeKeys = new Set<string>();
  const perStatementCoverage: Array<{
    statement: string;
    coveredThemes: number;
    coveredCategories: string[];
  }> = [];

  for (const statement of statements) {
    const coveredOptions = semanticOptions.filter((option) =>
      matchesSemanticOption(statement, option),
    );
    const coveredCategories = clusters
      .filter((cluster) =>
        matchesCategory(statement, cluster.category, cluster.options),
      )
      .map((cluster) => CATEGORY_LABELS[cluster.category]);
    perStatementCoverage.push({
      statement,
      coveredThemes: coveredOptions.length,
      coveredCategories,
    });

    for (const option of coveredOptions) {
      coveredThemeKeys.add(option.normalizedLabel);
    }
  }

  for (const option of semanticOptions) {
    if (!coveredThemeKeys.has(option.normalizedLabel)) {
      missingThemes.push(option.label);
    }
  }

  const requiredCategories = uniq(clusters.map((cluster) => cluster.category));
  const missingCategories = requiredCategories.filter((category) => {
    const categoryOptions =
      clusters.find((cluster) => cluster.category === category)?.options || [];
    const categoryCovered = statements.some((statement) =>
      matchesCategory(statement, category, categoryOptions),
    );
    return !categoryCovered;
  });

  const avgThemeCoverage =
    perStatementCoverage.length === 0 || semanticOptions.length === 0
      ? 0
      : perStatementCoverage.reduce(
          (sum, item) => sum + item.coveredThemes / semanticOptions.length,
          0,
        ) / perStatementCoverage.length;

  const themeCoverageScore = Math.round(
    ((semanticOptions.length - missingThemes.length) /
      Math.max(semanticOptions.length, 1)) *
      70 +
      avgThemeCoverage * 30,
  );

  return {
    perStatementCoverage,
    missingThemes,
    missingCategories: missingCategories.map(
      (category) => CATEGORY_LABELS[category],
    ),
    themeCoverageScore: Math.max(0, Math.min(100, themeCoverageScore)),
  };
}

function evaluateStructuralDiversity(statements: string[]) {
  if (statements.length === 0) {
    return { score: 0, repeatedStartPattern: false, highSimilarity: false };
  }

  const starts = statements.map((statement) =>
    getStatementStartPattern(statement),
  );
  const uniqueStarts = new Set(starts);
  const repeatedStartPattern = uniqueStarts.size === 1 && statements.length > 1;

  // New: Jaccard Similarity Check to catch mission paragraphs that are too similar
  let maxSimilarity = 0;
  for (let i = 0; i < statements.length; i++) {
    for (let j = i + 1; j < statements.length; j++) {
      const sim = calculateJaccardSimilarity(statements[i], statements[j]);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }
  }

  const highSimilarity = maxSimilarity > 0.6; // Threshold for suspicious similarity

  let score = Math.round((uniqueStarts.size / statements.length) * 100);
  if (highSimilarity) score = Math.min(score, 50); // Penalize score if similarity is high

  return { score, repeatedStartPattern, highSimilarity };
}

function evaluateCompliance(statements: string[], kind: StatementKind) {
  const violations: string[] = [];

  statements.forEach((statement, idx) => {
    const issues = hasComplianceViolation(statement, kind);
    issues.forEach((issue) =>
      violations.push(`Statement ${idx + 1}: ${issue}`),
    );
  });

  const score = Math.max(0, 100 - violations.length * 15);
  return { score, violations };
}

function evaluateLinguisticQuality(statements: string[], kind: StatementKind) {
  if (statements.length === 0) return 0;

  let validCount = 0;

  for (const statement of statements) {
    const words = normalizeWhitespace(statement)
      .replace(/[.?!]+$/, "")
      .split(/\s+/);

    if (kind === "vision") {
      if (words.length >= 15 && words.length <= 25) {
        validCount += 1;
      }
      continue;
    }

    const sentenceCount = splitSentences(statement).length;
    if (
      words.length >= 35 &&
      words.length <= 120 &&
      sentenceCount >= 3 &&
      sentenceCount <= 5
    ) {
      validCount += 1;
    }
  }

  return Math.round((validCount / statements.length) * 100);
}

function evaluateStrategicBalance(
  statements: string[],
  clusters: ThemeCluster[],
  distributionPlan: DistributionSlot[],
) {
  if (statements.length === 0 || clusters.length === 0) {
    return 0;
  }

  let passCount = 0;

  for (let i = 0; i < statements.length; i += 1) {
    const slot = distributionPlan[i % distributionPlan.length];
    const statement = statements[i];

    const coveredCategories = new Set<ThemeCategory>();
    for (const cluster of clusters) {
      const covered = matchesCategory(
        statement,
        cluster.category,
        cluster.options,
      );
      if (covered) coveredCategories.add(cluster.category);
    }

    const overlap = slot.categories.filter((category) =>
      coveredCategories.has(category),
    ).length;
    const hasCategoryBreadth =
      coveredCategories.size >= Math.min(2, clusters.length);
    if (overlap >= 1 && hasCategoryBreadth) {
      passCount += 1;
    }
  }

  return Math.round((passCount / statements.length) * 100);
}

function evaluateVisionGovernanceSet(
  statements: string[],
  semanticOptions: SemanticOption[],
  clusters: ThemeCluster[],
) {
  const perStatement = statements.map((statement, index) => {
    const assessment = evaluateVisionStrategicQuality(
      statement,
      semanticOptions,
      clusters,
    );
    return {
      index,
      statement,
      ...assessment,
    };
  });

  const averageScore =
    perStatement.length === 0
      ? 0
      : Math.round(
          perStatement.reduce((sum, item) => sum + item.score, 0) /
            perStatement.length,
        );

  const violations: string[] = [];
  const openings = new Set<string>();
  for (const item of perStatement) {
    if (item.hardViolations.length > 0) {
      for (const violation of item.hardViolations) {
        violations.push(`Statement ${item.index + 1}: ${violation}`);
      }
    }
    if (item.score < VISION_APPROVAL_THRESHOLD) {
      violations.push(
        `Statement ${item.index + 1}: strategic score ${item.score} is below required threshold ${VISION_APPROVAL_THRESHOLD}`,
      );
    }
    if (item.repeatedTokenSignals.length > 0) {
      violations.push(
        `Statement ${item.index + 1}: phrase redundancy detected (${item.repeatedTokenSignals.join(", ")})`,
      );
    }
    if (item.repeatedRootSignals.length > 0) {
      violations.push(
        `Statement ${item.index + 1}: repeated root words detected (${item.repeatedRootSignals.join(", ")})`,
      );
    }
    if (item.duplicatePhraseSignals.length > 0) {
      violations.push(
        `Statement ${item.index + 1}: duplicate noun phrases detected (${item.duplicatePhraseSignals.join(", ")})`,
      );
    }
    if (item.synonymStackingSignals.length > 0) {
      violations.push(
        `Statement ${item.index + 1}: synonym stacking detected (${item.synonymStackingSignals.join(", ")})`,
      );
    }

    const opening = getVisionOpeningPhrase(item.statement);
    if (openings.has(opening)) {
      violations.push(
        `Statement ${item.index + 1}: opening phrase repeats another Vision statement.`,
      );
    }
    openings.add(opening);
  }

  for (let i = 0; i < perStatement.length; i += 1) {
    for (let j = i + 1; j < perStatement.length; j += 1) {
      const similarity = calculateJaccardSimilarity(
        perStatement[i].statement,
        perStatement[j].statement,
      );
      if (similarity > VISION_SIMILARITY_THRESHOLD) {
        violations.push(
          `Statements ${i + 1} and ${j + 1}: structural similarity ${Math.round(similarity * 100)}% exceeds threshold.`,
        );
      }
    }
  }

  const pass =
    perStatement.length > 0 &&
    perStatement.every((item) => item.score >= VISION_APPROVAL_THRESHOLD);

  return {
    averageScore,
    pass,
    violations,
    perStatement,
  };
}

function evaluateMissionGovernanceSet(params: {
  statements: string[];
  referenceVisions: string[];
  semanticOptions: SemanticOption[];
  clusters: ThemeCluster[];
}) {
  const { statements, referenceVisions, semanticOptions, clusters } = params;
  const perStatement = statements.map((statement, index) => {
    const referenceVision =
      referenceVisions[index] || referenceVisions[0] || "";
    const assessment = evaluateMissionStrategicQuality({
      statement,
      referenceVision,
      semanticOptions,
      clusters,
    });
    return {
      index,
      statement,
      ...assessment,
    };
  });

  const averageScore =
    perStatement.length === 0
      ? 0
      : Math.round(
          perStatement.reduce((sum, item) => sum + item.score, 0) /
            perStatement.length,
        );

  const violations: string[] = [];
  for (const item of perStatement) {
    if (item.hardViolations.length > 0) {
      for (const violation of item.hardViolations) {
        violations.push(`Statement ${item.index + 1}: ${violation}`);
      }
    }
    if (item.score < MISSION_APPROVAL_THRESHOLD) {
      violations.push(
        `Statement ${item.index + 1}: mission score ${item.score} is below required threshold ${MISSION_APPROVAL_THRESHOLD}`,
      );
    }
  }

  for (let i = 0; i < perStatement.length; i += 1) {
    for (let j = i + 1; j < perStatement.length; j += 1) {
      const similarity = calculateJaccardSimilarity(
        perStatement[i].statement,
        perStatement[j].statement,
      );
      if (similarity > 0.7) {
        violations.push(
          `Statements ${i + 1} and ${j + 1}: mission similarity ${Math.round(similarity * 100)}% exceeds threshold.`,
        );
      }
    }
  }

  const pass =
    perStatement.length > 0 &&
    perStatement.every((item) => item.score >= MISSION_APPROVAL_THRESHOLD);
  return {
    averageScore,
    pass,
    violations,
    perStatement,
  };
}

function validateStatements(
  kind: StatementKind,
  statements: string[],
  semanticOptions: SemanticOption[],
  clusters: ThemeCluster[],
  distributionPlan: DistributionSlot[],
  excludedStatements: string[],
  referenceVisions: string[] = [],
): ValidationResult {
  const violations: string[] = [];
  const deduped = dedupeStatements(statements);

  if (deduped.length !== statements.length) {
    violations.push("duplicate statements detected in the generated set");
  }

  const excludedKeys = new Set(
    excludedStatements.map((item) => statementKey(item)),
  );
  for (let i = 0; i < statements.length; i += 1) {
    if (excludedKeys.has(statementKey(statements[i]))) {
      violations.push(
        `Statement ${i + 1}: repeats a previously generated statement`,
      );
    }
  }

  const coverage = calculateCoverage(statements, semanticOptions, clusters);
  const diversity = evaluateStructuralDiversity(statements);
  const compliance = evaluateCompliance(statements, kind);
  const linguisticQuality = evaluateLinguisticQuality(statements, kind);
  const strategicBalance = evaluateStrategicBalance(
    statements,
    clusters,
    distributionPlan,
  );

  violations.push(...compliance.violations);

  if (coverage.missingThemes.length > 0) {
    violations.push(
      `missing selected themes: ${coverage.missingThemes.join(", ")}`,
    );
  }

  const requiredCategoryCountPerStatement = clusters.length;
  const overallCategoryCoverageOk = coverage.missingCategories.length === 0;
  const requireFullCategoryCoverage =
    kind === "mission" ||
    requiredCategoryCountPerStatement <= VISION_MAX_PILLARS;

  if (
    !overallCategoryCoverageOk &&
    requiredCategoryCountPerStatement > 0 &&
    requireFullCategoryCoverage
  ) {
    violations.push(
      `the generated set must collectively reflect all selected strategic categories (missing: ${coverage.missingCategories.join(", ")})`,
    );
  }

  if (diversity.repeatedStartPattern) {
    violations.push("all statements use the same start pattern");
  }

  if (diversity.highSimilarity) {
    violations.push(
      "generated statements are structurally redundant or too similar (template reuse detected)",
    );
  }

  const details: ValidationBreakdown = {
    themeCoverage: coverage.themeCoverageScore,
    structuralDiversity: diversity.score,
    compliance: compliance.score,
    linguisticQuality,
    strategicBalance,
  };

  const totalScore = Math.round(
    details.themeCoverage * 0.3 +
      details.structuralDiversity * 0.2 +
      details.compliance * 0.2 +
      details.linguisticQuality * 0.15 +
      details.strategicBalance * 0.15,
  );

  let visionGovernanceAverage = 0;
  let visionGovernancePass = true;
  let missionGovernanceAverage = 0;
  let missionGovernancePass = true;
  if (kind === "vision") {
    const visionGovernance = evaluateVisionGovernanceSet(
      statements,
      semanticOptions,
      clusters,
    );
    visionGovernanceAverage = visionGovernance.averageScore;
    visionGovernancePass = visionGovernance.pass;
    violations.push(...visionGovernance.violations);
  } else if (kind === "mission") {
    const missionGovernance = evaluateMissionGovernanceSet({
      statements,
      referenceVisions,
      semanticOptions,
      clusters,
    });
    missionGovernanceAverage = missionGovernance.averageScore;
    missionGovernancePass = missionGovernance.pass;
    violations.push(...missionGovernance.violations);
  }

  const strictTotalScore =
    kind === "vision"
      ? Math.round(totalScore * 0.35 + visionGovernanceAverage * 0.65)
      : kind === "mission"
        ? Math.round(totalScore * 0.3 + missionGovernanceAverage * 0.7)
        : totalScore;

  const pass =
    strictTotalScore >=
      (kind === "vision"
        ? VISION_APPROVAL_THRESHOLD
        : kind === "mission"
          ? MISSION_APPROVAL_THRESHOLD
          : 80) &&
    coverage.missingThemes.length === 0 &&
    (requireFullCategoryCoverage ? overallCategoryCoverageOk : true) &&
    !diversity.repeatedStartPattern &&
    compliance.violations.length === 0 &&
    deduped.length === statements.length &&
    (kind === "vision" ? visionGovernancePass : true) &&
    (kind === "mission" ? missionGovernancePass : true);

  return {
    totalScore: strictTotalScore,
    pass,
    details,
    missingThemes: coverage.missingThemes,
    missingCategories: coverage.missingCategories,
    repeatedStartPattern: diversity.repeatedStartPattern,
    perStatementCoverage: coverage.perStatementCoverage,
    violations,
  };
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment variables");
  }

  if (ai_cache[prompt]) {
    return ai_cache[prompt];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const result = await response.json();
  const generatedText =
    result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!generatedText) {
    throw new Error("Unexpected response format from Gemini API");
  }

  ai_cache[prompt] = generatedText;
  return generatedText;
}

function buildVisionPrompt(params: {
  programName: string;
  instituteVision: string;
  semanticOptions: SemanticOption[];
  clusters: ThemeCluster[];
  distributionPlan: DistributionSlot[];
  count: number;
  customInstructions?: string;
  excludedStatements: string[];
  feedback: string[];
}) {
  const {
    programName,
    instituteVision,
    semanticOptions,
    clusters,
    distributionPlan,
    count,
    customInstructions,
    excludedStatements,
    feedback,
  } = params;

  return `
You are generating Program Vision statements for an engineering program.

Program: ${programName}
Institute Vision Context: ${instituteVision || "Not specified"}

Structured Semantic Inputs:
${JSON.stringify(semanticOptions, null, 2)}

Category Clusters:
${JSON.stringify(clusters, null, 2)}

Strategic Distribution Plan:
${JSON.stringify(distributionPlan, null, 2)}

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ""}
${excludedStatements.length > 0 ? `Do not repeat any of these previous statements: ${excludedStatements.join(" || ")}` : ""}
${feedback.length > 0 ? `Prior validation issues to fix: ${feedback.join(" | ")}` : ""}

Requirements:
1. Generate exactly ${count} distinct Vision statements.
2. Treat all selected semantic inputs as active constraints across the full set, while keeping each individual statement concise.
3. Each statement must remain strictly aspirational and represent institutional standing (WHERE), not teaching processes (HOW).
4. Mandatory start: each statement MUST begin with one of these exact starts: "To be globally recognized for", "To emerge as", "To achieve distinction in", "To advance as a leading", or "To be globally respected for".
5. Global concept rule: use exactly ONE global positioning phrase per statement and do not stack additional global/international words.
6. Hard Ban in Vision: operational/process terms such as education, teaching, learning, curriculum, pedagogy, provide, deliver, develop, cultivate, train, implement.
7. Limit each Vision to a maximum of ${VISION_MAX_PILLARS} strategic pillars.
8. Keep each statement between 15 and 25 words.
9. Ensure structural diversity; each output must use a different opening phrase and distinct sentence framing.
10. If any pair exceeds 70% structural similarity, rewrite the weaker candidate.
11. Avoid restricted wording: guarantee, ensure all, master, excel in all, immediate graduation outcomes, destination, hub, world-class.
12. Do not concatenate labels; synthesize meaning with long-term institutional abstraction.
13. Logic: The Program Vision must logically extend the Institute Vision into the disciplinary context of ${programName} without repeating it verbatim.

Output format:
- Return strictly a JSON array of strings.
- No markdown, no numbering, no explanations.
`;
}

function buildMissionPrompt(params: {
  programName: string;
  selectedProgramVision: string;
  instituteMission: string;
  semanticOptions: SemanticOption[];
  clusters: ThemeCluster[];
  distributionPlan: DistributionSlot[];
  count: number;
  customInstructions?: string;
  excludedStatements: string[];
  feedback: string[];
}) {
  const {
    programName,
    selectedProgramVision,
    instituteMission,
    semanticOptions,
    clusters,
    distributionPlan,
    count,
    customInstructions,
    excludedStatements,
    feedback,
  } = params;

  return `
You are generating Program Mission paragraphs for an engineering program.

Program: ${programName}
Selected Program Vision: ${selectedProgramVision || "Not specified"}
Institute Mission Context: ${instituteMission || "Not specified"}

Structured Semantic Inputs:
${JSON.stringify(semanticOptions, null, 2)}

Category Clusters:
${JSON.stringify(clusters, null, 2)}

Strategic Distribution Plan:
${JSON.stringify(distributionPlan, null, 2)}

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ""}
${excludedStatements.length > 0 ? `Do not repeat any of these previous statements: ${excludedStatements.join(" || ")}` : ""}
${feedback.length > 0 ? `Prior validation issues to fix: ${feedback.join(" | ")}` : ""}

Requirements:
1. Generate exactly ${count} distinct Mission paragraphs.
2. Each paragraph must explain HOW the selected Program Vision will be achieved.
3. Each paragraph must follow a strict "3 Operational Pillars" structure:
   - Pillar 1: Academic rigor / curriculum quality / continuous improvement.
   - Pillar 2: Research and industry engagement / hands-on practice.
   - Pillar 3: Professional standards, ethics, and sustained societal impact.
4. Mission must include at least two operational verbs such as deliver, strengthen, foster, promote, implement, or integrate.
5. Diversity Constraint: Do NOT simply swap the first verb of the paragraph. Every sentence in the paragraph must be structurally unique across all ${count} candidates.
6. Avoid direct phrase reuse from the Vision sentence; Mission should operationalize Vision, not restate it.
7. Tone: Professional, implementation-oriented, and action-driven.
8. Length: 3-4 sentences and 45-110 words per paragraph.
9. Avoid restricted wording: guarantee, ensure all, absolute mastery, 100% placement.
10. Avoid redundant noun stacking or repeated root words.
11. Synthesize meaning from the Institute Mission context; do not repeat it verbatim.

Output format:
- Return strictly a JSON array of strings.
- No markdown, no numbering, no explanations.
`;
}

function buildCoupledMissionPrompt(params: {
  programName: string;
  instituteMission: string;
  semanticOptions: SemanticOption[];
  clusters: ThemeCluster[];
  distributionPlan: DistributionSlot[];
  visions: string[];
  hints: CoupledMissionHint[];
  customInstructions?: string;
  excludedStatements: string[];
  feedback: string[];
}) {
  const {
    programName,
    instituteMission,
    semanticOptions,
    clusters,
    distributionPlan,
    visions,
    hints,
    customInstructions,
    excludedStatements,
    feedback,
  } = params;

  return `
You are generating coupled Program Mission paragraphs for an engineering program.

Program: ${programName}
Institute Mission Context: ${instituteMission || "Not specified"}

Vision Statements (ordered):
${JSON.stringify(visions, null, 2)}

Pairwise Alignment Hints (same order as Vision Statements):
${JSON.stringify(hints, null, 2)}

Structured Mission Semantic Inputs:
${JSON.stringify(semanticOptions, null, 2)}

Mission Category Clusters:
${JSON.stringify(clusters, null, 2)}

Mission Distribution Plan:
${JSON.stringify(distributionPlan, null, 2)}

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ""}
${excludedStatements.length > 0 ? `Do not repeat any of these previous mission statements: ${excludedStatements.join(" || ")}` : ""}
${feedback.length > 0 ? `Prior validation issues to fix: ${feedback.join(" | ")}` : ""}

Requirements:
1. Generate exactly ${visions.length} distinct mission paragraphs, in the same order as the provided visions.
2. Mission i must align directly with Vision i; do not mix visions across missions.
3. Each mission must be one paragraph with exactly 3 to 4 sentences following a strict "3 Operational Pillars" structure (Academic/Curriculum Quality, Research/Industry Engagement, and Professional Standards with Ethical/Societal Impact).
4. Each mission must operationalize the dominant categories and required pillars provided in its hint.
5. Each mission must include at least two operational verbs such as deliver, strengthen, foster, promote, implement, or integrate.
6. Structural Diversity: NO duplication of sentence templates. Every sentence across the JSON array must be unique.
7. Tone: Implementation-focused, accreditation-ready, and professional.
8. Length: 45-110 words per paragraph.
9. Avoid direct phrase reuse from Vision i and avoid redundant noun stacking or repeated root words.
10. Avoid restricted wording: guarantee, ensure all, master, excel in all, immediate graduation outcomes.

Output format:
- Return strictly a JSON array of strings.
- No markdown, no numbering, no explanations.
`;
}

async function generateWithValidation(params: {
  kind: StatementKind;
  count: number;
  semanticOptions: SemanticOption[];
  clusters: ThemeCluster[];
  distributionPlan: DistributionSlot[];
  excludedStatements: string[];
  referenceVisions?: string[];
  promptFactory: (feedback: string[]) => string;
  fallbackFactory: (index: number) => string;
}): Promise<GenerationResult> {
  const {
    kind,
    count,
    semanticOptions,
    clusters,
    distributionPlan,
    excludedStatements,
    referenceVisions = [],
    promptFactory,
    fallbackFactory,
  } = params;

  let feedback: string[] = [];

  for (let attempt = 1; attempt <= MAX_REGEN_ATTEMPTS; attempt += 1) {
    const prompt = promptFactory(feedback);
    const raw = await callGemini(prompt);

    const parsed = parseOptions(raw);
    const normalized = parsed.map((statement) =>
      kind === "vision"
        ? normalizeVisionStatement(statement, clusters)
        : normalizeMissionStatement(statement, clusters),
    );

    const filled = fillToTargetCount(
      kind === "vision"
        ? diversifyVisionStarts(dedupeStatements(normalized))
        : dedupeStatements(normalized),
      count,
      (index) =>
        kind === "vision"
          ? normalizeVisionStatement(fallbackFactory(index), clusters)
          : normalizeMissionStatement(fallbackFactory(index), clusters),
      excludedStatements,
    );

    const finalStatements =
      kind === "vision"
        ? enforceVisionSetDiversity({
            statements: diversifyVisionStarts(filled),
            clusters,
            semanticOptions,
            fallbackFactory,
          })
        : filled;
    const validation = validateStatements(
      kind,
      finalStatements,
      semanticOptions,
      clusters,
      distributionPlan,
      excludedStatements,
      kind === "mission" ? referenceVisions : [],
    );

    if (validation.pass) {
      return { statements: finalStatements, validation, attempts: attempt };
    }

    feedback = validation.violations.slice(0, 6);
  }

  const fallbackStatements = fillToTargetCount(
    [],
    count,
    (index) =>
      kind === "vision"
        ? normalizeVisionStatement(fallbackFactory(index), clusters)
        : normalizeMissionStatement(fallbackFactory(index), clusters),
    excludedStatements,
  );

  let finalFallback =
    kind === "vision"
      ? diversifyVisionStarts(fallbackStatements)
      : fallbackStatements;

  if (kind === "vision") {
    finalFallback = finalFallback.map((statement, index) => {
      let candidate = statement;

      for (
        let repairAttempt = 0;
        repairAttempt < MAX_REGEN_ATTEMPTS;
        repairAttempt += 1
      ) {
        const assessment = evaluateVisionStrategicQuality(
          candidate,
          semanticOptions,
          clusters,
        );
        if (assessment.score >= VISION_APPROVAL_THRESHOLD) {
          return candidate;
        }

        candidate = normalizeVisionStatement(
          fallbackFactory(index + count * (repairAttempt + 1)),
          clusters,
        );
      }

      const defaultPillar =
        VISION_PILLAR_PHRASES[clusters[0]?.category || "custom"];
      return ensureVisionWordWindow(
        ensureSentence(
          `${VISION_POSITIONING_STARTERS[index % VISION_POSITIONING_STARTERS.length]} long-term institutional distinction in ${defaultPillar} with sustained societal relevance`,
        ),
      );
    });

    finalFallback = enforceVisionSetDiversity({
      statements: finalFallback,
      clusters,
      semanticOptions,
      fallbackFactory,
    });
  } else if (kind === "mission") {
    finalFallback = finalFallback.map((statement, index) => {
      let candidate = statement;
      const referenceVision =
        referenceVisions[index] || referenceVisions[0] || "";

      for (
        let repairAttempt = 0;
        repairAttempt < MAX_REGEN_ATTEMPTS;
        repairAttempt += 1
      ) {
        const assessment = evaluateMissionStrategicQuality({
          statement: candidate,
          referenceVision,
          semanticOptions,
          clusters,
        });
        if (assessment.score >= MISSION_APPROVAL_THRESHOLD) {
          return candidate;
        }

        candidate = normalizeMissionStatement(
          fallbackFactory(index + count * (repairAttempt + 1)),
          clusters,
        );
      }

      return normalizeMissionStatement(
        buildMissionQualityFallbackStatement(index),
        clusters,
      );
    });
  }

  const validation = validateStatements(
    kind,
    finalFallback,
    semanticOptions,
    clusters,
    distributionPlan,
    excludedStatements,
    kind === "mission" ? referenceVisions : [],
  );

  return {
    statements: finalFallback,
    validation,
    attempts: MAX_REGEN_ATTEMPTS,
  };
}

async function generateCoupledMissionsWithValidation(params: {
  programName: string;
  instituteMission: string;
  visions: string[];
  semanticOptions: SemanticOption[];
  missionClusters: ThemeCluster[];
  missionDistributionPlan: DistributionSlot[];
  visionClusters: ThemeCluster[];
  excludedStatements: string[];
  customInstructions?: string;
}): Promise<CoupledMissionGenerationResult> {
  const {
    programName,
    instituteMission,
    visions,
    semanticOptions,
    missionClusters,
    missionDistributionPlan,
    visionClusters,
    excludedStatements,
    customInstructions,
  } = params;

  const hints = buildCoupledMissionHints(
    visions,
    visionClusters,
    missionClusters,
  );
  const referenceClusters =
    missionClusters.length > 0 ? missionClusters : visionClusters;
  let feedback: string[] = [];

  for (let attempt = 1; attempt <= MAX_REGEN_ATTEMPTS; attempt += 1) {
    const prompt = buildCoupledMissionPrompt({
      programName,
      instituteMission,
      semanticOptions,
      clusters: missionClusters,
      distributionPlan: missionDistributionPlan,
      visions,
      hints,
      customInstructions,
      excludedStatements,
      feedback,
    });

    const raw = await callGemini(prompt);
    const parsed = parseOptions(raw);
    const normalized = parsed.map((statement) =>
      normalizeMissionStatement(statement, referenceClusters),
    );

    const filled = fillToTargetCount(
      dedupeStatements(normalized),
      visions.length,
      (index) =>
        normalizeMissionStatement(
          buildCoupledMissionFallbackStatement(
            programName,
            hints[index % hints.length] || {
              index,
              vision: visions[index % visions.length] || "",
              dominantCategories: ["custom"],
              focusKeywords: [],
              requiredPillars: CATEGORY_OPERATIONAL_PILLARS.custom,
            },
            index,
          ),
          referenceClusters,
        ),
      excludedStatements,
    );

    const validation = validateStatements(
      "mission",
      filled,
      semanticOptions,
      missionClusters,
      missionDistributionPlan,
      excludedStatements,
      visions,
    );
    const alignment = validateVisionMissionAlignment({
      visions,
      missions: filled,
      hints,
      missionClusters: referenceClusters,
    });

    if (validation.pass && alignment.pass) {
      return {
        statements: filled,
        validation,
        attempts: attempt,
        alignment,
        hints,
      };
    }

    feedback = [...validation.violations, ...alignment.violations].slice(0, 8);
  }

  const fallbackStatements = fillToTargetCount(
    [],
    visions.length,
    (index) =>
      normalizeMissionStatement(
        buildCoupledMissionFallbackStatement(
          programName,
          hints[index % hints.length] || {
            index,
            vision: visions[index % visions.length] || "",
            dominantCategories: ["custom"],
            focusKeywords: [],
            requiredPillars: CATEGORY_OPERATIONAL_PILLARS.custom,
          },
          index,
        ),
        referenceClusters,
      ),
    excludedStatements,
  );

  const validation = validateStatements(
    "mission",
    fallbackStatements,
    semanticOptions,
    missionClusters,
    missionDistributionPlan,
    excludedStatements,
    visions,
  );
  const alignment = validateVisionMissionAlignment({
    visions,
    missions: fallbackStatements,
    hints,
    missionClusters: referenceClusters,
  });

  return {
    statements: fallbackStatements,
    validation,
    attempts: MAX_REGEN_ATTEMPTS,
    alignment,
    hints,
  };
}

export async function POST(request: Request) {
  let fallbackProgramName = "this program";
  let fallbackSelectedProgramVision = "";
  let fallbackMode: GenerationMode = "both";
  let fallbackVisionCount = 1;
  let fallbackMissionCount = 1;
  let fallbackVisionSemantic: SemanticOption[] = [];
  let fallbackMissionSemantic: SemanticOption[] = [];
  let fallbackVisionClusters: ThemeCluster[] = [];
  let fallbackMissionClusters: ThemeCluster[] = [];
  let fallbackVisionPlan: DistributionSlot[] = [];
  let fallbackMissionPlan: DistributionSlot[] = [];
  let fallbackExcludedVisions: string[] = [];
  let fallbackExcludedMissions: string[] = [];

  try {
    const body = await request.json();
    const {
      program_name,
      institute_vision,
      institute_mission,
      selected_program_vision,
      vision_inputs,
      mission_inputs,
      vision_instructions,
      mission_instructions,
      count,
      vision_count,
      mission_count,
      mode,
      exclude_visions,
      exclude_missions,
    } = body;

    const programName = String(program_name || "the program");
    const validInstituteVision = validateInstituteContext(
      String(institute_vision || ""),
    )
      ? String(institute_vision)
      : getBaselineInstituteVision(programName);
    const validInstituteMission = validateInstituteContext(
      String(institute_mission || ""),
    )
      ? String(institute_mission)
      : getBaselineInstituteMission(programName);

    if (!program_name) {
      return NextResponse.json(
        { error: "Missing program_name" },
        { status: 400 },
      );
    }

    const requestedMode = String(
      mode || "both",
    ).toLowerCase() as GenerationMode;
    const generationMode: GenerationMode = [
      "vision",
      "mission",
      "both",
    ].includes(requestedMode)
      ? requestedMode
      : "both";

    const shouldGenerateVision =
      generationMode === "vision" || generationMode === "both";
    const shouldGenerateMission =
      generationMode === "mission" || generationMode === "both";
    const coupledGeneration = shouldGenerateVision && shouldGenerateMission;

    const visionCount = clampCount(vision_count ?? count, 1, 1, MAX_COUNT);
    const requestedMissionCount = clampCount(
      mission_count ?? count,
      1,
      1,
      MAX_COUNT,
    );
    const missionCount = coupledGeneration
      ? visionCount
      : requestedMissionCount;

    const selectedVisionInputs = normalizeStringArray(vision_inputs);
    const selectedMissionInputs = normalizeStringArray(mission_inputs);
    const excludedVisions = normalizeStringArray(exclude_visions);
    const excludedMissions = normalizeStringArray(exclude_missions);

    if (
      shouldGenerateMission &&
      !shouldGenerateVision &&
      !selected_program_vision
    ) {
      return NextResponse.json(
        {
          error:
            "Program vision is required before generating mission statements.",
        },
        { status: 400 },
      );
    }

    const visionSemantic = buildSemanticObjects(selectedVisionInputs, "vision");
    const visionClusters = buildThemeClusters(visionSemantic);

    const missionInputsForGeneration = coupledGeneration
      ? resolveMissionInputsForGeneration(selectedMissionInputs, visionClusters)
      : selectedMissionInputs;
    const missionSemantic = buildSemanticObjects(
      missionInputsForGeneration,
      "mission",
    );
    const missionClusters = buildThemeClusters(missionSemantic);

    const visionPlan = buildDistributionPlan(visionClusters, visionCount).map(
      (slot) => ({
        ...slot,
        categories: slot.categories.slice(0, VISION_MAX_PILLARS),
        emphasisLabels: slot.emphasisLabels.slice(0, VISION_MAX_PILLARS),
      }),
    );
    const missionPlan = buildDistributionPlan(missionClusters, missionCount);

    fallbackProgramName = String(program_name);
    fallbackSelectedProgramVision = String(selected_program_vision || "");
    fallbackMode = generationMode;
    fallbackVisionCount = visionCount;
    fallbackMissionCount = missionCount;
    fallbackVisionSemantic = visionSemantic;
    fallbackMissionSemantic = missionSemantic;
    fallbackVisionClusters = visionClusters;
    fallbackMissionClusters = missionClusters;
    fallbackVisionPlan = visionPlan;
    fallbackMissionPlan = missionPlan;
    fallbackExcludedVisions = excludedVisions;
    fallbackExcludedMissions = excludedMissions;

    let visionResult: GenerationResult | null = null;
    let missionResult:
      | GenerationResult
      | CoupledMissionGenerationResult
      | null = null;

    if (shouldGenerateVision) {
      visionResult = await generateWithValidation({
        kind: "vision",
        count: visionCount,
        semanticOptions: visionSemantic,
        clusters: visionClusters,
        distributionPlan: visionPlan,
        excludedStatements: excludedVisions,
        promptFactory: (feedback) =>
          buildVisionPrompt({
            programName,
            instituteVision: validInstituteVision,
            semanticOptions: visionSemantic,
            clusters: visionClusters,
            distributionPlan: visionPlan,
            count: visionCount,
            customInstructions: String(vision_instructions || ""),
            excludedStatements: excludedVisions,
            feedback,
          }),
        fallbackFactory: (index) =>
          buildVisionFallbackStatement(
            String(program_name),
            visionPlan[index % visionPlan.length] || {
              index,
              categories: ["custom"],
              emphasisLabels: [],
            },
            index,
          ),
      });
    }

    if (shouldGenerateMission) {
      if (coupledGeneration) {
        const visionsForMission = visionResult?.statements || [];
        if (visionsForMission.length === 0) {
          throw new Error(
            "Failed to generate vision statements required for coupled mission generation.",
          );
        }

        missionResult = await generateCoupledMissionsWithValidation({
          programName,
          instituteMission: validInstituteMission,
          visions: visionsForMission,
          semanticOptions: missionSemantic,
          missionClusters,
          missionDistributionPlan: missionPlan,
          visionClusters,
          excludedStatements: excludedMissions,
          customInstructions: String(mission_instructions || ""),
        });
      } else {
        const missionReferenceVision = String(
          selected_program_vision || visionResult?.statements?.[0] || "",
        );
        missionResult = await generateWithValidation({
          kind: "mission",
          count: missionCount,
          semanticOptions: missionSemantic,
          clusters: missionClusters,
          distributionPlan: missionPlan,
          excludedStatements: excludedMissions,
          referenceVisions: Array.from(
            { length: missionCount },
            () => missionReferenceVision,
          ),
          promptFactory: (feedback) =>
            buildMissionPrompt({
              programName,
              selectedProgramVision: String(selected_program_vision || ""),
              instituteMission: validInstituteMission,
              semanticOptions: missionSemantic,
              clusters: missionClusters,
              distributionPlan: missionPlan,
              count: missionCount,
              customInstructions: String(mission_instructions || ""),
              excludedStatements: excludedMissions,
              feedback,
            }),
          fallbackFactory: (index) =>
            buildMissionFallbackStatement(
              programName,
              missionPlan[index % missionPlan.length] || {
                index,
                categories: ["custom"],
                emphasisLabels: [],
              },
              index,
            ),
        });
      }
    }

    const visions = visionResult?.statements || [];
    const missions = missionResult?.statements || [];
    const pairs = coupledGeneration
      ? buildVisionMissionPairs(visions, missions)
      : [];
    const missionAlignment =
      missionResult && "alignment" in missionResult
        ? missionResult.alignment
        : null;
    const missionHints =
      missionResult && "hints" in missionResult ? missionResult.hints : null;

    const validationPairs: VisionMissionPair[] =
      pairs.length > 0
        ? pairs
        : shouldGenerateMission && missions.length > 0 && !shouldGenerateVision
          ? missions.map((mission) => ({
              vision: String(selected_program_vision || ""),
              mission,
            }))
          : [];

    const validationVisionList = validationPairs.map((pair) => pair.vision);
    const validationMissionList = validationPairs.map((pair) => pair.mission);
    const validationHints =
      missionHints ||
      buildCoupledMissionHints(
        validationVisionList,
        visionClusters,
        missionClusters,
      );
    const validationAlignment =
      missionAlignment ||
      (validationPairs.length > 0
        ? validateVisionMissionAlignment({
            visions: validationVisionList,
            missions: validationMissionList,
            hints: validationHints,
            missionClusters:
              missionClusters.length > 0 ? missionClusters : visionClusters,
          })
        : null);

    const strategicValidation = await evaluateStrategicValidation({
      programName: String(program_name),
      instituteVision: String(institute_vision || ""),
      instituteMission: String(institute_mission || ""),
      pairs: validationPairs,
      approvalThreshold: STRATEGIC_APPROVAL_THRESHOLD,
      alignmentResult: validationAlignment,
    });

    return NextResponse.json({
      vision: visions[0] || null,
      mission: missions[0] || null,
      visions,
      missions,
      pairs,
      approval_status: strategicValidation?.approved ?? null,
      generation_details: {
        vision: visionResult
          ? {
              attempts: visionResult.attempts,
              validation: visionResult.validation,
              semantic_clusters: visionClusters,
              distribution_plan: visionPlan,
            }
          : null,
        mission: missionResult
          ? {
              attempts: missionResult.attempts,
              validation: missionResult.validation,
              semantic_clusters: missionClusters,
              distribution_plan: missionPlan,
              alignment_validation: validationAlignment,
              coupled_hints: validationHints,
            }
          : null,
        strategic_validation: strategicValidation,
      },
    });
  } catch (error: any) {
    console.error("AI Generation API Error:", error);

    const shouldGenerateVision =
      fallbackMode === "vision" || fallbackMode === "both";
    const shouldGenerateMission =
      fallbackMode === "mission" || fallbackMode === "both";

    const fallbackVisions = shouldGenerateVision
      ? fillToTargetCount(
          [],
          fallbackVisionCount,
          (index) =>
            normalizeVisionStatement(
              buildVisionFallbackStatement(
                fallbackProgramName,
                fallbackVisionPlan[index % fallbackVisionPlan.length] || {
                  index,
                  categories: ["custom"],
                  emphasisLabels: [],
                },
                index,
              ),
              fallbackVisionClusters,
            ),
          fallbackExcludedVisions,
        )
      : [];

    const isFallbackCoupled = shouldGenerateVision && shouldGenerateMission;
    const fallbackCoupledHints = isFallbackCoupled
      ? buildCoupledMissionHints(
          fallbackVisions,
          fallbackVisionClusters,
          fallbackMissionClusters,
        )
      : [];
    const fallbackMissionReferenceClusters =
      fallbackMissionClusters.length > 0
        ? fallbackMissionClusters
        : fallbackVisionClusters;

    const fallbackMissions = shouldGenerateMission
      ? fillToTargetCount(
          [],
          isFallbackCoupled ? fallbackVisions.length : fallbackMissionCount,
          (index) =>
            normalizeMissionStatement(
              isFallbackCoupled
                ? buildCoupledMissionFallbackStatement(
                    fallbackProgramName,
                    fallbackCoupledHints[
                      index % fallbackCoupledHints.length
                    ] || {
                      index,
                      vision:
                        fallbackVisions[index % fallbackVisions.length] || "",
                      dominantCategories: ["custom"],
                      focusKeywords: [],
                      requiredPillars: CATEGORY_OPERATIONAL_PILLARS.custom,
                    },
                    index,
                  )
                : buildMissionFallbackStatement(
                    fallbackProgramName,
                    fallbackMissionPlan[index % fallbackMissionPlan.length] || {
                      index,
                      categories: ["custom"],
                      emphasisLabels: [],
                    },
                    index,
                  ),
              fallbackMissionReferenceClusters,
            ),
          fallbackExcludedMissions,
        )
      : [];

    const fallbackPairs = isFallbackCoupled
      ? buildVisionMissionPairs(fallbackVisions, fallbackMissions)
      : [];
    const fallbackAlignment = fallbackPairs.length
      ? validateVisionMissionAlignment({
          visions: fallbackVisions,
          missions: fallbackMissions,
          hints: fallbackCoupledHints,
          missionClusters: fallbackMissionReferenceClusters,
        })
      : null;
    const fallbackValidationPairs: VisionMissionPair[] =
      fallbackPairs.length > 0
        ? fallbackPairs
        : shouldGenerateMission && !shouldGenerateVision
          ? fallbackMissions.map((mission) => ({
              vision: fallbackSelectedProgramVision || fallbackVisions[0] || "",
              mission,
            }))
          : [];
    const fallbackStrategicValidation = fallbackValidationPairs.length
      ? buildFallbackStrategicValidation({
          pairs: fallbackValidationPairs,
          approvalThreshold: STRATEGIC_APPROVAL_THRESHOLD,
          alignmentResult: fallbackAlignment,
        })
      : null;

    return NextResponse.json({
      vision: fallbackVisions[0] || null,
      mission: fallbackMissions[0] || null,
      visions: fallbackVisions,
      missions: fallbackMissions,
      pairs: fallbackPairs,
      approval_status: fallbackStrategicValidation?.approved ?? null,
      error: error.message,
      is_fallback: true,
      generation_details: {
        vision: shouldGenerateVision
          ? {
              semantic_count: fallbackVisionSemantic.length,
              cluster_count: fallbackVisionClusters.length,
            }
          : null,
        mission: shouldGenerateMission
          ? {
              semantic_count: fallbackMissionSemantic.length,
              cluster_count: fallbackMissionClusters.length,
              alignment_validation: fallbackAlignment,
              coupled_hints: fallbackCoupledHints,
            }
          : null,
        strategic_validation: fallbackStrategicValidation,
      },
    });
  }
}
