import { cookies } from 'next/headers';
import {
  ProgramSessionPayload,
  PROGRAM_SESSION_COOKIE_NAME,
  PROGRAM_SESSION_TTL_DAYS,
  signProgramSessionToken,
  verifyProgramSessionToken,
} from '@/lib/auth/program-jwt';

/**
 * Create a JWT containing the program session payload.
 */
export async function encrypt(payload: ProgramSessionPayload) {
    return signProgramSessionToken(payload);
}

/**
 * Decode and verify the JWT.
 */
export async function decrypt(input: string): Promise<ProgramSessionPayload> {
    const payload = await verifyProgramSessionToken(input);
    if (!payload) {
        throw new Error('Invalid program session token');
    }
    return payload;
}

/**
 * Set the session cookie.
 */
export async function createSession(payload: ProgramSessionPayload) {
    const expires = new Date(Date.now() + PROGRAM_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const session = await encrypt(payload);

    const cookieStore = await cookies();
    cookieStore.set(PROGRAM_SESSION_COOKIE_NAME, session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expires,
        sameSite: 'strict',
        path: '/',
    });
}

/**
 * Read the current session from the cookies.
 */
export async function getSession(): Promise<ProgramSessionPayload | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get(PROGRAM_SESSION_COOKIE_NAME)?.value;
    if (!session) return null;
    try {
        return await decrypt(session);
    } catch (error) {
        return null;
    }
}

/**
 * Delete the session cookie.
 */
export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(PROGRAM_SESSION_COOKIE_NAME);
}
