import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from './lib/auth';
import { checkRateLimit } from './lib/rate-limit';
import {
  PROGRAM_SESSION_COOKIE_NAME,
  verifyProgramSessionToken,
} from './lib/auth/program-jwt';

// Define public paths that do not require authentication
const PUBLIC_PATHS = [
  '/institution/login',
  '/institution/register',
  '/api/institution/register',
  '/api/institution/login',
  '/api/institution/auth/refresh',
  '/program-login',
  '/api/auth/program-login',
  '/api/auth/program-logout',
];

const PROGRAM_API_PREFIXES = [
  '/api/institution/details',
  '/api/institution/pac',
  '/api/institution/bos',
  '/api/institution/stakeholders',
  '/api/institution/peos',
  '/api/institution/psos',
  '/api/institution/program-outcomes',
  '/api/institution/program/update-vm',
  '/api/institution/program/consistency-matrix',
  '/api/institution/program/lead-society',
  '/api/institution/program/peo-dates',
  '/api/institution/obe-framework',
  '/api/curriculum/structure',
  '/api/ai/',
  '/api/generate/',
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const isApiRoute = pathname.startsWith('/api');
  const isLegacyProgramPage = pathname.startsWith('/dashboard/');
  const isProgramPage = pathname.startsWith('/program/') || isLegacyProgramPage;
  const isProgramApiRoute = PROGRAM_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // [SECURITY] Rate Limiting (Basic)
  // Limit sensitive routes more strictly
  const isAuthRoute = pathname.includes('/login') || pathname.includes('/register');
  const limitInfo = isAuthRoute
    ? { limit: 10, windowMs: 60 * 1000 } // 10 reqs/min for auth
    : { limit: 100, windowMs: 60 * 1000 }; // 100 reqs/min general

  if (isApiRoute) {
    const allowed = checkRateLimit({ ip: String(ip), ...limitInfo });
    if (!allowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  // [SECURITY] Strict Origin Check (CSRF for API mutations)
  // Ensure POST/PUT/DELETE requests come from our own origin
  if (isApiRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host'); // e.g. localhost:3000
    // In production, host might not include protocol, origin does (https://...)
    // Simple check: Origin must contain Host
    if (origin && host && !origin.includes(host)) {
      // Allow if allowed origin (e.g. from env)
      // For now, strict block
      return NextResponse.json({ error: 'CSRF Forbidden: Origin mismatch' }, { status: 403 });
    }
  }

  // [SECURITY] Add Security Headers (Helmet-equivalent for Edge)
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



  // Skip auth check for public paths and static assets
  if (
    pathname === '/' ||
    PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public')
  ) {
    return response;
  }

  // [AUTH] Custom Session Check & Token Refresh
  let customUser: { id: string; email: string; role?: string; onboarding_status?: string } | null = null;

  const institutionToken = request.cookies.get('institution_token')?.value;
  const refreshToken = request.cookies.get('institution_refresh')?.value;

  if (institutionToken) {
    try {
      const payload = await verifyToken(institutionToken);
      if (payload) {
        customUser = {
          id: payload.id as string,
          email: payload.email as string,
          role: payload.role as string | undefined,
          onboarding_status: payload.onboarding_status as string | undefined,
        };
        // console.log('Middleware: Access Token Valid:', customUser.email);
      }
    } catch (e) {
      // console.log('Middleware: Access Token Invalid/Expired');
    }
  }

  // Auto-Refresh Logic
  if (!customUser && refreshToken) {
    try {
      // We call the refresh endpoint internally to get new tokens
      const refreshUrl = new URL('/api/institution/auth/refresh', request.url);
      const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Cookie': `institution_refresh=${refreshToken}`
        }
      });

      if (refreshRes.ok) {
        // Refresh successful! Get the new tokens from cookies
        const setCookieHeaders = refreshRes.headers.getSetCookie();

        // Apply these cookies to the current response
        setCookieHeaders.forEach(cookie => {
          response.headers.append('Set-Cookie', cookie);
        });

        // Re-verify the new access token to get user context for this request
        // We need to parse the set-cookie to find the access token
        const newToken = setCookieHeaders
          .find(c => c.startsWith('institution_token='))
          ?.split(';')[0]
          .split('=')[1];

        if (newToken) {
          const payload = await verifyToken(newToken);
          if (payload) {
            customUser = {
              id: payload.id as string,
              email: payload.email as string,
              role: payload.role as string | undefined,
              onboarding_status: payload.onboarding_status as string | undefined,
            };
          }
        }
      }
    } catch (e) {
      console.error('Middleware: Refresh failed:', e);
    }
  }

  const programSessionToken = request.cookies.get(PROGRAM_SESSION_COOKIE_NAME)?.value;
  const programSession = programSessionToken
    ? await verifyProgramSessionToken(programSessionToken)
    : null;

  if (programSessionToken && !programSession) {
    response.cookies.set(PROGRAM_SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  }

  if (isLegacyProgramPage && programSession) {
    const segments = pathname.split('/').filter(Boolean);
    const legacySection = segments[2];
    const targetProgramId =
      segments[1] && segments[1] === programSession.programId
        ? segments[1]
        : programSession.programId;
    const normalizedTarget = legacySection
      ? `/program/${targetProgramId}/${legacySection}`
      : `/program/${targetProgramId}/dashboard`;
    if (pathname !== normalizedTarget) {
      return NextResponse.redirect(new URL(normalizedTarget, request.url));
    }
  }

  if (isProgramPage) {
    if (!programSession) {
      const loginUrl = new URL('/program-login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith('/program/')) {
      const segments = pathname.split('/').filter(Boolean);
      const requestedProgramId = segments[1];
      if (requestedProgramId && requestedProgramId !== programSession.programId) {
        return NextResponse.redirect(new URL(`/program/${programSession.programId}/dashboard`, request.url));
      }
    }

    return response;
  }

  if (!customUser) {
    // [BLOCK] Unauthenticated Access
    if (isApiRoute) {
      if (programSession && isProgramApiRoute) {
        return response;
      }
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    } else {
      // Redirect to login for pages
      const loginUrl = new URL('/institution/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // [Authorisation] Post-Auth Checks (Dashboard Access etc.)
  // Only for Pages, API usually handles granular permissions
  if (!isApiRoute) {
    // ... Maintain existing dashboard logic if needed ...
    // Re-implementing the robust status check using Supabase if desired, or relying on token claims.
    // For performance, we rely on token claims.

    const effectiveStatus = customUser?.onboarding_status || 'PENDING';
    const isDashboardArea =
      pathname.startsWith('/institution/dashboard') ||
      pathname.startsWith('/institution/process') ||
      pathname.startsWith('/institution/details') ||
      pathname.startsWith('/institution/programs') ||
      pathname.startsWith('/institution/peos') ||
      pathname.startsWith('/institution/feedback');

    if (isDashboardArea && effectiveStatus !== 'COMPLETED') {
      return NextResponse.redirect(new URL('/institution/onboarding', request.url))
    }

    if (pathname.startsWith('/institution/onboarding') && effectiveStatus === 'COMPLETED') {
      return NextResponse.redirect(new URL('/institution/dashboard', request.url))
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
