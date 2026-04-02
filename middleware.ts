import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from './lib/auth';
import { checkRateLimit } from './lib/rate-limit';
import { getRoleDashboardPath } from './lib/auth-routing';

const PUBLIC_PATHS = [
  '/',                  // Landing Page
  '/login',             // Hidden Super Admin Page
  '/institution/login', // Public Branded Login
  '/api/auth/super/login',
  '/api/auth/institute/login',
  '/api/auth/logout',
  '/api/auth/verify',
  '/api/program/login',
  '/api/institution/login',
  '/api/stakeholder/login',
  '/api/stakeholder/first-password',
  '/favicon.ico'
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Skip static files
  if (pathname.includes('.') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // 2. Rate Limiting for Auth
  if (request.method === 'POST' && pathname.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    if (!checkRateLimit({ ip, limit: 20, windowMs: 60000 })) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  // 3. Identification (Unified v5.1)
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value || 
                request.cookies.get('institution_token')?.value;
  
  // 4. Handle Public Paths & Already Logged In
  if (!token) {
    if (isPublicPath(pathname)) return NextResponse.next();
    
    // v5.1 RULE: Never reveal /login for Super Admin.
    const loginUrl = new URL('/institution/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Verification
  const payload = await verifyToken(token);
  if (!payload || !payload.id) {
    if (isPublicPath(pathname)) return NextResponse.next();
    
    // EXPLICIT CLEARING: If token is present but invalid, clear it and redirect to login
    const loginUrl = new URL('/institution/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    
    res.cookies.set(AUTH_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    res.cookies.set('institution_token', '', { maxAge: 0, path: '/' });
    return res;
  }

  const userRole = payload.role as string;
  const normalizedRole = userRole.toUpperCase();
  const institutionId = payload.institution_id as string;
  const programId = payload.program_id as string;
  const dashboardPath = getRoleDashboardPath(normalizedRole, programId);

  // 6. Support for Logged In users hitting public login pages
  if (isPublicPath(pathname)) {
    // If hitting login pages while already authorized, move to dashboard
    if (pathname === '/institution/login') {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    return NextResponse.next();
  }

  // 7. Role-Based Path Isolation (The v5.1 "Zero-Trust" Wall)
  
  // Super Admin Zone
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/dashboard')) {
      if (normalizedRole !== 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
  }

  // Institution Zone
  if (pathname.startsWith('/institution') && !pathname.startsWith('/institution/login')) {
      if (normalizedRole !== 'INSTITUTE_ADMIN' && normalizedRole !== 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
  }

  // Program Zone
  if (pathname.startsWith('/program')) {
      if (normalizedRole !== 'PROGRAM_ADMIN' && normalizedRole !== 'SUPER_ADMIN' && normalizedRole !== 'INSTITUTE_ADMIN') {
          return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
  }

  // 8. Context Injection & Security Headers
  const requestHeaders = new Headers(request.headers);
  if (institutionId) requestHeaders.set('x-institution-id', institutionId);
  if (programId) requestHeaders.set('x-program-id', programId);
  requestHeaders.set('x-user-role', normalizedRole);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
