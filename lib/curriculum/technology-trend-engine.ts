import { detectProgramDomain, ProgramDomain } from "@/lib/curriculum/domain-knowledge";

export interface TrendSkill {
  topic: string;
  relevance: "high" | "medium";
}

export interface TrendSource {
  name: string;
  note: string;
}

export interface TechnologyTrendSnapshot {
  domain: ProgramDomain;
  generatedAt: string;
  coreTrendSkills: TrendSkill[];
  suggestedElectives: string[];
  suggestedSkillModules: string[];
  sources: TrendSource[];
}

const DOMAIN_TRENDS: Record<ProgramDomain, Omit<TechnologyTrendSnapshot, "domain" | "generatedAt">> = {
  CSE: {
    coreTrendSkills: [
      { topic: "Generative AI Engineering", relevance: "high" },
      { topic: "Cloud Native Architecture", relevance: "high" },
      { topic: "Cybersecurity Engineering", relevance: "high" },
      { topic: "Data Engineering", relevance: "medium" },
      { topic: "Edge AI Systems", relevance: "medium" },
    ],
    suggestedElectives: [
      "Generative AI Systems",
      "Cloud Computing",
      "Cybersecurity",
      "Data Engineering",
      "Edge Computing",
    ],
    suggestedSkillModules: [
      "Git and DevOps Practice",
      "Python for AI and Data",
      "Secure Coding Lab",
    ],
    sources: [
      { name: "IEEE", note: "AI, cloud, and secure systems curriculum trends" },
      { name: "ACM", note: "Computing curriculum and emerging domain competencies" },
      { name: "World Economic Forum", note: "AI and digital skills outlook" },
      { name: "GitHub Trends", note: "Developer tooling and framework adoption" },
      { name: "Stack Overflow Insights", note: "High-demand programming topics" },
    ],
  },
  ECE: {
    coreTrendSkills: [
      { topic: "5G/6G Communication", relevance: "high" },
      { topic: "Embedded AI", relevance: "high" },
      { topic: "VLSI Verification", relevance: "medium" },
      { topic: "IoT Systems", relevance: "medium" },
      { topic: "Edge Signal Intelligence", relevance: "medium" },
    ],
    suggestedElectives: [
      "5G Communication Technologies",
      "Embedded AI",
      "Advanced VLSI",
      "IoT Systems",
    ],
    suggestedSkillModules: [
      "Embedded Prototyping Lab",
      "Signal Processing Practice",
      "PCB and Hardware Tools",
    ],
    sources: [
      { name: "IEEE", note: "Communication and embedded technologies" },
      { name: "ACM", note: "Cross-domain computing-electronics interfaces" },
      { name: "World Economic Forum", note: "Advanced electronics workforce trends" },
      { name: "GitHub Trends", note: "Embedded and edge framework activity" },
      { name: "Stack Overflow Insights", note: "Hardware-software integration demand" },
    ],
  },
  EEE: {
    coreTrendSkills: [
      { topic: "Smart Grid Analytics", relevance: "high" },
      { topic: "Electric Vehicle Systems", relevance: "high" },
      { topic: "Power Electronics Control", relevance: "high" },
      { topic: "Renewable Integration", relevance: "medium" },
      { topic: "Industrial IoT for Power", relevance: "medium" },
    ],
    suggestedElectives: [
      "Smart Grid Technologies",
      "Electric Vehicle Systems",
      "Advanced Power Electronics",
      "Renewable Energy Integration",
    ],
    suggestedSkillModules: [
      "Power System Simulation",
      "Drive and Control Practice",
      "Energy Analytics Tools",
    ],
    sources: [
      { name: "IEEE", note: "Power and energy roadmap insights" },
      { name: "ACM", note: "Grid intelligence and analytics" },
      { name: "World Economic Forum", note: "Green transition skill demand" },
      { name: "GitHub Trends", note: "Power-system simulation tools" },
      { name: "Stack Overflow Insights", note: "Industrial automation and EV stacks" },
    ],
  },
  MECH: {
    coreTrendSkills: [
      { topic: "Robotics and Autonomous Systems", relevance: "high" },
      { topic: "Advanced Manufacturing", relevance: "high" },
      { topic: "Digital Twin Systems", relevance: "high" },
      { topic: "Additive Manufacturing", relevance: "medium" },
      { topic: "Industry 4.0 Automation", relevance: "medium" },
    ],
    suggestedElectives: [
      "Robotics and Automation",
      "Advanced Manufacturing",
      "Digital Twin Systems",
      "Additive Manufacturing",
    ],
    suggestedSkillModules: [
      "CAD/CAM Practice",
      "Automation Toolchain Lab",
      "Manufacturing Data Analytics",
    ],
    sources: [
      { name: "IEEE", note: "Smart manufacturing and robotics trends" },
      { name: "ACM", note: "Cyber-physical production systems" },
      { name: "World Economic Forum", note: "Manufacturing 4.0 competencies" },
      { name: "GitHub Trends", note: "Robotics frameworks and simulation stacks" },
      { name: "Stack Overflow Insights", note: "Automation and mechatronics skill signals" },
    ],
  },
  CIVIL: {
    coreTrendSkills: [
      { topic: "Sustainable Infrastructure", relevance: "high" },
      { topic: "Smart City Engineering", relevance: "high" },
      { topic: "Digital Construction Analytics", relevance: "medium" },
      { topic: "Remote Sensing and GIS", relevance: "medium" },
      { topic: "Resilient Design", relevance: "medium" },
    ],
    suggestedElectives: [
      "Smart and Sustainable Cities",
      "Remote Sensing and GIS",
      "Advanced Concrete Technology",
      "Earthquake Engineering",
    ],
    suggestedSkillModules: [
      "Survey and GIS Practice",
      "Infrastructure Data Modeling",
      "Construction Automation Tools",
    ],
    sources: [
      { name: "IEEE", note: "Smart infrastructure and sensing" },
      { name: "ACM", note: "Urban systems and digital twins" },
      { name: "World Economic Forum", note: "Sustainability skill outlook" },
      { name: "GitHub Trends", note: "GIS and geospatial tooling" },
      { name: "Stack Overflow Insights", note: "Civil-tech software demand" },
    ],
  },
  GENERIC: {
    coreTrendSkills: [
      { topic: "AI Literacy", relevance: "high" },
      { topic: "Cloud Platforms", relevance: "high" },
      { topic: "Automation and Data Skills", relevance: "medium" },
    ],
    suggestedElectives: [
      "Artificial Intelligence",
      "Cloud Computing",
      "Data Analytics",
      "Automation Systems",
    ],
    suggestedSkillModules: [
      "Python and Data Practice",
      "Git and Collaboration",
      "Industry Tools Lab",
    ],
    sources: [
      { name: "IEEE", note: "Cross-domain technology updates" },
      { name: "ACM", note: "Computing and systems competencies" },
      { name: "World Economic Forum", note: "Future-of-work trends" },
      { name: "GitHub Trends", note: "Ecosystem technology movement" },
      { name: "Stack Overflow Insights", note: "Skill demand indicators" },
    ],
  },
};

export function getTechnologyTrendSnapshot(programNameOrType: string): TechnologyTrendSnapshot {
  const domain = detectProgramDomain(programNameOrType);
  const profile = DOMAIN_TRENDS[domain];
  return {
    domain,
    generatedAt: new Date().toISOString(),
    coreTrendSkills: profile.coreTrendSkills,
    suggestedElectives: profile.suggestedElectives,
    suggestedSkillModules: profile.suggestedSkillModules,
    sources: profile.sources,
  };
}
