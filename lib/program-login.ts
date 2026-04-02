/**
 * Program Login Utility Library
 * v5.1 Unified credential generation logic
 */

/**
 * Builds the canonical login email for a program based on its code and the institution's shortform.
 * Formula: {program_code}@{institution_shortform}.c2x.ai
 * 
 * @param programCode The unique code of the program (e.g., 'MECH')
 * @param shortform The institution's shortform (e.g., 'NSRIT')
 * @param institutionName Fallback institution name if shortform is missing
 * @returns The generated login email string
 */
export function buildProgramLoginEmail(
  programCode: string,
  shortform?: string,
  institutionName?: string
): string {
  if (!programCode) return "";

  // Normalize inputs: remove whitespace and convert to lowercase
  const cleanCode = programCode.trim().toLowerCase();
  
  // Use shortform if available, otherwise use institutionName, otherwise default to 'institute'
  const rawDomainPart = shortform || institutionName || "institute";
  const cleanDomain = rawDomainPart.trim().toLowerCase().replace(/\s+/g, "");

  return `${cleanCode}@${cleanDomain}.c2x.ai`;
}
