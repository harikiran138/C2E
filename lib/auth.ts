import * as jose from 'jose';

const alg = 'HS256';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret() {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('CRITICAL SECURITY ERROR: REFRESH_TOKEN_SECRET environment variable is missing.');
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('15m') // Hardened: 15 minutes
    .sign(getSecret());
}

export async function signRefreshToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d') // Hardened: 7 days
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

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, getRefreshSecret());
    return payload;
  } catch (error) {
    return null;
  }
}
