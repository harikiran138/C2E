export type StepKind = 'form' | 'matrix' | 'table' | 'action' | 'info' | 'program_select';

export type StepSection = 'side_menu' | 'process';

export interface ProcessStep {
  key: string;
  title: string;
  section: StepSection;
  processNumber?: number;
  kind: StepKind;
  aiDriven?: boolean;
  description: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    key: 'council',
    title: 'Constitute Academic Council',
    section: 'side_menu',
    kind: 'form',
    description: 'Create Academic Council member entries and maintain tenure, category, and communication details.',
  },
  {
    key: 'process-1',
    title: 'Tutor (Definitions & Protocols of OBE)',
    section: 'process',
    processNumber: 1,
    kind: 'info',
    description: 'Maintain formal OBE definitions, tutoring protocol references, and implementation guidelines.',
  },
  {
    key: 'process-2',
    title: 'Select Program of Study',
    section: 'process',
    processNumber: 2,
    kind: 'program_select',
    description: 'Select program from institutional entries. Dropdown values must float from institution programs.',
  },
  {
    key: 'process-3',
    title: 'Constitute Program Advisory Committee (PAC)',
    section: 'process',
    processNumber: 3,
    kind: 'form',
    description: 'Capture PAC constitution details and participating members.',
  },
  {
    key: 'process-4',
    title: 'Constitute Board of Studies (BoS)',
    section: 'process',
    processNumber: 4,
    kind: 'form',
    description: 'Document BoS composition and review authority.',
  },
  {
    key: 'process-5',
    title: 'Add Representative Stakeholders',
    section: 'process',
    processNumber: 5,
    kind: 'form',
    description: 'Add representative stakeholders for consultation and validation.',
  },
  {
    key: 'process-6',
    title: 'Formulate Vision, Mission, & PEOs',
    section: 'process',
    processNumber: 6,
    kind: 'form',
    aiDriven: true,
    description: 'Formulate vision, mission, and PEOs with AI-assisted drafting.',
  },
  {
    key: 'process-7',
    title: 'Generate Consistency Matrix of Mission & PEOs',
    section: 'process',
    processNumber: 7,
    kind: 'matrix',
    description: 'Generate consistency matrix between mission components and PEOs.',
  },
  {
    key: 'process-8',
    title: 'Generate Program Outcomes',
    section: 'process',
    processNumber: 8,
    kind: 'form',
    description: 'Draft and store measurable program outcomes.',
  },
  {
    key: 'process-9',
    title: 'Formulate Program Specific Outcomes',
    section: 'process',
    processNumber: 9,
    kind: 'form',
    aiDriven: true,
    description: 'Formulate AI-assisted program specific outcomes.',
  },
  {
    key: 'process-10',
    title: 'Disseminate Vision, Mission & PEOs',
    section: 'process',
    processNumber: 10,
    kind: 'action',
    description: 'Track dissemination actions across approved communication channels.',
  },
  {
    key: 'process-11',
    title: 'Generate Curriculum Structure',
    section: 'process',
    processNumber: 11,
    kind: 'form',
    description: 'Create the curriculum structure for the selected program.',
  },
  {
    key: 'process-12',
    title: 'Identify OBE aligned Courses',
    section: 'process',
    processNumber: 12,
    kind: 'form',
    description: 'Identify and register courses aligned with OBE principles.',
  },
  {
    key: 'process-13',
    title: 'Generate Course Outcomes (Base RBT)',
    section: 'process',
    processNumber: 13,
    kind: 'form',
    description: 'Generate course outcomes mapped to revised Bloom taxonomy levels.',
  },
  {
    key: 'process-14',
    title: 'Develop Curriculum',
    section: 'process',
    processNumber: 14,
    kind: 'table',
    description: 'Fill curriculum in a structured table/Excel-style prescribed format.',
  },
  {
    key: 'process-15',
    title: 'Float Feedback on Curriculum',
    section: 'process',
    processNumber: 15,
    kind: 'form',
    description: 'Create and float curriculum feedback form on the right-side panel.',
  },
  {
    key: 'process-16',
    title: 'Intimate BoS & ACM',
    section: 'process',
    processNumber: 16,
    kind: 'action',
    description: 'Record communication sent to BoS and ACM.',
  },
  {
    key: 'process-17',
    title: 'Finalise Curriculum',
    section: 'process',
    processNumber: 17,
    kind: 'action',
    description: 'Finalize curriculum after approvals and communication closure.',
  },
];

export const SIDE_MENU_STEPS = PROCESS_STEPS.filter((step) => step.section === 'side_menu');
export const PROCESS_MENU_STEPS = PROCESS_STEPS.filter((step) => step.section === 'process');

export function getProcessStep(stepKey: string) {
  return PROCESS_STEPS.find((step) => step.key === stepKey) || null;
}
