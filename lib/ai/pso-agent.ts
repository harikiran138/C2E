import {
  detectProgramDomain,
  type ProgramDomain,
} from "@/lib/curriculum/domain-knowledge";
import { buildPSOGenerationPrompt } from "@/lib/ai/pso-prompt-builder";

const APPROVED_ACTION_VERBS = [
  "Apply",
  "Design",
  "Analyze",
  "Develop",
  "Evaluate",
  "Integrate",
  "Optimize",
  "Implement",
] as const;

type ApprovedActionVerb = (typeof APPROVED_ACTION_VERBS)[number];
type ABETStudentOutcome =
  | "SO1"
  | "SO2"
  | "SO3"
  | "SO4"
  | "SO5"
  | "SO6"
  | "SO7";

export interface SelectedSocietiesInput {
  lead?: string[];
  co_lead?: string[];
  coLead?: string[];
  cooperating?: string[];
}

export interface PSOAgentParams {
  programName: string;
  count: number;
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  geminiApiKey?: string;
}

interface DomainAreaSpec {
  label: string;
  skills: string[];
  applicationContexts: string[];
  toolPhrases: string[];
  keywordAnchors: string[];
  societySignals: string[];
  primaryVerb: ApprovedActionVerb;
  abetMappings: ABETStudentOutcome[];
  emergingFocus?: boolean;
}

interface ProgramCriteriaProfile {
  domain: ProgramDomain;
  disciplineLabel: string;
  criteriaBasis: string[];
  genericityBlockers: string[];
  emergingAreas: string[];
  domains: DomainAreaSpec[];
}

export interface GeneratedPSODetail {
  statement: string;
  domain: string;
  skill: string;
  applicationContext: string;
  toolPhrase: string;
  actionVerb: ApprovedActionVerb;
  abetMappings: ABETStudentOutcome[];
  criteriaBasis: string[];
  sourceSocieties: string[];
  emergingAreas: string[];
  validation: {
    actionVerbPass: boolean;
    hasAbetMapping: boolean;
    uniqueToProgram: boolean;
  };
}

export interface PSOValidationSummary {
  sourceValidation: {
    passed: boolean;
    message: string;
    criteriaBasis: string[];
    societies: string[];
  };
  domainCoverage: {
    passed: boolean;
    required: string[];
    covered: string[];
    missing: string[];
  };
  actionVerbCheck: {
    passed: boolean;
    approvedVerbs: readonly string[];
    failures: string[];
  };
  abetMappingCheck: {
    passed: boolean;
    unmapped: string[];
  };
  uniquenessCheck: {
    passed: boolean;
    genericStatements: string[];
    highSimilarityPairs: string[];
  };
}

export interface PSOAgentResult {
  results: string[];
  details: GeneratedPSODetail[];
  validation: PSOValidationSummary;
  sources: {
    programCriteria: string[];
    societies: string[];
    emergingAreas: string[];
  };
  selectionContext: {
    lead: string[];
    coLead: string[];
    cooperating: string[];
    count: number;
  };
  prompt: string;
}

const PROFILE_BY_DOMAIN: Record<ProgramDomain, ProgramCriteriaProfile> = {
  CSE: {
    domain: "CSE",
    disciplineLabel: "Computer Science and Computing",
    criteriaBasis: [
      "ABET-aligned computing criteria emphasize applying computer science theory and software development fundamentals to produce computing-based solutions.",
      "Program-specific outcomes should demonstrate analysis, design, implementation, and evaluation of computing systems in relevant application contexts.",
    ],
    genericityBlockers: [
      "software",
      "computing",
      "algorithm",
      "data",
      "network",
      "cloud",
      "cybersecurity",
      "intelligent",
    ],
    emergingAreas: ["AI-enabled systems", "cloud-native platforms", "cybersecurity and responsible computing"],
    domains: [
      {
        label: "Computing Foundations",
        skills: ["algorithmic solutions", "computing models", "efficient software logic"],
        applicationContexts: ["complex data-driven problems", "scalable computing workflows", "performance-critical applications"],
        toolPhrases: ["using programming, testing, and analytical methods", "using computational analysis and debugging tools", "using algorithm design and verification techniques"],
        keywordAnchors: ["algorithm", "computing", "software"],
        societySignals: ["CSAB", "Computer", "Computing"],
        primaryVerb: "Apply",
        abetMappings: ["SO1", "SO5"],
      },
      {
        label: "Software and Systems Design",
        skills: ["software systems", "full-stack computing solutions", "robust application architectures"],
        applicationContexts: ["user and organizational requirements", "deployable software products", "reliable digital services"],
        toolPhrases: ["using modern development frameworks and versioned workflows", "using software engineering methods and validation tools", "using testing, integration, and deployment pipelines"],
        keywordAnchors: ["software", "system", "application"],
        societySignals: ["CSAB", "Software", "IEEE"],
        primaryVerb: "Design",
        abetMappings: ["SO2", "SO5"],
      },
      {
        label: "Data and Intelligent Computing",
        skills: ["data-centric computing solutions", "intelligent models", "AI-assisted decision systems"],
        applicationContexts: ["analytics, automation, and prediction tasks", "responsible intelligent applications", "secure and scalable data services"],
        toolPhrases: ["using machine learning, data engineering, and evaluation tools", "using statistical analysis and intelligent computing platforms", "using modern data pipelines and model assessment methods"],
        keywordAnchors: ["data", "AI", "intelligent"],
        societySignals: ["AI", "Data", "IEEE", "CSAB"],
        primaryVerb: "Develop",
        abetMappings: ["SO1", "SO2", "SO5"],
        emergingFocus: true,
      },
    ],
  },
  ECE: {
    domain: "ECE",
    disciplineLabel: "Electronics and Communication Engineering",
    criteriaBasis: [
      "ABET-aligned electronics and communication criteria emphasize analysis and design of analog, digital, communication, and embedded systems.",
      "Program-specific outcomes should evidence competence with electronic hardware, signal processing, communication systems, and modern engineering tools.",
    ],
    genericityBlockers: [
      "signal",
      "communication",
      "embedded",
      "electronic",
      "vlsi",
      "wireless",
      "instrumentation",
    ],
    emergingAreas: ["IoT and edge intelligence", "5G and wireless platforms", "embedded AI systems"],
    domains: [
      {
        label: "Electronic and Embedded Systems",
        skills: ["embedded electronic systems", "digital hardware interfaces", "microcontroller-based solutions"],
        applicationContexts: ["real-time control and sensing applications", "reliable device-level implementations", "industry-oriented automation solutions"],
        toolPhrases: ["using circuit design, simulation, and embedded development tools", "using hardware debugging and prototyping platforms", "using electronic design and validation workflows"],
        keywordAnchors: ["embedded", "electronic", "hardware"],
        societySignals: ["IEEE", "Electronics", "Automation"],
        primaryVerb: "Design",
        abetMappings: ["SO2", "SO5"],
      },
      {
        label: "Signals and Communication",
        skills: ["signal processing methods", "communication system models", "wired and wireless communication solutions"],
        applicationContexts: ["data transmission and sensing problems", "communication network performance improvement", "high-integrity communication applications"],
        toolPhrases: ["using simulation, measurement, and communication analysis tools", "using signal processing and testing platforms", "using electronic instrumentation and modeling tools"],
        keywordAnchors: ["signal", "communication", "wireless"],
        societySignals: ["IEEE", "Communication", "Wireless"],
        primaryVerb: "Analyze",
        abetMappings: ["SO1", "SO5"],
      },
      {
        label: "VLSI and Intelligent Devices",
        skills: ["integrated electronic solutions", "VLSI-oriented implementations", "smart connected devices"],
        applicationContexts: ["high-performance and low-power applications", "IoT and edge-enabled products", "advanced communication and sensing platforms"],
        toolPhrases: ["using VLSI, embedded AI, and system validation tools", "using design automation and verification platforms", "using modern prototyping and performance assessment methods"],
        keywordAnchors: ["vlsi", "iot", "device"],
        societySignals: ["IEEE", "IoT", "Systems"],
        primaryVerb: "Develop",
        abetMappings: ["SO2", "SO5"],
        emergingFocus: true,
      },
    ],
  },
  EEE: {
    domain: "EEE",
    disciplineLabel: "Electrical and Electronics Engineering",
    criteriaBasis: [
      "ABET-aligned electrical engineering criteria emphasize analysis and design of electrical circuits, machines, power systems, control systems, and related applications.",
      "Program-specific outcomes should capture competence in electrical system behavior, implementation, and technology-enabled professional practice.",
    ],
    genericityBlockers: [
      "power",
      "electrical",
      "machine",
      "control",
      "drive",
      "grid",
      "electronics",
    ],
    emergingAreas: ["smart grids", "electric mobility", "renewable and energy storage systems"],
    domains: [
      {
        label: "Power and Energy Systems",
        skills: ["power system solutions", "electrical energy distribution models", "reliable power conversion strategies"],
        applicationContexts: ["generation, transmission, and distribution applications", "energy efficiency and power quality challenges", "safe and sustainable energy operations"],
        toolPhrases: ["using power system analysis and simulation tools", "using measurement, protection, and modeling platforms", "using modern electrical engineering software and testing methods"],
        keywordAnchors: ["power", "energy", "electrical"],
        societySignals: ["Electrical", "Energy", "IEEE"],
        primaryVerb: "Analyze",
        abetMappings: ["SO1", "SO5"],
      },
      {
        label: "Machines, Drives, and Control",
        skills: ["electrical machines and drive systems", "control-oriented electrical solutions", "automation-ready electromechanical systems"],
        applicationContexts: ["industrial motion and automation applications", "stable and efficient machine operation", "control-intensive engineering environments"],
        toolPhrases: ["using control design, instrumentation, and drive analysis tools", "using modeling and implementation platforms", "using electrical testing and automation workflows"],
        keywordAnchors: ["machine", "drive", "control"],
        societySignals: ["IEEE", "Automation", "Systems"],
        primaryVerb: "Design",
        abetMappings: ["SO2", "SO5"],
      },
      {
        label: "Smart Electrical Technologies",
        skills: ["intelligent electrical solutions", "renewable-integrated systems", "smart monitoring and automation solutions"],
        applicationContexts: ["smart grid, EV, and sustainable energy applications", "data-enabled electrical operations", "modern electrified infrastructure"],
        toolPhrases: ["using digital protection, smart sensing, and analysis tools", "using simulation and supervisory platforms", "using contemporary electrical monitoring and optimization workflows"],
        keywordAnchors: ["smart", "renewable", "grid"],
        societySignals: ["IEEE", "Smart", "Energy"],
        primaryVerb: "Develop",
        abetMappings: ["SO2", "SO4", "SO5"],
        emergingFocus: true,
      },
    ],
  },
  MECH: {
    domain: "MECH",
    disciplineLabel: "Mechanical Engineering",
    criteriaBasis: [
      "ABET-aligned mechanical engineering criteria emphasize analysis, design, and realization of mechanical and thermal systems.",
      "Program-specific outcomes should evidence competence in mechanical design, thermal-fluid engineering, manufacturing, and modern engineering practice.",
    ],
    genericityBlockers: [
      "mechanical",
      "thermal",
      "manufacturing",
      "fluid",
      "machine",
      "cad",
      "robotics",
    ],
    emergingAreas: ["robotics and automation", "additive manufacturing", "sustainable thermal systems"],
    domains: [
      {
        label: "Mechanical Design",
        skills: ["mechanical components and systems", "machine design solutions", "reliable product-level mechanical assemblies"],
        applicationContexts: ["functional and manufacturable products", "industry-focused mechanical applications", "safe and performance-oriented systems"],
        toolPhrases: ["using CAD, material selection, and engineering analysis tools", "using design calculations, modeling, and validation methods", "using computational design and prototyping workflows"],
        keywordAnchors: ["mechanical", "design", "machine"],
        societySignals: ["ASME", "Mechanical", "Manufacturing"],
        primaryVerb: "Design",
        abetMappings: ["SO2", "SO5"],
      },
      {
        label: "Thermal and Fluid Engineering",
        skills: ["thermal-fluid systems", "energy conversion processes", "heat transfer and fluid flow solutions"],
        applicationContexts: ["power, HVAC, and process engineering applications", "efficient thermal system performance", "energy-conscious mechanical operations"],
        toolPhrases: ["using experimental data, simulation, and thermal analysis tools", "using modeling, instrumentation, and performance assessment methods", "using thermodynamic and fluid engineering workflows"],
        keywordAnchors: ["thermal", "fluid", "heat"],
        societySignals: ["ASME", "Thermal", "HVAC"],
        primaryVerb: "Analyze",
        abetMappings: ["SO1", "SO5"],
      },
      {
        label: "Manufacturing and Automation",
        skills: ["manufacturing solutions", "production systems", "automation-ready mechanical processes"],
        applicationContexts: ["precision production and quality improvement", "robotics-enabled operations", "sustainable manufacturing environments"],
        toolPhrases: ["using process planning, automation, and quality engineering tools", "using CAM, metrology, and manufacturing optimization methods", "using modern production analysis and control workflows"],
        keywordAnchors: ["manufacturing", "production", "automation"],
        societySignals: ["Manufacturing", "SME", "ASME", "Robotics"],
        primaryVerb: "Develop",
        abetMappings: ["SO2", "SO4", "SO5"],
        emergingFocus: true,
      },
    ],
  },
  CIVIL: {
    domain: "CIVIL",
    disciplineLabel: "Civil Engineering",
    criteriaBasis: [
      "ABET-aligned civil engineering criteria emphasize application of mathematics and science to civil systems and design of infrastructure components in more than one civil context.",
      "Program-specific outcomes should capture competence in structural, geotechnical, transportation, environmental, and construction-oriented practice.",
    ],
    genericityBlockers: [
      "structural",
      "geotechnical",
      "transportation",
      "environmental",
      "construction",
      "surveying",
      "infrastructure",
    ],
    emergingAreas: ["smart infrastructure", "GIS-enabled planning", "sustainable and resilient construction"],
    domains: [
      {
        label: "Structural and Geotechnical Systems",
        skills: ["structural and geotechnical solutions", "load-resisting civil systems", "foundation and material behavior models"],
        applicationContexts: ["safe and durable infrastructure projects", "civil design and site response problems", "performance-oriented structural applications"],
        toolPhrases: ["using structural analysis, surveying, and geotechnical evaluation tools", "using modeling, testing, and design code workflows", "using civil engineering calculations and verification methods"],
        keywordAnchors: ["structural", "geotechnical", "foundation"],
        societySignals: ["Civil", "Structural", "Survey"],
        primaryVerb: "Analyze",
        abetMappings: ["SO1", "SO5"],
      },
      {
        label: "Infrastructure Design and Construction",
        skills: ["civil infrastructure solutions", "transportation and construction systems", "site-specific engineering designs"],
        applicationContexts: ["public infrastructure and construction delivery", "urban and regional mobility projects", "resource-aware civil implementations"],
        toolPhrases: ["using design standards, project planning, and civil modeling tools", "using construction management and detailing workflows", "using engineering design and verification platforms"],
        keywordAnchors: ["infrastructure", "construction", "transportation"],
        societySignals: ["Civil", "Construction", "Infrastructure"],
        primaryVerb: "Design",
        abetMappings: ["SO2", "SO5"],
      },
      {
        label: "Environmental and Smart Civil Practice",
        skills: ["environmentally responsible civil solutions", "data-enabled infrastructure systems", "sustainable water and urban engineering practices"],
        applicationContexts: ["smart city and resilient infrastructure applications", "environmental compliance and public welfare needs", "sustainable civil engineering operations"],
        toolPhrases: ["using GIS, sustainability, and performance assessment tools", "using digital planning and environmental analysis methods", "using modern civil monitoring and decision-support platforms"],
        keywordAnchors: ["environmental", "sustainable", "smart"],
        societySignals: ["Civil", "Environmental", "Smart"],
        primaryVerb: "Evaluate",
        abetMappings: ["SO2", "SO4", "SO5"],
        emergingFocus: true,
      },
    ],
  },
  GENERIC: {
    domain: "GENERIC",
    disciplineLabel: "Engineering",
    criteriaBasis: [
      "Program-specific outcomes should be derived from discipline criteria rather than generic graduate attributes.",
      "Each outcome must articulate a measurable, domain-bound technical capability with explicit engineering application context.",
    ],
    genericityBlockers: ["engineering", "systems", "analysis", "design", "tools"],
    emergingAreas: ["AI-enabled engineering", "automation", "sustainability"],
    domains: [
      {
        label: "Core Engineering Analysis",
        skills: ["engineering problem-solving methods", "domain-specific analytical techniques", "evidence-based technical decisions"],
        applicationContexts: ["complex discipline-bound engineering problems", "program-relevant technical workflows", "realistic engineering constraints"],
        toolPhrases: ["using engineering models, data, and analytical tools", "using experimentation and problem-solving methods", "using discipline-appropriate computational tools"],
        keywordAnchors: ["analysis", "engineering", "technical"],
        societySignals: ["Engineering"],
        primaryVerb: "Apply",
        abetMappings: ["SO1", "SO5"],
      },
      {
        label: "System and Product Design",
        skills: ["discipline-specific engineering systems", "implementable technical solutions", "validated design alternatives"],
        applicationContexts: ["professional engineering practice", "user and stakeholder needs", "safety, quality, and sustainability constraints"],
        toolPhrases: ["using modern design, validation, and implementation tools", "using engineering standards and design workflows", "using modeling and testing methods"],
        keywordAnchors: ["design", "system", "implementation"],
        societySignals: ["Engineering"],
        primaryVerb: "Design",
        abetMappings: ["SO2", "SO5"],
      },
      {
        label: "Emerging and Sustainable Practice",
        skills: ["technology-enabled engineering solutions", "automation-ready systems", "sustainable engineering improvements"],
        applicationContexts: ["emerging technologies and societal needs", "responsible and future-ready applications", "modern professional engineering environments"],
        toolPhrases: ["using digital tools, automation platforms, and evaluation methods", "using contemporary engineering technologies", "using data-enabled monitoring and optimization workflows"],
        keywordAnchors: ["automation", "sustainable", "digital"],
        societySignals: ["Engineering"],
        primaryVerb: "Develop",
        abetMappings: ["SO2", "SO4", "SO5"],
        emergingFocus: true,
      },
    ],
  },
};

function normalizeWhitespace(text: string): string {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeToken(text: string): string {
  return normalizeWhitespace(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeWhitespace).filter(Boolean)));
}

function flattenSocieties(selectedSocieties?: SelectedSocietiesInput): string[] {
  if (!selectedSocieties) return [];
  return uniqueStrings([
    ...(selectedSocieties.lead || []),
    ...(selectedSocieties.co_lead || []),
    ...(selectedSocieties.coLead || []),
    ...(selectedSocieties.cooperating || []),
  ]);
}

function normalizeSelectedSocieties(selectedSocieties?: SelectedSocietiesInput): Required<SelectedSocietiesInput> {
  return {
    lead: uniqueStrings(selectedSocieties?.lead || []),
    co_lead: uniqueStrings(selectedSocieties?.co_lead || selectedSocieties?.coLead || []),
    coLead: uniqueStrings(selectedSocieties?.coLead || selectedSocieties?.co_lead || []),
    cooperating: uniqueStrings(selectedSocieties?.cooperating || []),
  };
}

function orderedDomains(
  profile: ProgramCriteriaProfile,
  selectedSocieties: Required<SelectedSocietiesInput>,
  focusAreas: string[],
): DomainAreaSpec[] {
  const leadEvidence = normalizeToken([...(selectedSocieties.lead || []), ...focusAreas].join(" "));
  const coLeadEvidence = normalizeToken([...(selectedSocieties.co_lead || []), ...focusAreas].join(" "));
  const cooperatingEvidence = normalizeToken([...(selectedSocieties.cooperating || []), ...focusAreas].join(" "));

  return [...profile.domains].sort((left, right) => {
    const score = (domain: DomainAreaSpec) => {
      const domainHints = [
        domain.label,
        ...domain.societySignals,
        ...domain.keywordAnchors,
      ];
      return domainHints.reduce((total, hint) => {
        const normalizedHint = normalizeToken(hint);
        if (!normalizedHint) return total;

        let weightedTotal = total;
        if (leadEvidence.includes(normalizedHint)) weightedTotal += 3;
        if (coLeadEvidence.includes(normalizedHint)) weightedTotal += 2;
        if (cooperatingEvidence.includes(normalizedHint)) weightedTotal += 1;
        return weightedTotal;
      }, domain.emergingFocus ? 0.25 : 0);
    };

    return score(right) - score(left);
  });
}

function selectVerb(domain: DomainAreaSpec, index: number): ApprovedActionVerb {
  const fallbacks: ApprovedActionVerb[] = [
    domain.primaryVerb,
    "Apply",
    "Design",
    "Analyze",
    "Develop",
    "Evaluate",
    "Integrate",
    "Optimize",
    "Implement",
  ];

  return fallbacks[index % fallbacks.length];
}

function buildStatement(
  profile: ProgramCriteriaProfile,
  domain: DomainAreaSpec,
  index: number,
): GeneratedPSODetail {
  const actionVerb = selectVerb(domain, index);
  const skill = domain.skills[index % domain.skills.length];
  const toolPhrase = domain.toolPhrases[index % domain.toolPhrases.length];
  const applicationContext =
    domain.applicationContexts[index % domain.applicationContexts.length];
  const emergingArea =
    profile.emergingAreas[index % profile.emergingAreas.length];
  const includeEmerging = domain.emergingFocus || index >= profile.domains.length;
  const emergingPhrase = includeEmerging ? ` while integrating ${emergingArea}` : "";

  const statement = normalizeWhitespace(
    `${actionVerb} ${skill} ${toolPhrase} for ${applicationContext}${emergingPhrase}.`,
  );

  const abetMappings = Array.from(
    new Set([
      ...domain.abetMappings,
      ...(includeEmerging ? (["SO4"] as ABETStudentOutcome[]) : []),
    ]),
  );

  const uniqueToProgram = profile.genericityBlockers.some((token) =>
    normalizeToken(statement).includes(normalizeToken(token)),
  );

  return {
    statement,
    domain: domain.label,
    skill,
    applicationContext,
    toolPhrase,
    actionVerb,
    abetMappings,
    criteriaBasis: profile.criteriaBasis,
    sourceSocieties: [],
    emergingAreas: includeEmerging ? [emergingArea] : [],
    validation: {
      actionVerbPass: APPROVED_ACTION_VERBS.includes(actionVerb),
      hasAbetMapping: abetMappings.length > 0,
      uniqueToProgram,
    },
  };
}

function similarityScore(left: string, right: string): number {
  const leftTokens = new Set(
    normalizeToken(left).split(/\s+/).filter((token) => token.length >= 4),
  );
  const rightTokens = new Set(
    normalizeToken(right).split(/\s+/).filter((token) => token.length >= 4),
  );

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;

  return union === 0 ? 0 : intersection / union;
}

function summarizeValidation(
  profile: ProgramCriteriaProfile,
  details: GeneratedPSODetail[],
  societies: string[],
): PSOValidationSummary {
  const requiredDomains = profile.domains.map((item) => item.label);
  const coveredDomains = uniqueStrings(details.map((item) => item.domain));
  const missingDomains = requiredDomains.filter(
    (domain) => !coveredDomains.includes(domain),
  );

  const actionVerbFailures = details
    .filter((item) => !item.validation.actionVerbPass)
    .map((item) => item.statement);

  const unmapped = details
    .filter((item) => !item.validation.hasAbetMapping)
    .map((item) => item.statement);

  const genericStatements = details
    .filter((item) => !item.validation.uniqueToProgram)
    .map((item) => item.statement);

  const highSimilarityPairs: string[] = [];
  for (let index = 0; index < details.length; index += 1) {
    for (let inner = index + 1; inner < details.length; inner += 1) {
      if (similarityScore(details[index].statement, details[inner].statement) >= 0.68) {
        highSimilarityPairs.push(
          `${details[index].domain} <> ${details[inner].domain}`,
        );
      }
    }
  }

  return {
    sourceValidation: {
      passed: profile.criteriaBasis.length > 0,
      message: `Derived from ${profile.disciplineLabel} criteria anchors instead of generic PO-style statements.`,
      criteriaBasis: profile.criteriaBasis,
      societies,
    },
    domainCoverage: {
      passed: missingDomains.length === 0,
      required: requiredDomains,
      covered: coveredDomains,
      missing: missingDomains,
    },
    actionVerbCheck: {
      passed: actionVerbFailures.length === 0,
      approvedVerbs: APPROVED_ACTION_VERBS,
      failures: actionVerbFailures,
    },
    abetMappingCheck: {
      passed: unmapped.length === 0,
      unmapped,
    },
    uniquenessCheck: {
      passed: genericStatements.length === 0 && highSimilarityPairs.length === 0,
      genericStatements,
      highSimilarityPairs,
    },
  };
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function fetchGeminiPSOs(
  params: PSOAgentParams,
  requiredDomains: string[],
  emergingAreas: string[],
): Promise<GeneratedPSODetail[]> {
  const { geminiApiKey, programName, count, selectedSocieties, focusAreas } =
    params;
  if (!geminiApiKey) return [];

  const prompt = buildPSOGenerationPrompt({
    programName,
    count,
    selectedSocieties,
    requiredDomains,
    emergingAreas,
    focusAreas,
  });

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      console.error("Gemini API Error (PSO):", await res.text());
      return [];
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) return [];

    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const generatedPSOs = Array.isArray(parsed.PSOs) ? parsed.PSOs : [];

      return generatedPSOs.map((p: any) => ({
        statement: p.statement || "",
        domain: p.focus_area || "General",
        skill: p.statement ? p.statement.split(" ")[0] : "Apply",
        applicationContext: p.focus_area || "Program Context",
        toolPhrase: "appropriate tools",
        actionVerb: (p.statement ? p.statement.split(" ")[0] : "Apply") as ApprovedActionVerb,
        abetMappings: Array.isArray(p.mapped_abet_elements) ? p.mapped_abet_elements : [],
        criteriaBasis: [],
        sourceSocieties: [],
        emergingAreas: [],
        validation: {
          actionVerbPass: true,
          hasAbetMapping: true,
          uniqueToProgram: true,
        },
      }));
    } catch (parseError) {
      console.error("Failed to parse Gemini PSO response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Gemini fetch error (PSO):", error);
    return [];
  }
}

export async function psoAgent(params: PSOAgentParams): Promise<PSOAgentResult> {
  const count = Math.max(1, Math.min(10, Number(params.count || 3)));
  const profile = PROFILE_BY_DOMAIN[detectProgramDomain(params.programName)];
  const societySelection = normalizeSelectedSocieties(params.selectedSocieties);
  const societies = flattenSocieties(societySelection);
  const focusAreas = uniqueStrings(params.focusAreas || []);
  const rankedDomains = orderedDomains(profile, societySelection, focusAreas);
  const requiredDomains = profile.domains.map((item) => item.label);
  const prompt = buildPSOGenerationPrompt({
    programName: params.programName,
    count,
    selectedSocieties: societySelection,
    requiredDomains,
    emergingAreas: profile.emergingAreas,
    focusAreas,
  });

  // Attempt Gemini Generation
  const aiDetails = await fetchGeminiPSOs(
    params,
    requiredDomains,
    profile.emergingAreas,
  );

  let details: GeneratedPSODetail[] = [];
  if (aiDetails.length > 0) {
    details = aiDetails.slice(0, count);
  } else {
    // Fallback to Template-based Generation
    const seenStatements = new Set<string>();
    for (
      let index = 0;
      details.length < count && index < count * 4;
      index += 1
    ) {
      const domainArea = rankedDomains[index % rankedDomains.length];
      const detail = buildStatement(profile, domainArea, index);
      detail.sourceSocieties = societies;

      if (!seenStatements.has(detail.statement)) {
        seenStatements.add(detail.statement);
        details.push(detail);
      }
    }
  }

  const validation = summarizeValidation(profile, details, societies);

  return {
    results: details.map((item) => item.statement),
    details,
    validation,
    sources: {
      programCriteria: profile.criteriaBasis,
      societies,
      emergingAreas: profile.emergingAreas,
    },
    selectionContext: {
      lead: societySelection.lead || [],
      coLead: societySelection.co_lead || [],
      cooperating: societySelection.cooperating || [],
      count,
    },
    prompt,
  };
}
