export interface RateLimitContext {
  ip: string;
  limit: number;
  windowMs: number;
}

const ipHits = new Map<string, { count: number; expiresAt: number }>();

/**
 * Basic In-Memory Rate Limiter
 * Returns true if allowed, false if blocked.
 */
export function checkRateLimit(context: RateLimitContext): boolean {
  const { ip, limit, windowMs } = context;
  const now = Date.now();

  const record = ipHits.get(ip);

  if (!record || now > record.expiresAt) {
    // New window or expired
    ipHits.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  // Increment
  record.count += 1;
  return true;
}

// Cleanup interval (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipHits.entries()) {
    if (now > value.expiresAt) {
      ipHits.delete(key);
    }
  }
}, 300000);
