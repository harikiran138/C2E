import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  PROGRAM_SESSION_COOKIE_NAME,
  ProgramSessionPayload,
  verifyProgramSessionToken,
} from '@/lib/auth/program-jwt';
import pool from '@/lib/postgres';

export type AccessContext =
  | {
      mode: 'institution';
      institutionId: string;
    }
  | {
      mode: 'program';
      institutionId: string;
      programId: string;
      programCode: string;
      role: 'program_admin';
      userType: 'program';
      payload: ProgramSessionPayload;
    };

function parseCookieHeader(cookieHeader: string | null) {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) return parsed;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.split('=');
    const key = rawKey?.trim();
    if (!key) continue;
    parsed[key] = decodeURIComponent(rawValue.join('=').trim());
  }
  return parsed;
}

export async function getAccessContext(request: Request): Promise<AccessContext | null> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));

  const institutionToken = cookies.institution_token;
  if (institutionToken) {
    const payload = await verifyToken(institutionToken);
    if (payload?.id) {
      return {
        mode: 'institution',
        institutionId: String(payload.id),
      };
    }
  }

  const programSessionToken = cookies[PROGRAM_SESSION_COOKIE_NAME];
  if (programSessionToken) {
    const programPayload = await verifyProgramSessionToken(programSessionToken);
    if (programPayload?.programId && programPayload?.institutionId) {
      return {
        mode: 'program',
        institutionId: programPayload.institutionId,
        programId: programPayload.programId,
        programCode: programPayload.programCode,
        role: 'program_admin',
        userType: 'program',
        payload: programPayload,
      };
    }
  }

  return null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenProgramResponse() {
  return NextResponse.json({ error: 'Forbidden: program scope mismatch' }, { status: 403 });
}

export function ensureProgramScope(context: AccessContext, programId: string) {
  if (context.mode === 'program' && context.programId !== programId) {
    return false;
  }
  return true;
}

export async function hasProgramAccess(context: AccessContext, programId: string) {
  if (context.mode === 'program') {
    return context.programId === programId;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT 1 FROM programs WHERE id = $1 AND institution_id = $2 LIMIT 1',
      [programId, context.institutionId]
    );
    return (result.rowCount || 0) > 0;
  } finally {
    client.release();
  }
}
