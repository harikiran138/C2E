import { SignJWT, jwtVerify } from 'jose';

const PROGRAM_SESSION_SECRET =
  process.env.PROGRAM_SESSION_SECRET ||
  process.env.JWT_SECRET_KEY ||
  process.env.JWT_SECRET ||
  'default_program_session_secret_change_in_production';

const key = new TextEncoder().encode(PROGRAM_SESSION_SECRET);

export const PROGRAM_SESSION_COOKIE_NAME = 'c2e_program_session';
export const PROGRAM_SESSION_TTL_DAYS = 7;
export const PROGRAM_SESSION_EXPIRATION = `${PROGRAM_SESSION_TTL_DAYS}d`;

export type ProgramSessionPayload = {
  userType: 'program';
  role: 'program_admin';
  programId: string;
  programCode: string;
  programName: string;
  institutionId: string;
  // Backward-compatible legacy keys used in existing code.
  program_id: string;
  program_code: string;
  program_name: string;
  institution_id: string;
};

export async function signProgramSessionToken(payload: ProgramSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(PROGRAM_SESSION_EXPIRATION)
    .sign(key);
}

export async function verifyProgramSessionToken(token: string): Promise<ProgramSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as ProgramSessionPayload;
  } catch {
    return null;
  }
}
