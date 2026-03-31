/**
 * lib/ai/constants.ts
 * Central repository for static curriculum constants used by AI agents and scoring.
 * Preserves the high-quality design tokens from the legacy template engines.
 */

// ── Vision Constants ─────────────────────────────────────────────────────────

export const VISION_PRIORITY_PILLAR_BANK: Record<string, string[]> = {
  "Global Engineering Excellence": [
    "rigorous institutional quality",
    "credentialed scholarly conduct",
    "high-caliber academic stewardship",
  ],
  "Future-ready engineers": [
    "long-term professional readiness",
    "career-aligned competency growth",
    "sustained professional capability",
  ],
  "Innovation-driven education": [
    "applied innovation practice",
    "research-driven technological progress",
    "purposeful technological inquiry",
  ],
  "Technology with purpose": [
    "purposeful technological application",
    "technology-driven societal benefit",
    "applied technological service",
  ],
  "Engineering for societal impact": [
    "sustainable societal contribution",
    "long-term societal impact",
    "meaningful societal progress",
  ],
  "Internationally benchmarked": [
    "accredited institutional quality",
    "quality-driven academic conduct",
    "credentialed institutional rigor",
  ],
  "Outcome-oriented education": [
    "institutional academic rigor",
    "outcome-driven institutional quality",
    "evidence-based academic conduct",
  ],
  "Professional engineering standards": [
    "ethical institutional governance",
    "rigorous professional conduct",
    "professional academic integrity",
  ],
  "Globally competitive graduates": [
    "quality-driven professional conduct",
    "long-term professional competitiveness",
    "industry-aligned professional capability",
  ],
  "Ethics and integrity": [
    "integrity-driven institutional service",
    "responsible professional conduct",
    "ethical institutional governance",
  ],
  "Sustainable development": [
    "sustainable societal contribution",
    "long-term environmental stewardship",
    "sustainable institutional stewardship",
  ],
  "Human-centric engineering": [
    "human-focused technological contribution",
    "people-oriented societal progress",
    "inclusive societal impact",
  ],
  "Responsible innovation": [
    "responsible technological innovation",
    "ethical innovation governance",
    "purposeful innovation service",
  ],
};

export const VISION_STARTERS = [
  "To be globally recognized for long-term",
  "To emerge as a long-term",
  "To achieve distinction in",
  "To advance as a leading",
  "To be globally respected for",
];

export const VISION_EXAMPLES = [
  "To be globally recognized for long-term {prog} distinction through rigorous institutional quality, applied innovation practice, and sustainable societal contribution.",
  "To emerge as a long-term {prog} benchmark for globally respected distinction through sustainable societal contribution and long-term professional readiness.",
  "To achieve distinction in {prog} through sustained institutional academic rigor, research-driven technological progress, and ethical institutional governance.",
];

// ── Mission Constants ────────────────────────────────────────────────────────

export const MISSION_EXAMPLES = [
  "Deliver a rigorous {prog} curriculum through outcome-based education, continuous assessment, and evidence-driven academic improvement. Strengthen research engagement, industry collaboration, and applied practice to align graduates with career and accreditation standards. Foster ethical responsibility, innovation capability, and societal awareness to sustain long-term professional growth and community impact.",
  "Advance {prog} through research-driven inquiry, applied industry partnerships, hands-on laboratory engagement, and collaborative professional learning. Implement outcome-based curriculum design, continuous academic review, and systematic quality improvement across all program activities. Promote ethical conduct, sustainable practices, and societal responsibility among graduates to sustain institutional growth and community impact.",
  "Foster an environment of ethical conduct, professional integrity, and societal responsibility within the {prog} community. Deliver rigorous curriculum through outcome-based assessment, continuous program improvement, and accreditation-aligned academic quality standards. Sustain research engagement, industry collaboration, and innovation practice to prepare graduates for evolving engineering challenges.",
];

// ── PEO Constants ────────────────────────────────────────────────────────────

export const PEO_PRIORITIES = [
  "Institute Vision",
  "Institute Mission",
  "National Priorities",
  "Regional Priorities",
  "Local Priorities",
  "21st Century Skills",
  "Sustainable Development Goals (SDGs)",
  "Entrepreneurship",
  "Professional Practice",
  "Higher Education and Growth",
  "Leadership and Teamwork",
  "Ethics and Society",
  "Adaptability",
];

export const PEO_PHRASE_BANK: Record<string, string[]> = {
  "Institute Vision": [
    "contribute to realizing the institute's vision through technical leadership and evidence-based professional practice",
    "apply engineering expertise to advance institutional goals and contribute to strategic professional development",
  ],
  "Institute Mission": [
    "demonstrate alignment with institutional mission by advancing engineering practice and meaningful societal contribution",
    "apply professional competencies in ways that reflect the institute's educational values and operational mission",
  ],
  "National Priorities": [
    "contribute to national development goals through engineering practice, technological innovation, and technical leadership",
    "apply engineering knowledge to address national challenges in infrastructure, technology, and sustainable community growth",
  ],
  "Regional Priorities": [
    "engage with regional industry and community needs through applied engineering practice and professional collaboration",
    "contribute to regional development by applying technical skills in context-relevant engineering and local innovation",
  ],
  "Local Priorities": [
    "address local engineering challenges through applied practice, community engagement, and purposeful professional contribution",
    "engage with local industry and civic needs through engineering expertise and collaborative professional service",
  ],
  "21st Century Skills": [
    "demonstrate critical thinking, collaborative problem-solving, and adaptable technical skills in professional engineering roles",
    "apply communication, analytical reasoning, and technology skills to address evolving engineering and professional challenges",
  ],
  "Sustainable Development Goals (SDGs)": [
    "contribute to sustainable development through engineering practice aligned with environmental and social responsibility",
    "design and implement engineering solutions that advance sustainability and long-term community well-being",
  ],
  "Entrepreneurship": [
    "lead or contribute to entrepreneurial engineering ventures through technical competency and innovation-driven thinking",
    "demonstrate entrepreneurial mindset by identifying engineering opportunities and developing impactful professional solutions",
  ],
  "Professional Practice": [
    "demonstrate professional engineering competency through technical leadership, ethical conduct, and career advancement",
    "apply engineering expertise in professional roles, advancing technical standards and contributing to organizational goals",
  ],
  "Higher Education and Growth": [
    "pursue advanced education or research to deepen engineering expertise and contribute to professional knowledge",
    "engage in lifelong learning through higher education, professional certification, or specialized technical development",
  ],
  "Leadership and Teamwork": [
    "lead multidisciplinary engineering teams, demonstrating collaborative skills, professional communication, and technical judgment",
    "manage engineering projects and collaborate with diverse teams to deliver effective and impactful technical solutions",
  ],
  "Ethics and Society": [
    "demonstrate ethical judgment and social responsibility in engineering practice, contributing to sustainable community outcomes",
    "apply professional ethics and societal awareness in engineering roles, balancing technical decisions with public welfare",
  ],
  "Adaptability": [
    "adapt engineering skills to evolving technological environments, demonstrating resilience and continuous professional development",
    "engage with emerging technologies and changing professional demands through adaptive learning and technical flexibility",
  ],
};

export const PEO_REQUIRED_PREFIX = "Within 3 to 5 years of graduation, graduates will";

// ── PO Constants ─────────────────────────────────────────────────────────────

export const STANDARD_PO_STATEMENTS: string[] = [
  "Ability to apply knowledge of mathematics, science, and engineering.",
  "Ability to design and conduct experiments, as well as to analyze and interpret data.",
  "Ability to design a system, component, or process to meet desired needs within realistic constraints.",
  "Ability to function on multidisciplinary teams.",
  "Ability to identify, formulate, and solve engineering problems.",
  "Ability to understand professional and ethical responsibility.",
  "Ability to communicate effectively.",
  "Ability to understand the impact of engineering solutions in a global and societal context.",
  "Ability to recognize the need for and engage in lifelong learning.",
  "Ability to use techniques, skills, and modern engineering tools necessary for engineering practice.",
  "Ability to design systems that meet specified needs with appropriate consideration for public health and safety.",
  "Ability to conduct research and contribute to engineering knowledge and practice.",
];

export const CUSTOM_PO_TEMPLATES: Record<string, string[]> = {
  innovation: [
    "Ability to apply innovative thinking and creative problem-solving to engineering challenges.",
    "Ability to identify and develop novel engineering solutions through systematic innovation.",
  ],
  ethics: [
    "Ability to analyze ethical implications of engineering decisions and apply professional standards.",
    "Ability to demonstrate ethical judgment and social responsibility in engineering practice.",
  ],
  leadership: [
    "Ability to lead engineering projects and collaborate effectively in diverse professional teams.",
    "Ability to manage technical projects, coordinate team efforts, and deliver engineering outcomes.",
  ],
};
