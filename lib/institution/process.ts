export type StepKind = 'form' | 'matrix' | 'table' | 'action' | 'info' | 'program_select';

export type StepSection = 'side_menu' | 'process';

export type ProcessPhase = 'Set-up' | 'Stakeholder & PEOs' | 'Program Outcomes' | 'Curriculum Development' | 'Approval & Closure';

export interface ProcessStep {
  key: string;
  title: string;
  section: StepSection;
  processNumber?: number;
  kind: StepKind;
  aiDriven?: boolean;
  description: string;
  icon?: string;
  phase?: ProcessPhase;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    key: 'council',
    title: 'Constitute Academic Council',
    section: 'side_menu',
    kind: 'form',
    description: 'Create Academic Council member entries and maintain tenure, category, and communication details.',
    icon: 'Users'
  },
  {
    key: 'process-1',
    title: 'Tutor (OBE Protocols)',
    section: 'process',
    processNumber: 1,
    kind: 'info',
    phase: 'Set-up',
    description: 'Maintain formal OBE definitions, tutoring protocol references, and implementation guidelines.',
    icon: 'BookOpen'
  },
  {
    key: 'process-2',
    title: 'Select Program',
    section: 'process',
    processNumber: 2,
    kind: 'program_select',
    phase: 'Set-up',
    description: 'Select program from institutional entries. Dropdown values must float from institution programs.',
    icon: 'CheckSquare'
  },
  {
    key: 'process-3',
    title: 'Constitute PAC',
    section: 'process',
    processNumber: 3,
    kind: 'form',
    phase: 'Set-up',
    description: 'Capture PAC constitution details and participating members.',
    icon: 'Shield'
  },
  {
    key: 'process-4',
    title: 'Constitute BoS',
    section: 'process',
    processNumber: 4,
    kind: 'form',
    phase: 'Set-up',
    description: 'Document BoS composition and review authority.',
    icon: 'Gavel'
  },
  {
    key: 'process-5',
    title: 'Add Stakeholders',
    section: 'process',
    processNumber: 5,
    kind: 'form',
    phase: 'Stakeholder & PEOs',
    description: 'Add representative stakeholders for consultation and validation.',
    icon: 'UserPlus'
  },
  {
    key: 'process-6',
    title: 'Formulate Vision/Mission',
    section: 'process',
    processNumber: 6,
    kind: 'form',
    aiDriven: true,
    phase: 'Stakeholder & PEOs',
    description: 'Formulate vision, mission, and PEOs with AI-assisted drafting.',
    icon: 'Target'
  },
  {
    key: 'process-7',
    title: 'Consistency Matrix',
    section: 'process',
    processNumber: 7,
    kind: 'matrix',
    phase: 'Stakeholder & PEOs',
    description: 'Generate consistency matrix between mission components and PEOs.',
    icon: 'Grid'
  },
  {
    key: 'process-8',
    title: 'Generate Program Outcomes',
    section: 'process',
    processNumber: 8,
    kind: 'form',
    phase: 'Program Outcomes',
    description: 'Draft and store measurable program outcomes.',
    icon: 'ListChecks'
  },
  {
    key: 'process-9',
    title: 'Formulate PSOs',
    section: 'process',
    processNumber: 9,
    kind: 'form',
    aiDriven: true,
    phase: 'Program Outcomes',
    description: 'Formulate AI-assisted program specific outcomes.',
    icon: 'Sparkles'
  },
  {
    key: 'process-10',
    title: 'Disseminate VMP',
    section: 'process',
    processNumber: 10,
    kind: 'action',
    phase: 'Program Outcomes',
    description: 'Track dissemination actions across approved communication channels.',
    icon: 'Share2'
  },
  {
    key: 'process-11',
    title: 'Curriculum Structure',
    section: 'process',
    processNumber: 11,
    kind: 'form',
    phase: 'Curriculum Development',
    description: 'Create the curriculum structure for the selected program.',
    icon: 'Layers'
  },
  {
    key: 'process-12',
    title: 'Identify OBE Courses',
    section: 'process',
    processNumber: 12,
    kind: 'form',
    phase: 'Curriculum Development',
    description: 'Identify and register courses aligned with OBE principles.',
    icon: 'Book'
  },
  {
    key: 'process-13',
    title: 'Course Outcomes (COs)',
    section: 'process',
    processNumber: 13,
    kind: 'form',
    phase: 'Curriculum Development',
    description: 'Generate course outcomes mapped to revised Bloom taxonomy levels.',
    icon: 'FileHeader'
  },
  {
    key: 'process-14',
    title: 'Develop Curriculum',
    section: 'process',
    processNumber: 14,
    kind: 'table',
    phase: 'Curriculum Development',
    description: 'Fill curriculum in a structured table/Excel-style prescribed format.',
    icon: 'Table'
  },
  {
    key: 'process-15',
    title: 'Curriculum Feedback',
    section: 'process',
    processNumber: 15,
    kind: 'form',
    phase: 'Approval & Closure',
    description: 'Create and float curriculum feedback form on the right-side panel.',
    icon: 'MessageSquare'
  },
  {
    key: 'process-16',
    title: 'Intimate BoS & ACM',
    section: 'process',
    processNumber: 16,
    kind: 'action',
    phase: 'Approval & Closure',
    description: 'Record communication sent to BoS and ACM.',
    icon: 'Send'
  },
  {
    key: 'process-17',
    title: 'Finalise Curriculum',
    section: 'process',
    processNumber: 17,
    kind: 'action',
    phase: 'Approval & Closure',
    description: 'Finalize curriculum after approvals and communication closure.',
    icon: 'FileCheck'
  },
];

export const SIDE_MENU_STEPS = PROCESS_STEPS.filter((step) => step.section === 'side_menu');
export const PROCESS_MENU_STEPS = PROCESS_STEPS.filter((step) => step.section === 'process');

export function getProcessStep(stepKey: string) {
  return PROCESS_STEPS.find((step) => step.key === stepKey) || null;
}
