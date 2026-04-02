/**
 * Program Login Utility Library
 * v5.2 Program authentication and routing helpers.
 */
import { PROGRAM_DASHBOARD_PATH } from "./constants";
import { type AuthTokenPayload } from "./auth";
import { getRoleDashboardPath, normalizeRole } from "./auth-routing";

export interface ProgramIdentityRecord {
  id: string;
  email: string | null;
  program_name: string;
  program_code: string;
  institution_id: string;
  institution_shortform?: string | null;
  institution_name?: string | null;
  password_hash?: string | null;
  is_password_set?: boolean | null;
}

export interface ProgramSessionPayload extends AuthTokenPayload {
  id: string;
  email: string;
  role: "PROGRAM_ADMIN";
  institution_id: string;
  program_id: string;
  program_code: string;
  is_password_set: boolean;
  redirect: string;
}

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

export function normalizeProgramIdentifier(identifier: string | null | undefined): string {
  if (!identifier) return "";
  return identifier.trim().toLowerCase();
}

export function getProgramLookupCode(identifier: string): string {
  return normalizeProgramIdentifier(identifier).split("@")[0] || "";
}

export function matchesProgramLoginIdentifier(
  program: ProgramIdentityRecord,
  identifier: string,
): boolean {
  const normalizedIdentifier = normalizeProgramIdentifier(identifier);
  
  // 1. Check against explicitly persisted email if available
  const persistedEmail = normalizeProgramIdentifier(program.email || "");
  if (persistedEmail && persistedEmail === normalizedIdentifier) {
    return true;
  }

  // 2. Check against the program code directly (flexible login)
  const normalizedCode = normalizeProgramIdentifier(program.program_code);
  if (normalizedCode && (normalizedCode === normalizedIdentifier || normalizedCode === normalizedIdentifier.split('@')[0])) {
    return true;
  }

  // 3. Check against canonical generated email: {code}@{shortform}.c2x.ai
  const generatedEmail = buildProgramLoginEmail(
    program.program_code,
    program.institution_shortform || undefined,
    program.institution_name || undefined,
  );

  return normalizeProgramIdentifier(generatedEmail) === normalizedIdentifier;
}

export function buildProgramSessionPayload(
  program: ProgramIdentityRecord,
): ProgramSessionPayload {
  const email =
    normalizeProgramIdentifier(program.email || "") ||
    buildProgramLoginEmail(
      program.program_code,
      program.institution_shortform || undefined,
      program.institution_name || undefined,
    );

  return {
    id: program.id,
    email,
    role: "PROGRAM_ADMIN",
    institution_id: program.institution_id,
    program_id: program.id,
    program_code: program.program_code,
    is_password_set: Boolean(program.is_password_set),
    redirect: PROGRAM_DASHBOARD_PATH,
    v: "5.3",
  };
}

export function validateProgramSessionPayload(
  payload: AuthTokenPayload | null | undefined,
): ProgramSessionPayload | null {
  if (!payload?.id || !payload.program_id || !payload.institution_id) {
    return null;
  }

  if (normalizeRole(payload.role) !== "PROGRAM_ADMIN") {
    return null;
  }

  return {
    id: String(payload.id),
    email: String(payload.email || ""),
    role: "PROGRAM_ADMIN",
    institution_id: String(payload.institution_id),
    program_id: String(payload.program_id),
    program_code: String(payload.program_code || ""),
    is_password_set: Boolean(payload.is_password_set),
    redirect: getRoleDashboardPath(payload.role, payload.program_id as string),
    exp: payload.exp,
    iat: payload.iat,
    iss: payload.iss,
    sub: payload.sub,
    aud: payload.aud,
    nbf: payload.nbf,
    jti: payload.jti,
  };
}
