import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { checkRateLimit } from './lib/rate-limit';

const PUBLIC_INSTITUTION_PATHS = [
  '/institution/login',
  '/institution/register',
  '/api/institution/register',
  '/api/institution/login',
  '/api/institution/auth/refresh',
  '/api/institution/signup/validate',
];

const PUBLIC_STAKEHOLDER_PATHS = [
  '/stakeholder/login',
  '/api/stakeholder/login',
  '/stakeholder/first-password',
  '/api/stakeholder/first-password'
];

const STATIC_FILE_REGEX = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/i;

function isPublicPath(pathname: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function attachSecurityHeaders(response: NextResponse) {
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data:;
    font-src 'self' data: https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    connect-src 'self' https://*.supabase.co https://*.supabase.in https://ncofwpuabtxddvdjljgj.supabase.co;
  `;

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = String((request as any).ip || forwardedIp || '127.0.0.1');
  const isLocalDev =
    process.env.NODE_ENV !== 'production' &&
    (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost');

  const requestHeaders = new Headers(request.headers);

  if (
    STATIC_FILE_REGEX.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico'
  ) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    attachSecurityHeaders(response);
    return response;
  }

  const isApiRoute = pathname.startsWith('/api');
  const isAuthRoute = (pathname.includes('/login') || pathname.includes('/register')) && !pathname.includes('/options');

  if (isApiRoute && !isLocalDev) {
    const limitInfo = isAuthRoute ? { limit: 10, windowMs: 60 * 1000 } : { limit: 100, windowMs: 60 * 1000 };
    const rateLimitKey = isAuthRoute ? `${ip}:${pathname}` : ip;
    const allowed = checkRateLimit({ ip: rateLimitKey, ...limitInfo });
    if (!allowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      if (origin && host && !origin.includes(host)) {
        return NextResponse.json({ error: 'CSRF Forbidden: Origin mismatch' }, { status: 403 });
      }
    }
  }

  const isInstitutionArea = pathname.startsWith('/institution') || pathname.startsWith('/api/institution');
  const isStakeholderArea = pathname.startsWith('/stakeholder') || pathname.startsWith('/api/stakeholder');

  if (!isInstitutionArea && !isStakeholderArea) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    attachSecurityHeaders(response);
    return response;
  }

  if (isInstitutionArea && isPublicPath(pathname, PUBLIC_INSTITUTION_PATHS)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    attachSecurityHeaders(response);
    return response;
  }

  if (isStakeholderArea && isPublicPath(pathname, PUBLIC_STAKEHOLDER_PATHS)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    attachSecurityHeaders(response);
    return response;
  }

  if (isStakeholderArea) {
    const stakeholderToken = request.cookies.get('stakeholder_token')?.value;
    if (!stakeholderToken) {
      if (pathname.startsWith('/api/stakeholder')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const redirectUrl = new URL('/stakeholder/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const stakeholderPayload = await verifyToken(stakeholderToken);

    let isBlocklisted = false;
    try {
      const verifyRes = await fetch(new URL('/api/auth/verify', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: stakeholderToken })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.valid) isBlocklisted = true;
    } catch (e) {
      console.error('Stakeholder verify error:', e);
    }

    if (!stakeholderPayload || stakeholderPayload.role !== 'stakeholder' || isBlocklisted) {
      if (pathname.startsWith('/api/stakeholder')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/stakeholder/login', request.url));
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    attachSecurityHeaders(response);
    return response;
  }

  let customUser: { id: string; email: string; role?: string; onboarding_status?: string } | null = null;

  const institutionToken = request.cookies.get('institution_token')?.value;
  const refreshToken = request.cookies.get('institution_refresh')?.value;

  if (institutionToken) {
    const payload = await verifyToken(institutionToken);
    if (payload && payload.id) {
      if (payload.role && payload.role !== 'institution_admin') {
        if (pathname.startsWith('/api/institution')) {
          return NextResponse.json({ error: 'Forbidden role' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/institution/login', request.url));
      }

      customUser = {
        id: payload.id as string,
        email: payload.email as string,
        role: payload.role as string | undefined,
        onboarding_status: payload.onboarding_status as string | undefined,
      };

      // Check blocklist via API to avoid edge runtime issues with pg
      try {
        const verifyRes = await fetch(new URL('/api/auth/verify', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: institutionToken })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.valid) {
          customUser = null; // Token blocklisted
        }
      } catch (err) {
        console.error('Middleware token verify error:', err);
      }
    }
  }

  let refreshCookiesToSet: string[] = [];

  if (!customUser && refreshToken) {
    try {
      const refreshUrl = new URL('/api/institution/auth/refresh', request.url);
      const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          Cookie: `institution_refresh=${refreshToken}`,
        },
      });

      if (refreshRes.ok) {
        const setCookieHeaders = refreshRes.headers.getSetCookie();
        refreshCookiesToSet = setCookieHeaders;

        const newToken = setCookieHeaders
          .find((cookie) => cookie.startsWith('institution_token='))
          ?.split(';')[0]
          .split('=')[1];

        if (newToken) {
          // Pass the new token to downstream route handlers
          const currentCookie = requestHeaders.get('cookie') || '';
          const cookiePairs = currentCookie.split(';').filter((c) => !c.trim().startsWith('institution_token='));
          cookiePairs.push(`institution_token=${newToken}`);
          requestHeaders.set('cookie', cookiePairs.join('; '));

          const payload = await verifyToken(newToken);
          if (payload && payload.id) {
            customUser = {
              id: payload.id as string,
              email: payload.email as string,
              role: payload.role as string | undefined,
              onboarding_status: payload.onboarding_status as string | undefined,
            };
          }
        }
      }
    } catch (error) {
      console.error('Middleware refresh failed:', error);
    }
  }

  if (!customUser) {
    if (pathname.startsWith('/api/institution')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const loginUrl = new URL('/institution/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!pathname.startsWith('/api/institution')) {
    const effectiveStatus = customUser.onboarding_status || 'PENDING';
    const isDashboardArea =
      pathname.startsWith('/institution/dashboard') ||
      pathname.startsWith('/institution/process') ||
      pathname.startsWith('/institution/details') ||
      pathname.startsWith('/institution/programs') ||
      pathname.startsWith('/institution/peos') ||
      pathname.startsWith('/institution/feedback');

    if (isDashboardArea && effectiveStatus !== 'COMPLETED') {
      return NextResponse.redirect(new URL('/institution/onboarding', request.url));
    }

    if (pathname.startsWith('/institution/onboarding') && effectiveStatus === 'COMPLETED') {
      return NextResponse.redirect(new URL('/institution/dashboard', request.url));
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  attachSecurityHeaders(response);
  refreshCookiesToSet.forEach((cookie) => response.headers.append('Set-Cookie', cookie));

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
