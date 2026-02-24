import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'default_secret_key_please_change_in_production';
const key = new TextEncoder().encode(SECRET_KEY);

export type ProgramSessionPayload = {
    program_id: string;      // The UUID of the program from DB
    institution_id: string;  // The UUID of the institution
    program_code: string;    // The text code like 'CS101'
    program_name: string;    // E.g. 'Computer Science'
};

const SESSION_EXPIRATION = '7d'; // 7 days
const SESSION_COOKIE_NAME = 'c2e_program_session';

/**
 * Create a JWT containing the program session payload.
 */
export async function encrypt(payload: ProgramSessionPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(SESSION_EXPIRATION)
        .sign(key);
}

/**
 * Decode and verify the JWT.
 */
export async function decrypt(input: string): Promise<ProgramSessionPayload> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ['HS256'],
    });
    return payload as ProgramSessionPayload;
}

/**
 * Set the session cookie.
 */
export async function createSession(payload: ProgramSessionPayload) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = await encrypt(payload);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expires,
        sameSite: 'lax',
        path: '/',
    });
}

/**
 * Read the current session from the cookies.
 */
export async function getSession(): Promise<ProgramSessionPayload | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
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
    cookieStore.delete(SESSION_COOKIE_NAME);
}
