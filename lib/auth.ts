import * as jose from "jose";

const alg = "HS256";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.",
      );
    } else {
      console.warn("WARNING: Using fallback JWT secret in development.");
      return new TextEncoder().encode("dev-fallback-jwt-secret-stable-k3y");
    }
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret() {
  const secret =
    process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET environment variable is missing.",
      );
    } else {
      console.warn(
        "WARNING: Using fallback REFRESH_TOKEN_SECRET in development.",
      );
      return new TextEncoder().encode("dev-fallback-refresh-secret-stable-k3y");
    }
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: any) {
  return await signTokenWithExpiry(payload, "15m");
}

export async function signTokenWithExpiry(payload: any, expiresIn: string) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function signRefreshToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("7d") // Hardened: 7 days
    .sign(getRefreshSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret());
    return payload;
  } catch (error) {
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
      const result = await client.query(
        "SELECT 1 FROM jwt_blocklist WHERE token = $1 LIMIT 1",
        [token],
      );
      if (result.rows.length > 0) {
        return null; // Token is blocklisted
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Blocklist check failed:", err);
    // Fail open if DB is down? or fail closed?
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

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, getRefreshSecret());
    return payload;
  } catch (error) {
    return null;
  }
}
