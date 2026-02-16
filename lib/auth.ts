import * as jose from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-fallback-key-change-me';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable is not set. Using a fallback secret. This is insecure for production.');
}

const secret = new TextEncoder().encode(SECRET_KEY);
const alg = 'HS256';

export async function signToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}
