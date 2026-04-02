import * as jose from "jose";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "./constants";
import { normalizeRole } from "./auth-routing";

const alg = "HS256";

export type AuthTokenPayload = jose.JWTPayload & {
  id?: string;
  email?: string;
  role?: string;
  institution_id?: string;
  program_id?: string;
  stakeholder_ref_id?: string;
};

function requireSecret(
  primaryEnv: string,
  fallbackEnv?: string,
) {
  const secret = process.env[primaryEnv] || (fallbackEnv ? process.env[fallbackEnv] : undefined);
  if (!secret) {
    throw new Error(
      `CRITICAL SECURITY ERROR: ${primaryEnv}${fallbackEnv ? ` or ${fallbackEnv}` : ""} environment variable is missing.`,
    );
  }
  return new TextEncoder().encode(secret);
}

function getSecret() {
  return requireSecret("JWT_SECRET");
}

function getRefreshSecret() {
  return requireSecret("JWT_REFRESH_SECRET", "REFRESH_TOKEN_SECRET");
}

export function createSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function signToken(payload: AuthTokenPayload) {
  return await signTokenWithExpiry(payload, "15m");
}

export async function signTokenWithExpiry(
  payload: AuthTokenPayload,
  expiresIn: string,
) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function signRefreshToken(payload: AuthTokenPayload) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("7d") // Hardened: 7 days
    .sign(getRefreshSecret());
}

export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret());
    if (payload.role) {
      payload.role = normalizeRole(payload.role as string) ?? String(payload.role);
    }
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

// NOTE: This must only be called from Node.js environments
// (e.g. Server Actions or route.ts), NEVER from middleware.ts
export async function verifyTokenAndBlocklist(token: string) {
  const tokenPayload = await verifyToken(token);
  if (!tokenPayload) return null;

  try {
    // Lazy load pool to prevent Edge Runtime from crashing during import
    const pool = (await import("./postgres")).default;
    const client = await pool.connect();
    try {
      // 1. Check Blocklist (Point #4)
      const blockResult = await client.query(
        "SELECT 1 FROM jwt_blocklist WHERE token = $1 LIMIT 1",
        [token],
      );
      if (blockResult.rows.length > 0) {
        return null; // Token is explicitly revoked
      }

      // 2. Check User Existence (Point #1)
      // Standardizing verification: If user is deleted from DB, session is invalid.
      if (tokenPayload.id || (tokenPayload.role === "STAKEHOLDER" && tokenPayload.stakeholder_ref_id)) {
        if (tokenPayload.role === "STAKEHOLDER") {
            const stakeholderId = tokenPayload.stakeholder_ref_id || tokenPayload.id;
            const stakeResult = await client.query(
                "SELECT id FROM representative_stakeholders WHERE id = $1 AND is_approved = true LIMIT 1",
                [stakeholderId]
            );
            if (stakeResult.rows.length === 0) {
                console.warn(`Security Warning: Stakeholder ID ${stakeholderId} missing or revoked.`);
                return null;
            }
        } else {
            const userResult = await client.query(
                "SELECT id FROM public.users WHERE id = $1 LIMIT 1",
                [tokenPayload.id]
            );
            if (userResult.rows.length === 0) {
                console.warn(`Security Warning: User ID ${tokenPayload.id} no longer exists.`);
                return null;
            }
        }
      }

    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Auth security verification failed:", err);
    // Optional: could fail closed check for maximum security
  }

  return tokenPayload;
}

export async function blockToken(token: string, expiresAt: Date) {
  try {
    const pool = (await import("./postgres")).default;
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO jwt_blocklist (token, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [token, expiresAt],
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to block token:", error);
  }
}

export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getRefreshSecret());
    if (payload.role) {
      payload.role = normalizeRole(payload.role as string) ?? String(payload.role);
    }
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

/**
 * v5.1 Unified Token Verification Utility
 * Use this in API routes to get the current user session
 */
export async function getSession(request: {
  cookies: {
    get: (name: string) => { value?: string } | undefined;
  };
}) {
  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get(LEGACY_AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyTokenAndBlocklist(token);
}

export function getRequestAuthCookieNames() {
  return [AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME];
}
