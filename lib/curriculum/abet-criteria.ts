export interface ABETProgramCriteria {
  name: string;
  match_keywords: string[];
  statement: string;
  curriculum: string[];
  faculty: string;
}

export interface ABETCriteriaConfig {
  programs: ABETProgramCriteria[];
  fallback: {
    statement: string;
    use_when: string;
  };
}

export const ABET_CRITERIA_DATA: ABETCriteriaConfig = {
  "programs": [
    {
      "name": "Engineering Management",
      "match_keywords": ["management"],
      "statement": "The curriculum must provide breadth and depth in engineering management, including management of technical personnel, projects, and organizations. It must include management topics (project management, strategy), financial topics (engineering economics, accounting), and modeling topics (operations research, simulation). Faculty must be qualified through engineering education and experience in managing technical activities.",
      "curriculum": [
        "project management",
        "technology management",
        "team building",
        "engineering economics",
        "accounting",
        "operations research",
        "simulation"
      ],
      "faculty": "Engineering background + management experience"
    },
    {
      "name": "Engineering Mechanics",
      "match_keywords": ["mechanics"],
      "statement": "The curriculum must include mathematical and computational methods to analyze, model, and design physical systems involving solid and fluid components under steady and transient conditions. Faculty must maintain expertise in their specialization.",
      "curriculum": [
        "solid mechanics",
        "fluid mechanics",
        "computational modeling",
        "transient analysis"
      ],
      "faculty": "Maintain expertise in specialization"
    },
    {
      "name": "Mechanical Engineering",
      "match_keywords": ["mechanical"],
      "statement": "The curriculum must include mathematics (multivariable calculus, differential equations), engineering sciences, and applications to modeling, analysis, and design of physical systems. It must cover both thermal and mechanical systems, with depth in at least one area. Faculty must maintain current expertise.",
      "curriculum": [
        "thermal systems",
        "mechanical systems",
        "design and analysis",
        "modeling physical systems"
      ],
      "faculty": "Maintain current expertise"
    },
    {
      "name": "Civil Engineering",
      "match_keywords": ["civil"],
      "statement": "The curriculum must include mathematics, physics, chemistry, engineering mechanics, materials science, sustainability, risk, and design in multiple civil engineering contexts. It must also include project management and professional ethics. Faculty must have design experience or licensure.",
      "curriculum": [
        "structures",
        "materials",
        "sustainability",
        "risk and resilience",
        "project management"
      ],
      "faculty": "Licensed or design-experienced"
    },
    {
      "name": "Electrical and Computer Engineering",
      "match_keywords": ["electrical", "electronics", "computer", "communication"],
      "statement": "The curriculum must include mathematics (calculus, differential equations), probability, statistics, and engineering topics required to design and analyze electrical, electronic, and computing systems. It must include hardware and software integration. Faculty must understand engineering design and systems.",
      "curriculum": [
        "signals",
        "systems",
        "electronics",
        "hardware-software integration",
        "communication systems"
      ],
      "faculty": "System design expertise"
    },
    {
      "name": "Chemical Engineering",
      "match_keywords": ["chemical", "biochemical"],
      "statement": "The curriculum must include mathematics, chemistry, physics, and engineering applications for process design, analysis, and control, including safety and hazard considerations. Faculty must be qualified in chemical engineering practice.",
      "curriculum": [
        "process design",
        "thermodynamics",
        "reaction engineering",
        "safety analysis"
      ],
      "faculty": "Chemical engineering qualified"
    },
    {
      "name": "Software Engineering",
      "match_keywords": ["software"],
      "statement": "The curriculum must include computing fundamentals, software design, development, verification, validation, security, and software engineering processes. It must also include discrete mathematics and statistics. Faculty must maintain current software engineering practice knowledge.",
      "curriculum": [
        "software design",
        "testing",
        "security",
        "requirements engineering"
      ],
      "faculty": "Current software practice knowledge"
    },
    {
      "name": "Environmental Engineering",
      "match_keywords": ["environmental"],
      "statement": "The curriculum must include mathematics, chemistry, biology, fluid mechanics, and environmental system design considering sustainability, risk, and life-cycle impacts. Faculty must be qualified in environmental design practice.",
      "curriculum": [
        "environmental systems",
        "water and air systems",
        "sustainability",
        "risk analysis"
      ],
      "faculty": "Environmental design practice qualified"
    },
    {
      "name": "Materials Engineering",
      "match_keywords": ["materials", "metallurgical", "ceramics"],
      "statement": "The curriculum must include mathematics (differential equations), engineering sciences, and applications to the structure, properties, and processing of materials. It must cover at least two materials classes (e.g., metals, polymers, ceramics, composites). Faculty must maintain current expertise.",
      "curriculum": [
        "structure-property relationship",
        "materials processing",
        "metals/polymers/ceramics",
        "thermodynamics of materials"
      ],
      "faculty": "Maintain current expertise in materials"
    },
    {
      "name": "Industrial Engineering",
      "match_keywords": ["industrial", "manufacturing", "production"],
      "statement": "The curriculum must include mathematics, statistics, and engineering science to design, develop, implement, and improve integrated systems that include people, materials, information, equipment and energy. It must include systems modeling, human factors, and production systems.",
      "curriculum": [
        "systems modeling",
        "operations research",
        "human factors",
        "production planning and control"
      ],
      "faculty": "Industrial engineering qualified"
    },
    {
      "name": "Biomedical Engineering",
      "match_keywords": ["biomedical", "bioengineering", "biotech"],
      "statement": "The curriculum must include mathematics through differential equations and statistics, science (biology, chemistry, physics), and engineering applications for analyzing and designing systems for medicine and biology. It must include cellular/molecular biology and clinical applications.",
      "curriculum": [
        "biological systems",
        "medical instrumentation",
        "biomechanics",
        "healthcare technology"
      ],
      "faculty": "Biomedical systems expertise"
    },
    {
      "name": "Aerospace Engineering",
      "match_keywords": ["aerospace", "aeronautical", "astronautical"],
      "statement": "The curriculum must include mathematics, physics, and aeronautical/astronautical engineering for designing vehicles for flight in atmosphere and space. It must cover aerodynamics, propulsion, structures, and control systems.",
      "curriculum": [
        "aerodynamics",
        "propulsion",
        "flight mechanics",
        "aerospace structures"
      ],
      "faculty": "Aerospace design expertise"
    },
    {
      "name": "Systems Engineering",
      "match_keywords": ["systems", "mechatronics", "robotics"],
      "statement": "The curriculum must include mathematics, statistics, and engineering science to design, develop, implement, and improve integrated systems. It must include systems modeling, simulation, and optimization across the life cycle.",
      "curriculum": [
        "systems modeling",
        "simulation",
        "optimization",
        "life-cycle analysis"
      ],
      "faculty": "Systems engineering expertise"
    }
  ],
  "fallback": {
    "statement": "The program must enable graduates to apply engineering knowledge, design systems under constraints, conduct experiments, analyze data, communicate effectively, work in teams, follow ethics, and engage in lifelong learning.",
    "use_when": "program not matched"
  }
};
