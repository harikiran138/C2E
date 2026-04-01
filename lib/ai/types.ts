/**
 * lib/ai/types.ts
 * Shared interface for academic context used by AI agents to ensure 
 * institution-specific and program-specific alignment.
 */

export interface AcademicContext {
  programName: string;
  institutionName?: string;
  vision?: string;
  mission?: string;
  peos?: string[]; // Program Educational Objectives (for PO/PSO alignment)
}
