import * as jose from 'jose';

const alg = 'HS256';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
    } else {
      console.warn('WARNING: Using fallback JWT secret in development.');
      return new TextEncoder().encode('dev-fallback-jwt-secret-stable-k3y');
    }
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET environment variable is missing.');
    } else {
      console.warn('WARNING: Using fallback REFRESH_TOKEN_SECRET in development.');
      return new TextEncoder().encode('dev-fallback-refresh-secret-stable-k3y');
    }
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: any) {
  return await signTokenWithExpiry(payload, '15m');
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
