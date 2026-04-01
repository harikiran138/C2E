/**
 * lib/ai/types.ts
 * Shared interface for academic context used by AI agents to ensure 
 * institution-specific and program-specific alignment.
 */

export interface AcademicContext {
  institution_id:   string; // v5.1 Multi-tenant ID
  program_id:       string; // v5.1 Program ID
  programName:      string;
  institutionName?: string;
  vision?:          string;
  mission?:         string;
  peos?:            string[]; 
}
