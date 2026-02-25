import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Short-lived in-memory cache (server instance local)
const ai_cache: Record<string, string> = {};

type GenerationMode = 'vision' | 'mission' | 'both';
type StatementKind = 'vision' | 'mission';
type ThemeCategory =
  | 'global_positioning'
  | 'innovation_technology'
  | 'sustainability_society'
  | 'professional_values'
  | 'educational_philosophy'
  | 'custom';

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
  validator: 'SLCA';
  approval_threshold: number;
  overall_average: number;
  approved: boolean;
  items: StrategicValidationItem[];
  source: 'ai' | 'fallback';
}

const MAX_COUNT = 10;
const MAX_REGEN_ATTEMPTS = 2;
const STRATEGIC_APPROVAL_THRESHOLD = 85;

const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  global_positioning: 'Global Positioning',
  innovation_technology: 'Innovation & Technology',
  sustainability_society: 'Sustainability & Society',
  professional_values: 'Professional Values',
  educational_philosophy: 'Educational Philosophy',
  custom: 'Contextual Priorities',
};

const CATEGORY_FOCUS_PHRASES: Record<ThemeCategory, string> = {
  global_positioning: 'global benchmarking and international quality',
  innovation_technology: 'innovation and technology leadership',
  sustainability_society: 'sustainability and societal impact',
  professional_values: 'ethics and professional responsibility',
  educational_philosophy: 'outcome-oriented learning quality',
  custom: 'program-specific strategic priorities',
};

const CATEGORY_SIGNAL_TERMS: Record<ThemeCategory, string[]> = {
  global_positioning: ['global', 'international', 'benchmark', 'competitive'],
  innovation_technology: ['innovation', 'technology', 'future', 'interdisciplinary', 'research'],
  sustainability_society: ['sustainable', 'sustainability', 'societal', 'community', 'social', 'human'],
  professional_values: ['ethic', 'integrity', 'professional', 'responsibility', 'leadership', 'teamwork'],
  educational_philosophy: ['outcome', 'learning', 'curriculum', 'education', 'academic', 'lifelong'],
  custom: ['priority', 'strategic', 'mission'],
};

const CATEGORY_OPERATIONAL_PILLARS: Record<ThemeCategory, string[]> = {
  global_positioning: ['international collaboration', 'global benchmarking', 'external standards'],
  innovation_technology: ['research ecosystem', 'innovation culture', 'industry collaboration'],
  sustainability_society: ['sustainable practices', 'societal engagement', 'community impact'],
  professional_values: ['ethical responsibility', 'professional integrity', 'leadership development'],
  educational_philosophy: ['outcome-based curriculum', 'continuous improvement', 'lifelong learning'],
  custom: ['stakeholder engagement', 'strategic academic priorities', 'mission-driven planning'],
};

const DEFAULT_MISSION_INPUT_BY_CATEGORY: Record<ThemeCategory, string> = {
  global_positioning: 'Global collaboration and benchmarking',
  innovation_technology: 'Innovation and entrepreneurship',
  sustainability_society: 'Sustainability consciousness',
  professional_values: 'Ethical engineering practice',
  educational_philosophy: 'Outcome Based Education',
  custom: 'Continuous academic improvement',
};

const KPI_CATEGORY_SIGNALS: Array<{ category: string; terms: string[] }> = [
  {
    category: 'Curriculum and Learning Quality',
    terms: ['curriculum', 'learning', 'outcome', 'assessment', 'pedagogy', 'teaching'],
  },
  {
    category: 'Research and Innovation',
    terms: ['research', 'innovation', 'technology', 'laboratory', 'entrepreneurship'],
  },
  {
    category: 'Industry and Employability',
    terms: ['industry', 'internship', 'employability', 'professional', 'career'],
  },
  {
    category: 'Ethics and Professional Responsibility',
    terms: ['ethical', 'integrity', 'responsibility', 'professional standards'],
  },
  {
    category: 'Sustainability and Societal Impact',
    terms: ['sustainable', 'societal', 'community', 'public', 'social', 'environment'],
  },
  {
    category: 'Global and Benchmarking',
    terms: ['global', 'international', 'benchmark', 'competitive', 'external standards'],
  },
];

const ABSOLUTE_TERMS = ['all graduates', 'every graduate', 'always', 'guarantee', '100%'];
const OUTCOME_STYLE_TERMS = [
  'at graduation',
  'on graduation',
  'student will be able to',
  'students will be able to',
  'immediate capability',
];
const FORBIDDEN_TERMS = ['ensure all', 'master', 'excel in all', 'guarantee'];
const VISION_MEASURABLE_VERBS = [
  'calculate',
  'design',
  'implement',
  'code',
  'program',
  'build',
  'develop',
  'measure',
  'evaluate',
  'analyze',
];

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'through',
  'toward',
  'towards',
  'to',
  'of',
  'in',
  'on',
  'a',
  'an',
  'by',
  'be',
  'or',
  'is',
  'are',
  'as',
  'at',
]);

const ALIGNMENT_KEYWORD_STOP_WORDS = new Set([
  ...Array.from(STOP_WORDS),
  'program',
  'engineering',
  'engineers',
  'graduates',
  'graduate',
  'vision',
  'mission',
  'long',
  'term',
  'future',
  'quality',
  'aligned',
  'alignment',
  'responsible',
  'leadership',
  'global',
  'international',
  'education',
  'learning',
  'professional',
  'institutional',
]);

const VISION_OPTION_LIBRARY: Record<string, Omit<SemanticOptionConfig, 'label'>> = {
  'Global Engineering Excellence': {
    category: 'global_positioning',
    semantic_intent: ['international leadership', 'global standards', 'world-class recognition'],
    accreditation_relevance: ['quality', 'benchmarking', 'competitiveness'],
    weight: 1.0,
  },
  'Future-ready engineers': {
    category: 'innovation_technology',
    semantic_intent: ['future readiness', 'emerging technologies', 'adaptive capability'],
    accreditation_relevance: ['continuous improvement', 'industry readiness'],
    weight: 1.0,
  },
  'Innovation-driven education': {
    category: 'innovation_technology',
    semantic_intent: ['innovation culture', 'creative problem solving', 'technology infusion'],
    accreditation_relevance: ['curriculum modernization', 'relevance'],
    weight: 1.1,
  },
  'Technology with purpose': {
    category: 'sustainability_society',
    semantic_intent: ['purposeful technology', 'human impact', 'responsible engineering'],
    accreditation_relevance: ['societal impact', 'ethics'],
    weight: 1.1,
  },
  'Engineering for societal impact': {
    category: 'sustainability_society',
    semantic_intent: ['societal development', 'community outcomes', 'public benefit'],
    accreditation_relevance: ['societal responsibility', 'sustainability'],
    weight: 1.2,
  },
  'Internationally benchmarked': {
    category: 'global_positioning',
    semantic_intent: ['global benchmarking', 'international comparability', 'quality assurance'],
    accreditation_relevance: ['quality systems', 'external standards'],
    weight: 1.0,
  },
  'Outcome-oriented education': {
    category: 'educational_philosophy',
    semantic_intent: ['outcome orientation', 'learning effectiveness', 'OBE alignment'],
    accreditation_relevance: ['OBE', 'assessment alignment'],
    weight: 1.2,
  },
  'Professional engineering standards': {
    category: 'professional_values',
    semantic_intent: ['professional rigor', 'engineering standards', 'responsible practice'],
    accreditation_relevance: ['professional practice', 'quality'],
    weight: 1.1,
  },
  'Globally competitive graduates': {
    category: 'global_positioning',
    semantic_intent: ['global competitiveness', 'career mobility', 'international relevance'],
    accreditation_relevance: ['employability', 'benchmarking'],
    weight: 1.0,
  },
  'Ethics and integrity': {
    category: 'professional_values',
    semantic_intent: ['ethical responsibility', 'integrity', 'professional accountability'],
    accreditation_relevance: ['ABET_SO4', 'professional responsibility'],
    weight: 1.2,
  },
  'Sustainable development': {
    category: 'sustainability_society',
    semantic_intent: ['sustainable development', 'environmental stewardship', 'long-term impact'],
    accreditation_relevance: ['sustainability', 'societal impact'],
    weight: 1.2,
  },
  'Human-centric engineering': {
    category: 'sustainability_society',
    semantic_intent: ['human-centered design', 'inclusive engineering', 'social relevance'],
    accreditation_relevance: ['public welfare', 'ethics'],
    weight: 1.1,
  },
  'Responsible innovation': {
    category: 'professional_values',
    semantic_intent: ['responsible innovation', 'ethical innovation', 'risk-aware progress'],
    accreditation_relevance: ['ethics', 'professional judgment'],
    weight: 1.2,
  },
};

const MISSION_OPTION_LIBRARY: Record<string, Omit<SemanticOptionConfig, 'label'>> = {
  'Outcome Based Education': {
    category: 'educational_philosophy',
    semantic_intent: ['outcome based education', 'assessment alignment', 'learning outcomes'],
    accreditation_relevance: ['OBE', 'continuous improvement'],
    weight: 1.2,
  },
  'Experiential learning': {
    category: 'educational_philosophy',
    semantic_intent: ['experiential learning', 'practice-based learning', 'hands-on pedagogy'],
    accreditation_relevance: ['curriculum effectiveness'],
    weight: 1.1,
  },
  'Strong theoretical foundation': {
    category: 'educational_philosophy',
    semantic_intent: ['theoretical foundation', 'conceptual rigor', 'fundamental knowledge'],
    accreditation_relevance: ['discipline depth'],
    weight: 1.0,
  },
  'Practice-oriented curriculum': {
    category: 'educational_philosophy',
    semantic_intent: ['practice-oriented curriculum', 'application focus', 'industry relevance'],
    accreditation_relevance: ['curriculum relevance'],
    weight: 1.1,
  },
  'Continuous academic improvement': {
    category: 'educational_philosophy',
    semantic_intent: ['continuous improvement', 'quality enhancement', 'evidence-based refinement'],
    accreditation_relevance: ['CQI', 'quality assurance'],
    weight: 1.2,
  },
  'Industry-aligned curriculum': {
    category: 'innovation_technology',
    semantic_intent: ['industry alignment', 'market relevance', 'professional readiness'],
    accreditation_relevance: ['employability', 'stakeholder needs'],
    weight: 1.1,
  },
  'Hands-on laboratories': {
    category: 'innovation_technology',
    semantic_intent: ['laboratory learning', 'experimental skills', 'technical practice'],
    accreditation_relevance: ['practical competence'],
    weight: 1.0,
  },
  'Internship-embedded learning': {
    category: 'innovation_technology',
    semantic_intent: ['internship integration', 'industry exposure', 'workplace readiness'],
    accreditation_relevance: ['professional preparation'],
    weight: 1.0,
  },
  'Professional skill development': {
    category: 'professional_values',
    semantic_intent: ['professional skills', 'career readiness', 'workplace capability'],
    accreditation_relevance: ['professional growth'],
    weight: 1.1,
  },
  'Employability enhancement': {
    category: 'professional_values',
    semantic_intent: ['employability', 'career progression', 'industry readiness'],
    accreditation_relevance: ['constituency needs'],
    weight: 1.0,
  },
  'Research-led teaching': {
    category: 'innovation_technology',
    semantic_intent: ['research-led teaching', 'inquiry mindset', 'evidence-based learning'],
    accreditation_relevance: ['innovation', 'academic quality'],
    weight: 1.0,
  },
  'Innovation and entrepreneurship': {
    category: 'innovation_technology',
    semantic_intent: ['innovation', 'entrepreneurial mindset', 'value creation'],
    accreditation_relevance: ['industry impact', 'career pathways'],
    weight: 1.1,
  },
  'Problem-based learning': {
    category: 'educational_philosophy',
    semantic_intent: ['problem-based learning', 'real-world context', 'active pedagogy'],
    accreditation_relevance: ['learning effectiveness'],
    weight: 1.1,
  },
  'Interdisciplinary approach': {
    category: 'innovation_technology',
    semantic_intent: ['interdisciplinary learning', 'cross-domain collaboration', 'integrated thinking'],
    accreditation_relevance: ['complex problem solving'],
    weight: 1.0,
  },
  'Critical thinking': {
    category: 'professional_values',
    semantic_intent: ['critical thinking', 'reasoned judgment', 'analytical rigor'],
    accreditation_relevance: ['professional decision making'],
    weight: 1.1,
  },
  'Problem solving': {
    category: 'professional_values',
    semantic_intent: ['problem solving', 'engineering judgment', 'solution orientation'],
    accreditation_relevance: ['engineering competence'],
    weight: 1.1,
  },
  'Teamwork and leadership': {
    category: 'professional_values',
    semantic_intent: ['teamwork', 'leadership', 'collaboration'],
    accreditation_relevance: ['professional skills'],
    weight: 1.1,
  },
  'Effective communication': {
    category: 'professional_values',
    semantic_intent: ['effective communication', 'stakeholder engagement', 'professional expression'],
    accreditation_relevance: ['communication competency'],
    weight: 1.0,
  },
  'Ethical engineering practice': {
    category: 'professional_values',
    semantic_intent: ['ethical engineering practice', 'integrity', 'public responsibility'],
    accreditation_relevance: ['ABET_SO4', 'ethics'],
    weight: 1.2,
  },
  'Sustainability consciousness': {
    category: 'sustainability_society',
    semantic_intent: ['sustainability awareness', 'environmental responsibility', 'long-term stewardship'],
    accreditation_relevance: ['sustainability', 'societal impact'],
    weight: 1.2,
  },
  'Social responsibility': {
    category: 'sustainability_society',
    semantic_intent: ['social responsibility', 'community contribution', 'public good'],
    accreditation_relevance: ['societal impact', 'ethics'],
    weight: 1.2,
  },
  'Lifelong learning mindset': {
    category: 'educational_philosophy',
    semantic_intent: ['lifelong learning', 'continuous growth', 'self-directed development'],
    accreditation_relevance: ['professional growth', 'continuous learning'],
    weight: 1.1,
  },
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function sanitizeStatement(text: string) {
  return normalizeWhitespace(text)
    .replace(/\bexcellence in\b/gi, 'leadership in')
    .replace(/\bexcellence\b/gi, 'leadership')
    .replace(/\bexcel in\b/gi, 'advance in')
    .replace(/\bexcel\b/gi, 'advance')
    .replace(/\ball graduates\b/gi, 'graduates')
    .replace(/\bevery graduate\b/gi, 'graduates');
}

function stripOptionPrefix(text: string) {
  return text
    .replace(/^option\s*\d+\s*:\s*/i, '')
    .replace(/^vision\s*\d+\s*:\s*/i, '')
    .replace(/^mission\s*\d+\s*:\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
}

function ensureSentence(text: string) {
  const trimmed = normalizeWhitespace(text).replace(/[.?!]+$/, '');
  return trimmed.length > 0 ? `${trimmed}.` : trimmed;
}

function splitSentences(text: string) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clampCount(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeWhitespace(String(item))).filter(Boolean);
}

function formatList(items: string[]) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function statementKey(statement: string) {
  return statement.toLowerCase().replace(/[^a-z0-9]/g, '');
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

function parseJsonResponse(rawText: string): any | null {
  const cleaned = rawText.replace(/```json/gi, '```').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting the largest JSON-like block.
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue to array extraction.
    }
  }

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
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
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fallback handled below
  }

  return cleaned
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
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

  if (/(global|international|benchmark|competitive|world|recognition)/.test(lower)) {
    return 'global_positioning';
  }
  if (/(innovation|technology|interdisciplinary|research|future|lab|internship)/.test(lower)) {
    return 'innovation_technology';
  }
  if (/(sustain|societ|social|human|community|environment)/.test(lower)) {
    return 'sustainability_society';
  }
  if (/(ethic|integrity|leadership|teamwork|communication|professional|responsibility)/.test(lower)) {
    return 'professional_values';
  }
  if (/(outcome|education|learning|curriculum|academic|lifelong|theoretical|practice|problem-based)/.test(lower)) {
    return 'educational_philosophy';
  }

  return 'custom';
}

function buildCustomSemanticOption(label: string): SemanticOption {
  const normalizedLabel = normalizeWhitespace(label);
  const category = inferCategoryFromLabel(normalizedLabel);
  const semantic_intent = [normalizedLabel.toLowerCase()];
  const accreditation_relevance = ['program mission alignment', 'quality improvement'];
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

function buildSemanticOption(label: string, kind: StatementKind): SemanticOption {
  const normalizedLabel = normalizeWhitespace(label);
  const library = kind === 'vision' ? VISION_OPTION_LIBRARY : MISSION_OPTION_LIBRARY;
  const fromLibrary = library[normalizedLabel];

  if (!fromLibrary) {
    return buildCustomSemanticOption(normalizedLabel);
  }

  const keywords = uniq(
    [
      ...extractKeywords(normalizedLabel),
      ...fromLibrary.semantic_intent.flatMap((phrase) => extractKeywords(phrase)),
      ...fromLibrary.accreditation_relevance.flatMap((phrase) => extractKeywords(phrase)),
    ]
  );

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
  const dedupedLabels = uniq(labels.map((label) => normalizeWhitespace(label)).filter(Boolean));
  return dedupedLabels.map((label) => buildSemanticOption(label, kind));
}

function resolveMissionInputsForGeneration(
  selectedMissionInputs: string[],
  visionClusters: ThemeCluster[]
) {
  if (selectedMissionInputs.length > 0) {
    return selectedMissionInputs;
  }

  const derived = uniq(
    visionClusters
      .map((cluster) => DEFAULT_MISSION_INPUT_BY_CATEGORY[cluster.category])
      .filter(Boolean)
  );

  if (derived.length > 0) {
    return derived;
  }

  return ['Outcome Based Education', 'Continuous academic improvement'];
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
      weightScore: Number(categoryOptions.reduce((sum, option) => sum + option.weight, 0).toFixed(2)),
      semanticIntents: uniq(categoryOptions.flatMap((option) => option.semantic_intent)),
      accreditationTags: uniq(categoryOptions.flatMap((option) => option.accreditation_relevance)),
    });
  }

  return clusters.sort((a, b) => b.weightScore - a.weightScore);
}

function buildDistributionPlan(clusters: ThemeCluster[], count: number): DistributionSlot[] {
  if (clusters.length === 0) {
    return Array.from({ length: count }, (_, index) => ({ index, categories: ['custom'], emphasisLabels: [] }));
  }

  const sorted = [...clusters].sort((a, b) => b.weightScore - a.weightScore);
  const slots: DistributionSlot[] = [];
  let previousPrimary: ThemeCategory | null = null;

  for (let i = 0; i < count; i += 1) {
    let primaryIndex = i % sorted.length;
    if (sorted.length > 1 && sorted[primaryIndex].category === previousPrimary) {
      primaryIndex = (primaryIndex + 1) % sorted.length;
    }

    const primary = sorted[primaryIndex];
    const categories: ThemeCategory[] = [primary.category];

    for (let step = 1; step < sorted.length && categories.length < 4; step += 1) {
      const candidate = sorted[(primaryIndex + step) % sorted.length];
      if (!categories.includes(candidate.category)) {
        categories.push(candidate.category);
      }
      if (categories.length >= 2 && (i + step) % 2 === 0) {
        break;
      }
    }

    if (categories.length < 2 && sorted.length > 1) {
      const backup = sorted.find((cluster) => cluster.category !== primary.category);
      if (backup) categories.push(backup.category);
    }

    const emphasisLabels = categories
      .flatMap((category) => sorted.find((cluster) => cluster.category === category)?.options[0]?.label || [])
      .slice(0, 4);

    slots.push({ index: i, categories, emphasisLabels });
    previousPrimary = categories[0] || null;
  }

  // Ensure each category appears at least once across the plan.
  const coveredCategories = new Set(slots.flatMap((slot) => slot.categories));
  for (const cluster of sorted) {
    if (!coveredCategories.has(cluster.category)) {
      const target = [...slots].sort((a, b) => a.categories.length - b.categories.length)[0];
      if (target && !target.categories.includes(cluster.category) && target.categories.length < 4) {
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

function hasComplianceViolation(statement: string, kind: StatementKind) {
  const lower = statement.toLowerCase();
  const violations: string[] = [];

  for (const term of [...ABSOLUTE_TERMS, ...FORBIDDEN_TERMS]) {
    if (lower.includes(term)) {
      violations.push(`contains restricted phrase: "${term}"`);
    }
  }

  if (containsAny(lower, OUTCOME_STYLE_TERMS)) {
    violations.push('uses immediate-outcome wording');
  }

  if (kind === 'vision') {
    for (const verb of VISION_MEASURABLE_VERBS) {
      if (lower.includes(verb)) {
        violations.push(`uses measurable/operational verb: "${verb}"`);
      }
    }
  }

  return violations;
}

function sanitizeCompliance(statement: string, kind: StatementKind) {
  let cleaned = sanitizeStatement(statement);

  for (const term of ABSOLUTE_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), 'graduates');
  }

  cleaned = cleaned
    .replace(/\bat graduation\b/gi, 'in their professional journey')
    .replace(/\bon graduation\b/gi, 'in their professional journey')
    .replace(/\bstudent[s]?\s+will\s+be\s+able\s+to\b/gi, 'graduates will');

  if (kind === 'vision') {
    const phrases = [
      'strengthen institutional capacity for',
      'position for',
      'foster long-term'
    ];
    let phraseIdx = 0;
    for (const verb of VISION_MEASURABLE_VERBS) {
      const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(
        new RegExp(`\\b${escaped}\\b`, 'gi'),
        () => phrases[phraseIdx++ % phrases.length]
      );
    }
  }

  return normalizeWhitespace(cleaned);
}

function matchesSemanticOption(statement: string, option: SemanticOption) {
  const lower = statement.toLowerCase();

  if (lower.includes(option.normalizedLabel)) {
    return true;
  }

  if (option.semantic_intent.some((intent) => lower.includes(intent.toLowerCase()))) {
    return true;
  }

  const keywordMatches = option.keywords.filter((keyword) => lower.includes(keyword)).length;
  if (option.keywords.length <= 2) {
    return keywordMatches >= 1;
  }

  return keywordMatches >= 2;
}

function matchesCategory(
  statement: string,
  category: ThemeCategory,
  optionsInCategory: SemanticOption[]
) {
  const lower = statement.toLowerCase();

  if (optionsInCategory.some((option) => matchesSemanticOption(statement, option))) {
    return true;
  }

  const signals = CATEGORY_SIGNAL_TERMS[category] || [];
  const hits = signals.filter((term) => lower.includes(term)).length;
  return hits >= 2 || (signals.length > 0 && hits >= 1 && lower.includes(category.split('_')[0]));
}

function categoryEvidenceScore(
  statement: string,
  category: ThemeCategory,
  optionsInCategory: SemanticOption[]
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
    score += option.keywords.filter((keyword) => lower.includes(keyword)).length;
  }

  const signals = CATEGORY_SIGNAL_TERMS[category] || [];
  const signalHits = signals.filter((term) => lower.includes(term)).length;
  score += signalHits * 2;

  return score;
}

function getDominantCategoriesForStatement(statement: string, referenceClusters: ThemeCluster[]) {
  const categories =
    referenceClusters.length > 0
      ? referenceClusters.map((cluster) => cluster.category)
      : (Object.keys(CATEGORY_LABELS) as ThemeCategory[]).filter((category) => category !== 'custom');

  if (categories.length === 0) {
    return ['custom'] as ThemeCategory[];
  }

  const ranked = categories
    .map((category) => {
      const options = referenceClusters.find((cluster) => cluster.category === category)?.options || [];
      return {
        category,
        score: categoryEvidenceScore(statement, category, options),
      };
    })
    .sort((a, b) => b.score - a.score);

  const targetCount = Math.min(2, Math.max(1, categories.length));
  const dominant = ranked.filter((entry) => entry.score > 0).slice(0, targetCount).map((entry) => entry.category);

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
      .filter((word) => word.length >= 5 && !ALIGNMENT_KEYWORD_STOP_WORDS.has(word))
      .slice(0, 6)
  );
}

function containsPhraseEvidence(text: string, phrase: string) {
  const lower = text.toLowerCase();
  const phraseLower = phrase.toLowerCase();

  if (lower.includes(phraseLower)) {
    return true;
  }

  const parts = phraseLower.split(/[^a-z0-9]+/).filter((part) => part.length >= 5);
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
    .replace(/^[^a-z0-9]+/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');
}

function ensureVisionWordWindow(statement: string) {
  const minWords = 15;
  const maxWords = 25;
  let words = normalizeWhitespace(statement).replace(/[.?!]+$/, '').split(/\s+/);

  const filler = ['with', 'long-term', 'aspiration', 'for', 'engineering', 'education'];
  let fillerIndex = 0;
  while (words.length < minWords) {
    words.push(filler[fillerIndex % filler.length]);
    fillerIndex += 1;
  }

  if (words.length > maxWords) {
    words = words.slice(0, maxWords);
  }

  return ensureSentence(words.join(' '));
}

function ensureMissionSentenceWindow(sentences: string[]) {
  const normalized = sentences.map((sentence) => ensureSentence(sentence));

  const support = [
    'Strengthen industry collaboration, ethical practice, and sustainability-oriented problem solving.',
    'Promote innovation, teamwork, communication, and lifelong learning for long-term professional growth.',
    'Sustain continuous academic quality enhancement aligned with institutional and program mission priorities.',
  ];

  let idx = 0;
  while (normalized.length < 3 && idx < support.length) {
    const candidate = support[idx];
    if (!normalized.some((line) => line.toLowerCase() === candidate.toLowerCase())) {
      normalized.push(candidate);
    }
    idx += 1;
  }

  return normalized.slice(0, 5);
}

function ensureAllCategoriesReferenced(
  statement: string,
  clusters: ThemeCluster[],
  kind: StatementKind
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

  const missing = clusters.filter((cluster) => !covered.has(cluster.category));
  if (missing.length === 0) {
    return ensureSentence(statement);
  }

  const missingPhrase = formatList(
    missing.map((cluster) => CATEGORY_FOCUS_PHRASES[cluster.category])
  );

  const connector =
    kind === 'vision'
      ? ` while integrating ${missingPhrase}`
      : ` with integrated emphasis on ${missingPhrase}`;

  return ensureSentence(`${statement.replace(/[.?!]+$/, '')}${connector}`);
}

function diversifyVisionStarts(statements: string[]) {
  const starters = ['To become', 'Advancing', 'A program committed to', 'Striving toward', 'Dedicated to'];
  const used = new Set<string>();

  return statements.map((statement, index) => {
    const currentStart = getStatementStartPattern(statement);
    if (!used.has(currentStart)) {
      used.add(currentStart);
      return statement;
    }

    const targetStarter = starters[index % starters.length];
    const body = statement.replace(/^[A-Za-z\-]+(?:\s+[A-Za-z\-]+){0,3}\s+/u, '');
    const rewritten = `${targetStarter} ${body}`;
    const rewrittenPattern = getStatementStartPattern(rewritten);
    used.add(rewrittenPattern);
    return ensureVisionWordWindow(rewritten);
  });
}

function normalizeVisionStatement(rawStatement: string, clusters: ThemeCluster[]) {
  let statement = sanitizeCompliance(stripOptionPrefix(rawStatement), 'vision');
  statement = ensureSentence(statement);
  statement = ensureAllCategoriesReferenced(statement, clusters, 'vision');
  statement = ensureVisionWordWindow(statement);
  return statement;
}

function normalizeMissionStatement(rawStatement: string, clusters: ThemeCluster[]) {
  let statement = sanitizeCompliance(stripOptionPrefix(rawStatement), 'mission');
  let sentences = splitSentences(statement);

  if (sentences.length === 0) {
    sentences = ['Deliver quality engineering education through mission-aligned curriculum and continuous improvement.'];
  }

  sentences = sentences.map((sentence) => sanitizeCompliance(sentence, 'mission'));
  sentences = ensureMissionSentenceWindow(sentences);

  if (sentences.length > 0) {
    sentences[0] = ensureAllCategoriesReferenced(sentences[0], clusters, 'mission');
  }

  return sentences.map((sentence) => ensureSentence(sentence)).join(' ');
}

function fillToTargetCount(
  statements: string[],
  targetCount: number,
  fallbackFactory: (index: number) => string,
  excludedStatements: string[]
) {
  const excludedKeys = new Set(excludedStatements.map((item) => statementKey(item)));
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

function buildVisionFallbackStatement(programName: string, slot: DistributionSlot, index: number) {
  const focusPhrase = formatList(slot.categories.map((category) => CATEGORY_FOCUS_PHRASES[category]));
  const variants = [
    `To become a leading ${programName} destination shaping ${focusPhrase} for long-term global relevance`,
    `Advancing ${programName} aspirations through ${focusPhrase} in a future-focused and internationally benchmarked academic ecosystem`,
    `A program committed to long-horizon impact by integrating ${focusPhrase} within responsible and globally aligned engineering education`,
    `Striving toward a globally respected ${programName} identity grounded in ${focusPhrase} and mission-aligned educational transformation`,
    `Dedicated to sustained ${programName} leadership through ${focusPhrase} with strong institutional and societal commitment`,
  ];

  return ensureSentence(variants[index % variants.length]);
}

function buildMissionFallbackStatement(programName: string, slot: DistributionSlot, index: number) {
  const focusPhrase = formatList(slot.categories.map((category) => CATEGORY_FOCUS_PHRASES[category]));
  const openings = [
    `Deliver ${programName} education with integrated emphasis on ${focusPhrase} through continuous academic quality improvement.`,
    `Provide an outcome-oriented ${programName} curriculum aligned with ${focusPhrase}, professional ethics, and institutional mission priorities.`,
    `Implement learner-centered ${programName} pathways that translate ${focusPhrase} into sustainable professional and societal impact.`,
    `Strengthen ${programName} teaching-learning systems by embedding ${focusPhrase} across curriculum, pedagogy, and stakeholder engagement.`,
    `Advance ${programName} program mission through coherent academic processes anchored in ${focusPhrase} and responsible engineering practice.`,
  ];

  return [
    openings[index % openings.length],
    'Strengthen industry collaboration, ethical practice, and sustainability-oriented problem solving.',
    'Promote innovation, teamwork, communication, and lifelong learning for long-term professional growth.',
  ].join(' ');
}

function buildCoupledMissionHints(
  visions: string[],
  visionClusters: ThemeCluster[],
  missionClusters: ThemeCluster[]
) {
  const referenceClusters = visionClusters.length > 0 ? visionClusters : missionClusters;

  return visions.map((vision, index) => {
    const dominantCategories = getDominantCategoriesForStatement(vision, referenceClusters);
    const focusKeywords = extractAlignmentKeywords(vision);
    const requiredPillars = uniq(
      dominantCategories.flatMap((category) => CATEGORY_OPERATIONAL_PILLARS[category] || [])
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
  index: number
) {
  const focusPhrase = formatList(
    hint.dominantCategories.map((category) => CATEGORY_FOCUS_PHRASES[category])
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
    `Translate the vision intent into practice through ${pillarPhrase || 'continuous improvement, research engagement, and ethical practice'}.`,
    `Sustain long-term relevance through industry engagement, societal contribution, and context-aware implementation${keywordPhrase ? ` aligned with ${keywordPhrase}` : ''}.`,
  ].join(' ');
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
      `Vision and Mission count mismatch for coupled mode (visions: ${visions.length}, missions: ${missions.length}).`
    );
  }

  const count = Math.min(visions.length, missions.length);
  for (let i = 0; i < count; i += 1) {
    const vision = visions[i];
    const mission = missions[i];
    const hint = hints[i];

    const requiredCategories = hint?.dominantCategories || ['custom'];
    const coveredCategories = requiredCategories.filter((category) => {
      const options = missionClusters.find((cluster) => cluster.category === category)?.options || [];
      return matchesCategory(mission, category, options) || missionSupportsCategory(mission, category);
    });

    const missingCategories = requiredCategories.filter(
      (category) => !coveredCategories.includes(category)
    );

    const keywordHits = (hint?.focusKeywords || []).filter((keyword) =>
      mission.toLowerCase().includes(keyword)
    );
    const requiredKeywordHits = (hint?.focusKeywords?.length || 0) >= 3 ? 1 : 0;
    const missingOperationalPillars = (hint?.requiredPillars || []).filter(
      (pillar) => !containsPhraseEvidence(mission, pillar)
    );

    const categoryScore =
      requiredCategories.length === 0
        ? 100
        : Math.round((coveredCategories.length / requiredCategories.length) * 100);
    const keywordScore =
      requiredKeywordHits === 0
        ? 100
        : Math.min(100, Math.round((keywordHits.length / requiredKeywordHits) * 100));
    const minPillarHits = Math.min(2, hint?.requiredPillars?.length || 0);
    const actualPillarHits = (hint?.requiredPillars?.length || 0) - missingOperationalPillars.length;
    const pillarScore =
      minPillarHits === 0 ? 100 : Math.min(100, Math.round((actualPillarHits / minPillarHits) * 100));
    const score = Math.round(categoryScore * 0.5 + keywordScore * 0.2 + pillarScore * 0.3);

    if (missingCategories.length > 0) {
      violations.push(
        `Pair ${i + 1}: Mission does not operationalize vision categories ${missingCategories
          .map((category) => CATEGORY_LABELS[category])
          .join(', ')}.`
      );
    }
    if (requiredKeywordHits > 0 && keywordHits.length < requiredKeywordHits) {
      violations.push(`Pair ${i + 1}: Mission language is weakly aligned with the associated vision intent.`);
    }
    if (minPillarHits > 0 && actualPillarHits < minPillarHits) {
      violations.push(
        `Pair ${i + 1}: Mission is missing operational pirllars expected from the associated vision emphasis.`
      );
    }

    details.push({
      index: i,
      vision,
      mission,
      requiredCategories: requiredCategories.map((category) => CATEGORY_LABELS[category]),
      coveredCategories: coveredCategories.map((category) => CATEGORY_LABELS[category]),
      keywordHits,
      missingCategories: missingCategories.map((category) => CATEGORY_LABELS[category]),
      missingOperationalPillars,
      score,
    });
  }

  const totalScore =
    details.length === 0
      ? 0
      : Math.round(details.reduce((sum, detail) => sum + detail.score, 0) / details.length);

  const pass = violations.length === 0 && totalScore >= 80;

  return {
    totalScore,
    pass,
    details,
    violations,
  } satisfies PairAlignmentResult;
}

function keywordOverlapRatio(source: string, target: string) {
  const sourceKeywords = new Set(extractKeywords(source).filter((word) => word.length >= 5));
  const targetKeywords = new Set(extractKeywords(target).filter((word) => word.length >= 5));

  if (sourceKeywords.size === 0 || targetKeywords.size === 0) {
    return 0;
  }

  const intersection = [...sourceKeywords].filter((keyword) => targetKeywords.has(keyword)).length;
  const union = new Set([...sourceKeywords, ...targetKeywords]).size;
  return union === 0 ? 0 : intersection / union;
}

function detectKpiCategories(vision: string, mission: string) {
  const corpus = `${vision} ${mission}`.toLowerCase();
  const categories = KPI_CATEGORY_SIGNALS
    .filter((signal) => signal.terms.some((term) => corpus.includes(term.toLowerCase())))
    .map((signal) => signal.category);

  return categories.length > 0 ? categories : ['Curriculum and Learning Quality'];
}

function buildStrategicValidationPrompt(params: {
  programName: string;
  instituteVision: string;
  instituteMission: string;
  pairs: VisionMissionPair[];
  approvalThreshold: number;
}) {
  const { programName, instituteVision, instituteMission, pairs, approvalThreshold } = params;

  const pairPayload = pairs.map((pair, index) => ({
    index: index + 1,
    vision: pair.vision,
    mission: pair.mission,
  }));

  return `
You are a Strategic Accreditation Evaluator.

Evaluate each Vision and Mission pair logically and structurally for the program "${programName}".
Institute Vision Context: ${instituteVision || 'Not specified'}
Institute Mission Context: ${instituteMission || 'Not specified'}

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

    const visionWordCount = vision.replace(/[.?!]+$/, '').split(/\s+/).filter(Boolean).length;
    if (visionWordCount < 15 || visionWordCount > 25) {
      visionIssues.push('Vision length is outside the preferred 15-25 word window.');
    }

    const visionCompliance = hasComplianceViolation(vision, 'vision');
    const missionCompliance = hasComplianceViolation(mission, 'mission');

    visionIssues.push(
      ...visionCompliance
        .filter((issue) => issue.includes('measurable/operational verb') || issue.includes('immediate-outcome'))
        .map((issue) => `Vision ${issue}.`)
    );
    missionIssues.push(
      ...missionCompliance
        .filter((issue) => issue.includes('immediate-outcome'))
        .map((issue) => `Mission ${issue}.`)
    );

    const combinedLower = `${vision} ${mission}`.toLowerCase();
    for (const restricted of [...ABSOLUTE_TERMS, ...FORBIDDEN_TERMS]) {
      if (combinedLower.includes(restricted)) {
        realismFlags.push(`Contains unrealistic or absolute wording: "${restricted}".`);
      }
    }

    for (const verb of VISION_MEASURABLE_VERBS) {
      if (mission.toLowerCase().includes(verb)) {
        accreditationFlags.push(`Mission uses classroom-level operational verb "${verb}".`);
      }
    }

    const overlap = keywordOverlapRatio(vision, mission);
    if (!alignmentDetail) {
      if (overlap > 0.65) {
        flowFlags.push('Mission repeats Vision wording too closely.');
      }
      if (overlap < 0.15) {
        flowFlags.push('Mission has weak lexical continuity with the Vision intent.');
      }
    }

    const alignmentGaps: string[] = [];
    if (alignmentDetail?.missingCategories?.length) {
      alignmentGaps.push(
        `Missing category alignment: ${alignmentDetail.missingCategories.join(', ')}.`
      );
    }
    if (alignmentDetail?.missingOperationalPillars?.length) {
      alignmentGaps.push(
        `Missing operational pillars: ${alignmentDetail.missingOperationalPillars.join(', ')}.`
      );
    }

    const kpiCategories = detectKpiCategories(vision, mission);

    const visionQuality = clampScore(100 - visionIssues.length * 12 - visionCompliance.length * 8, 72);
    const missionQuality = clampScore(
      100 - missionIssues.length * 10 - missionCompliance.length * 8 - accreditationFlags.length * 10,
      72
    );
    const alignmentStrength = clampScore(
      alignmentDetail?.score ?? Math.round(60 + overlap * 40 - alignmentGaps.length * 12),
      70
    );
    const measurabilityPotential = clampScore(
      52 + kpiCategories.length * 9 - alignmentGaps.length * 8 - realismFlags.length * 6,
      68
    );
    const overall = clampScore(
      (visionQuality + missionQuality + alignmentStrength + measurabilityPotential) / 4,
      70
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
        'Use long-horizon aspirational language in Vision and avoid short-term operational verbs.'
      );
    }
    if (alignmentGaps.length > 0) {
      rewriteSuggestions.push(
        'Convert each missing Vision theme into explicit Mission action pillars (curriculum, research, collaboration, ethics, sustainability).'
      );
    }
    if (realismFlags.length > 0) {
      rewriteSuggestions.push('Replace absolute promises with attainable and assessable institutional commitments.');
    }
    if (flowFlags.length > 0) {
      rewriteSuggestions.push('Improve progression: Vision states destination, Mission states operational pathway.');
    }

    const verdict =
      overall >= approvalThreshold && identifiedWeaknesses.length === 0
        ? 'Approved for strategic use.'
        : overall >= approvalThreshold
          ? 'Conditionally acceptable with minor refinements.'
          : 'Needs refinement before approval.';

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
      : clampScore(items.reduce((sum, item) => sum + item.scores.overall_strategic_soundness, 0) / items.length);

  const approved =
    items.length > 0 &&
    overallAverage >= approvalThreshold &&
    items.every((item) => item.scores.overall_strategic_soundness >= approvalThreshold);

  return {
    validator: 'SLCA',
    approval_threshold: approvalThreshold,
    overall_average: overallAverage,
    approved,
    items,
    source: 'fallback',
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
      rawItems.find((item) => Number(item?.index) === idx + 1 || Number(item?.index) === idx) || rawItems[idx];

    if (!candidate || typeof candidate !== 'object') {
      return fallbackItem;
    }

    const candidateScores = candidate.scores || candidate;
    const scores: StrategicValidationScores = {
      vision_quality: clampScore(candidateScores.vision_quality, fallbackItem.scores.vision_quality),
      mission_quality: clampScore(candidateScores.mission_quality, fallbackItem.scores.mission_quality),
      alignment_strength: clampScore(candidateScores.alignment_strength, fallbackItem.scores.alignment_strength),
      measurability_potential: clampScore(
        candidateScores.measurability_potential,
        fallbackItem.scores.measurability_potential
      ),
      overall_strategic_soundness: clampScore(
        candidateScores.overall_strategic_soundness,
        fallbackItem.scores.overall_strategic_soundness
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
      missing_mission_pillars: normalizeStringList(candidate.missing_mission_pillars),
      kpi_categories: normalizeStringList(candidate.kpi_categories),
      realism_flags: normalizeStringList(candidate.realism_flags),
      accreditation_flags: normalizeStringList(candidate.accreditation_flags),
      flow_flags: normalizeStringList(candidate.flow_flags),
      identified_weaknesses: normalizeStringList(candidate.identified_weaknesses, 12),
      rewrite_suggestions: normalizeStringList(candidate.rewrite_suggestions, 8),
      final_verdict: normalizeWhitespace(String(candidate.final_verdict || fallbackItem.final_verdict)),
    };
  });

  const computedAverage =
    items.length === 0
      ? 0
      : clampScore(items.reduce((sum, item) => sum + item.scores.overall_strategic_soundness, 0) / items.length);

  const overallAverage = clampScore(parsed?.overall_average, computedAverage);
  const approvedFromItems =
    items.length > 0 &&
    overallAverage >= approvalThreshold &&
    items.every((item) => item.scores.overall_strategic_soundness >= approvalThreshold);
  const approved =
    typeof parsed?.approved === 'boolean' ? parsed.approved && approvedFromItems : approvedFromItems;

  return {
    validator: 'SLCA',
    approval_threshold: approvalThreshold,
    overall_average: overallAverage,
    approved,
    items,
    source: 'ai',
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
  clusters: ThemeCluster[]
) {
  const missingThemes: string[] = [];
  const coveredThemeKeys = new Set<string>();
  const perStatementCoverage: Array<{
    statement: string;
    coveredThemes: number;
    coveredCategories: string[];
  }> = [];

  for (const statement of statements) {
    const coveredOptions = semanticOptions.filter((option) => matchesSemanticOption(statement, option));
    const coveredCategories = clusters
      .filter((cluster) => matchesCategory(statement, cluster.category, cluster.options))
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
    const categoryOptions = clusters.find((cluster) => cluster.category === category)?.options || [];
    const categoryCovered = statements.some((statement) =>
      matchesCategory(statement, category, categoryOptions)
    );
    return !categoryCovered;
  });

  const avgThemeCoverage =
    perStatementCoverage.length === 0 || semanticOptions.length === 0
      ? 0
      : perStatementCoverage.reduce((sum, item) => sum + item.coveredThemes / semanticOptions.length, 0) /
      perStatementCoverage.length;

  const themeCoverageScore = Math.round(
    ((semanticOptions.length - missingThemes.length) / Math.max(semanticOptions.length, 1)) * 70 +
    avgThemeCoverage * 30
  );

  return {
    perStatementCoverage,
    missingThemes,
    missingCategories: missingCategories.map((category) => CATEGORY_LABELS[category]),
    themeCoverageScore: Math.max(0, Math.min(100, themeCoverageScore)),
  };
}

function evaluateStructuralDiversity(statements: string[]) {
  if (statements.length === 0) {
    return { score: 0, repeatedStartPattern: false };
  }

  const starts = statements.map((statement) => getStatementStartPattern(statement));
  const uniqueStarts = new Set(starts);
  const repeatedStartPattern = uniqueStarts.size === 1 && statements.length > 1;
  const score = Math.round((uniqueStarts.size / statements.length) * 100);

  return { score, repeatedStartPattern };
}

function evaluateCompliance(statements: string[], kind: StatementKind) {
  const violations: string[] = [];

  statements.forEach((statement, idx) => {
    const issues = hasComplianceViolation(statement, kind);
    issues.forEach((issue) => violations.push(`Statement ${idx + 1}: ${issue}`));
  });

  const score = Math.max(0, 100 - violations.length * 15);
  return { score, violations };
}

function evaluateLinguisticQuality(statements: string[], kind: StatementKind) {
  if (statements.length === 0) return 0;

  let validCount = 0;

  for (const statement of statements) {
    const words = normalizeWhitespace(statement).replace(/[.?!]+$/, '').split(/\s+/);

    if (kind === 'vision') {
      if (words.length >= 15 && words.length <= 25) {
        validCount += 1;
      }
      continue;
    }

    const sentenceCount = splitSentences(statement).length;
    if (words.length >= 35 && words.length <= 120 && sentenceCount >= 3 && sentenceCount <= 5) {
      validCount += 1;
    }
  }

  return Math.round((validCount / statements.length) * 100);
}

function evaluateStrategicBalance(
  statements: string[],
  clusters: ThemeCluster[],
  distributionPlan: DistributionSlot[]
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
      const covered = matchesCategory(statement, cluster.category, cluster.options);
      if (covered) coveredCategories.add(cluster.category);
    }

    const overlap = slot.categories.filter((category) => coveredCategories.has(category)).length;
    const hasCategoryBreadth = coveredCategories.size >= Math.min(2, clusters.length);
    if (overlap >= 1 && hasCategoryBreadth) {
      passCount += 1;
    }
  }

  return Math.round((passCount / statements.length) * 100);
}

function validateStatements(
  kind: StatementKind,
  statements: string[],
  semanticOptions: SemanticOption[],
  clusters: ThemeCluster[],
  distributionPlan: DistributionSlot[],
  excludedStatements: string[]
): ValidationResult {
  const violations: string[] = [];
  const deduped = dedupeStatements(statements);

  if (deduped.length !== statements.length) {
    violations.push('duplicate statements detected in the generated set');
  }

  const excludedKeys = new Set(excludedStatements.map((item) => statementKey(item)));
  for (let i = 0; i < statements.length; i += 1) {
    if (excludedKeys.has(statementKey(statements[i]))) {
      violations.push(`Statement ${i + 1}: repeats a previously generated statement`);
    }
  }

  const coverage = calculateCoverage(statements, semanticOptions, clusters);
  const diversity = evaluateStructuralDiversity(statements);
  const compliance = evaluateCompliance(statements, kind);
  const linguisticQuality = evaluateLinguisticQuality(statements, kind);
  const strategicBalance = evaluateStrategicBalance(statements, clusters, distributionPlan);

  violations.push(...compliance.violations);

  if (coverage.missingThemes.length > 0) {
    violations.push(`missing selected themes: ${coverage.missingThemes.join(', ')}`);
  }

  const requiredCategoryCountPerStatement = clusters.length;
  const overallCategoryCoverageOk = coverage.missingCategories.length === 0;

  if (!overallCategoryCoverageOk && requiredCategoryCountPerStatement > 0) {
    violations.push(
      `the generated set must collectively reflect all selected strategic categories (missing: ${coverage.missingCategories.join(', ')})`
    );
  }

  if (diversity.repeatedStartPattern) {
    violations.push('all statements use the same start pattern');
  }

  const details: ValidationBreakdown = {
    themeCoverage: coverage.themeCoverageScore,
    structuralDiversity: diversity.score,
    compliance: compliance.score,
    linguisticQuality,
    strategicBalance,
  };

  const totalScore = Math.round(
    details.themeCoverage * 0.30 +
    details.structuralDiversity * 0.20 +
    details.compliance * 0.20 +
    details.linguisticQuality * 0.15 +
    details.strategicBalance * 0.15
  );

  const pass =
    totalScore >= 80 &&
    coverage.missingThemes.length === 0 &&
    overallCategoryCoverageOk &&
    !diversity.repeatedStartPattern &&
    compliance.violations.length === 0 &&
    deduped.length === statements.length;

  return {
    totalScore,
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
    throw new Error('GEMINI_API_KEY not found in environment variables');
  }

  if (ai_cache[prompt]) {
    return ai_cache[prompt];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const result = await response.json();
  const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!generatedText) {
    throw new Error('Unexpected response format from Gemini API');
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
Institute Vision Context: ${instituteVision || 'Not specified'}

Structured Semantic Inputs:
${JSON.stringify(semanticOptions, null, 2)}

Category Clusters:
${JSON.stringify(clusters, null, 2)}

Strategic Distribution Plan:
${JSON.stringify(distributionPlan, null, 2)}

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ''}
${excludedStatements.length > 0 ? `Do not repeat any of these previous statements: ${excludedStatements.join(' || ')}` : ''}
${feedback.length > 0 ? `Prior validation issues to fix: ${feedback.join(' | ')}` : ''}

Requirements:
1. Generate exactly ${count} distinct Vision statements.
2. Treat all selected semantic inputs as active constraints for every statement.
3. Each statement must remain aspirational, accreditation-safe, and suitable for long-term (10-15 year) vision framing.
4. Each statement must reflect every strategic category represented in the selected inputs and avoid narrow measurable action verbs.
5. Keep each statement between 15 and 25 words.
6. Ensure structural diversity; avoid repeating the same sentence start across all outputs.
7. Avoid restricted wording: guarantee, ensure all, master, excel in all, immediate graduation outcomes.
8. Do not concatenate labels; synthesize meaning.

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
Selected Program Vision: ${selectedProgramVision || 'Not specified'}
Institute Mission Context: ${instituteMission || 'Not specified'}

Structured Semantic Inputs:
${JSON.stringify(semanticOptions, null, 2)}

Category Clusters:
${JSON.stringify(clusters, null, 2)}

Strategic Distribution Plan:
${JSON.stringify(distributionPlan, null, 2)}

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ''}
${excludedStatements.length > 0 ? `Do not repeat any of these previous statements: ${excludedStatements.join(' || ')}` : ''}
${feedback.length > 0 ? `Prior validation issues to fix: ${feedback.join(' | ')}` : ''}

Requirements:
1. Generate exactly ${count} distinct Mission statements.
2. Each mission must be one paragraph with 3 to 5 sentences.
3. Every paragraph must reflect all selected semantic inputs in a mission-appropriate way.
4. Maintain accreditation-safe tone: implementable, broad, realistic, mission-aligned.
5. Every paragraph must reflect every strategic category represented in the selected inputs.
6. Avoid restricted wording: guarantee, ensure all, master, excel in all, immediate graduation outcomes.
7. Ensure structural diversity across generated mission paragraphs.
8. Avoid copying labels verbatim as a list; synthesize coherent institutional language.

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
Institute Mission Context: ${instituteMission || 'Not specified'}

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

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ''}
${excludedStatements.length > 0 ? `Do not repeat any of these previous mission statements: ${excludedStatements.join(' || ')}` : ''}
${feedback.length > 0 ? `Prior validation issues to fix: ${feedback.join(' | ')}` : ''}

Requirements:
1. Generate exactly ${visions.length} distinct mission paragraphs, in the same order as the provided visions.
2. Mission i must align directly with Vision i; do not mix visions across missions.
3. Each mission must be one paragraph with 3 to 5 sentences and practical institutional actions.
4. Each mission must operationalize the dominant categories and required pillars provided in its hint.
5. Maintain accreditation-safe tone: broad, attainable, mission-oriented, and suitable for ABET/NBA review.
6. Avoid restricted wording: guarantee, ensure all, master, excel in all, immediate graduation outcomes.
7. Ensure structural diversity across mission outputs.
8. Synthesize language; do not copy labels as a list.

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
    promptFactory,
    fallbackFactory,
  } = params;

  let feedback: string[] = [];

  for (let attempt = 1; attempt <= MAX_REGEN_ATTEMPTS; attempt += 1) {
    const prompt = promptFactory(feedback);
    const raw = await callGemini(prompt);

    const parsed = parseOptions(raw);
    const normalized = parsed.map((statement) =>
      kind === 'vision'
        ? normalizeVisionStatement(statement, clusters)
        : normalizeMissionStatement(statement, clusters)
    );

    const filled = fillToTargetCount(
      kind === 'vision' ? diversifyVisionStarts(dedupeStatements(normalized)) : dedupeStatements(normalized),
      count,
      (index) =>
        kind === 'vision'
          ? normalizeVisionStatement(fallbackFactory(index), clusters)
          : normalizeMissionStatement(fallbackFactory(index), clusters),
      excludedStatements
    );

    const finalStatements = kind === 'vision' ? diversifyVisionStarts(filled) : filled;
    const validation = validateStatements(
      kind,
      finalStatements,
      semanticOptions,
      clusters,
      distributionPlan,
      excludedStatements
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
      kind === 'vision'
        ? normalizeVisionStatement(fallbackFactory(index), clusters)
        : normalizeMissionStatement(fallbackFactory(index), clusters),
    excludedStatements
  );

  const finalFallback = kind === 'vision' ? diversifyVisionStarts(fallbackStatements) : fallbackStatements;
  const validation = validateStatements(
    kind,
    finalFallback,
    semanticOptions,
    clusters,
    distributionPlan,
    excludedStatements
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

  const hints = buildCoupledMissionHints(visions, visionClusters, missionClusters);
  const referenceClusters = missionClusters.length > 0 ? missionClusters : visionClusters;
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
    const normalized = parsed.map((statement) => normalizeMissionStatement(statement, referenceClusters));

    const filled = fillToTargetCount(
      dedupeStatements(normalized),
      visions.length,
      (index) =>
        normalizeMissionStatement(
          buildCoupledMissionFallbackStatement(
            programName,
            hints[index % hints.length] || {
              index,
              vision: visions[index % visions.length] || '',
              dominantCategories: ['custom'],
              focusKeywords: [],
              requiredPillars: CATEGORY_OPERATIONAL_PILLARS.custom,
            },
            index
          ),
          referenceClusters
        ),
      excludedStatements
    );

    const validation = validateStatements(
      'mission',
      filled,
      semanticOptions,
      missionClusters,
      missionDistributionPlan,
      excludedStatements
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
            vision: visions[index % visions.length] || '',
            dominantCategories: ['custom'],
            focusKeywords: [],
            requiredPillars: CATEGORY_OPERATIONAL_PILLARS.custom,
          },
          index
        ),
        referenceClusters
      ),
    excludedStatements
  );

  const validation = validateStatements(
    'mission',
    fallbackStatements,
    semanticOptions,
    missionClusters,
    missionDistributionPlan,
    excludedStatements
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
  let fallbackProgramName = 'this program';
  let fallbackSelectedProgramVision = '';
  let fallbackMode: GenerationMode = 'both';
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

    if (!program_name) {
      return NextResponse.json({ error: 'Missing program_name' }, { status: 400 });
    }

    const requestedMode = String(mode || 'both').toLowerCase() as GenerationMode;
    const generationMode: GenerationMode = ['vision', 'mission', 'both'].includes(requestedMode)
      ? requestedMode
      : 'both';

    const shouldGenerateVision = generationMode === 'vision' || generationMode === 'both';
    const shouldGenerateMission = generationMode === 'mission' || generationMode === 'both';
    const coupledGeneration = shouldGenerateVision && shouldGenerateMission;

    const visionCount = clampCount(vision_count ?? count, 1, 1, MAX_COUNT);
    const requestedMissionCount = clampCount(mission_count ?? count, 1, 1, MAX_COUNT);
    const missionCount = coupledGeneration ? visionCount : requestedMissionCount;

    const selectedVisionInputs = normalizeStringArray(vision_inputs);
    const selectedMissionInputs = normalizeStringArray(mission_inputs);
    const excludedVisions = normalizeStringArray(exclude_visions);
    const excludedMissions = normalizeStringArray(exclude_missions);

    if (shouldGenerateMission && !shouldGenerateVision && !selected_program_vision) {
      return NextResponse.json(
        { error: 'Program vision is required before generating mission statements.' },
        { status: 400 }
      );
    }

    const visionSemantic = buildSemanticObjects(selectedVisionInputs, 'vision');
    const visionClusters = buildThemeClusters(visionSemantic);

    const missionInputsForGeneration = coupledGeneration
      ? resolveMissionInputsForGeneration(selectedMissionInputs, visionClusters)
      : selectedMissionInputs;
    const missionSemantic = buildSemanticObjects(missionInputsForGeneration, 'mission');
    const missionClusters = buildThemeClusters(missionSemantic);

    const visionPlan = buildDistributionPlan(visionClusters, visionCount);
    const missionPlan = buildDistributionPlan(missionClusters, missionCount);

    fallbackProgramName = String(program_name);
    fallbackSelectedProgramVision = String(selected_program_vision || '');
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
    let missionResult: GenerationResult | CoupledMissionGenerationResult | null = null;

    if (shouldGenerateVision) {
      visionResult = await generateWithValidation({
        kind: 'vision',
        count: visionCount,
        semanticOptions: visionSemantic,
        clusters: visionClusters,
        distributionPlan: visionPlan,
        excludedStatements: excludedVisions,
        promptFactory: (feedback) =>
          buildVisionPrompt({
            programName: String(program_name),
            instituteVision: String(institute_vision || ''),
            semanticOptions: visionSemantic,
            clusters: visionClusters,
            distributionPlan: visionPlan,
            count: visionCount,
            customInstructions: String(vision_instructions || ''),
            excludedStatements: excludedVisions,
            feedback,
          }),
        fallbackFactory: (index) =>
          buildVisionFallbackStatement(String(program_name), visionPlan[index % visionPlan.length] || {
            index,
            categories: ['custom'],
            emphasisLabels: [],
          }, index),
      });
    }

    if (shouldGenerateMission) {
      if (coupledGeneration) {
        const visionsForMission = visionResult?.statements || [];
        if (visionsForMission.length === 0) {
          throw new Error('Failed to generate vision statements required for coupled mission generation.');
        }

        missionResult = await generateCoupledMissionsWithValidation({
          programName: String(program_name),
          instituteMission: String(institute_mission || ''),
          visions: visionsForMission,
          semanticOptions: missionSemantic,
          missionClusters,
          missionDistributionPlan: missionPlan,
          visionClusters,
          excludedStatements: excludedMissions,
          customInstructions: String(mission_instructions || ''),
        });
      } else {
        missionResult = await generateWithValidation({
          kind: 'mission',
          count: missionCount,
          semanticOptions: missionSemantic,
          clusters: missionClusters,
          distributionPlan: missionPlan,
          excludedStatements: excludedMissions,
          promptFactory: (feedback) =>
            buildMissionPrompt({
              programName: String(program_name),
              selectedProgramVision: String(selected_program_vision || ''),
              instituteMission: String(institute_mission || ''),
              semanticOptions: missionSemantic,
              clusters: missionClusters,
              distributionPlan: missionPlan,
              count: missionCount,
              customInstructions: String(mission_instructions || ''),
              excludedStatements: excludedMissions,
              feedback,
            }),
          fallbackFactory: (index) =>
            buildMissionFallbackStatement(String(program_name), missionPlan[index % missionPlan.length] || {
              index,
              categories: ['custom'],
              emphasisLabels: [],
            }, index),
        });
      }
    }

    const visions = visionResult?.statements || [];
    const missions = missionResult?.statements || [];
    const pairs = coupledGeneration ? buildVisionMissionPairs(visions, missions) : [];
    const missionAlignment =
      missionResult && 'alignment' in missionResult ? missionResult.alignment : null;
    const missionHints = missionResult && 'hints' in missionResult ? missionResult.hints : null;

    const validationPairs: VisionMissionPair[] =
      pairs.length > 0
        ? pairs
        : shouldGenerateMission && missions.length > 0 && !shouldGenerateVision
          ? missions.map((mission) => ({
            vision: String(selected_program_vision || ''),
            mission,
          }))
          : [];

    const validationVisionList = validationPairs.map((pair) => pair.vision);
    const validationMissionList = validationPairs.map((pair) => pair.mission);
    const validationHints = missionHints || buildCoupledMissionHints(validationVisionList, visionClusters, missionClusters);
    const validationAlignment =
      missionAlignment ||
      (validationPairs.length > 0
        ? validateVisionMissionAlignment({
          visions: validationVisionList,
          missions: validationMissionList,
          hints: validationHints,
          missionClusters: missionClusters.length > 0 ? missionClusters : visionClusters,
        })
        : null);

    const strategicValidation = await evaluateStrategicValidation({
      programName: String(program_name),
      instituteVision: String(institute_vision || ''),
      instituteMission: String(institute_mission || ''),
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
    console.error('AI Generation API Error:', error);

    const shouldGenerateVision = fallbackMode === 'vision' || fallbackMode === 'both';
    const shouldGenerateMission = fallbackMode === 'mission' || fallbackMode === 'both';

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
                categories: ['custom'],
                emphasisLabels: [],
              },
              index
            ),
            fallbackVisionClusters
          ),
        fallbackExcludedVisions
      )
      : [];

    const isFallbackCoupled = shouldGenerateVision && shouldGenerateMission;
    const fallbackCoupledHints = isFallbackCoupled
      ? buildCoupledMissionHints(fallbackVisions, fallbackVisionClusters, fallbackMissionClusters)
      : [];
    const fallbackMissionReferenceClusters =
      fallbackMissionClusters.length > 0 ? fallbackMissionClusters : fallbackVisionClusters;

    const fallbackMissions = shouldGenerateMission
      ? fillToTargetCount(
        [],
        isFallbackCoupled ? fallbackVisions.length : fallbackMissionCount,
        (index) =>
          normalizeMissionStatement(
            isFallbackCoupled
              ? buildCoupledMissionFallbackStatement(
                fallbackProgramName,
                fallbackCoupledHints[index % fallbackCoupledHints.length] || {
                  index,
                  vision: fallbackVisions[index % fallbackVisions.length] || '',
                  dominantCategories: ['custom'],
                  focusKeywords: [],
                  requiredPillars: CATEGORY_OPERATIONAL_PILLARS.custom,
                },
                index
              )
              : buildMissionFallbackStatement(
                fallbackProgramName,
                fallbackMissionPlan[index % fallbackMissionPlan.length] || {
                  index,
                  categories: ['custom'],
                  emphasisLabels: [],
                },
                index
              ),
            fallbackMissionReferenceClusters
          ),
        fallbackExcludedMissions
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
            vision: fallbackSelectedProgramVision || fallbackVisions[0] || '',
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
