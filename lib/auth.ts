import * as jose from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-fallback-key-change-me';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable is not set. Using a fallback secret. This is insecure for production.');
}

const secret = new TextEncoder().encode(SECRET_KEY);
const alg = 'HS256';

const REFRESH_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret-change-me-prod';
const refreshSecret = new TextEncoder().encode(REFRESH_SECRET_KEY);

export async function signToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('15m') // Hardened: 15 minutes
    .sign(secret);
}

export async function signRefreshToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d') // Hardened: 7 days
    .sign(refreshSecret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, refreshSecret);
    return payload;
  } catch (error) {
    return null;
  }
}
