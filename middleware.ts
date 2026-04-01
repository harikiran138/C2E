import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { checkRateLimit } from './lib/rate-limit';

const PUBLIC_PATHS = [
  '/',                  // Landing Page
  '/login',             // Hidden Super Admin Page
  '/institution/login', // Public Branded Login
  '/api/auth/super/login',
  '/api/auth/institute/login',
  '/api/auth/verify',
  '/api/stakeholder/login',
  '/api/stakeholder/first-password',
  '/favicon.ico'
];

const ROLE_DASHBOARDS: Record<string, string> = {
  'SUPER_ADMIN': '/dashboard',
  'INSTITUTE_ADMIN': '/institution/dashboard',
  'PROGRAM_ADMIN': '/program/dashboard'
};

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
  // We only rate limit API requests, to prevent blocking Next.js page chunks during render.
  if (request.method === 'POST' && pathname.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    if (!checkRateLimit({ ip, limit: 10, windowMs: 60000 })) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  // 3. Identification
  const token = request.cookies.get('c2e_auth_token')?.value;
  
  // 4. Handle Public Paths & Already Logged In
  if (!token) {
    if (isPublicPath(pathname)) return NextResponse.next();
    
    // v5.1 RULE: Never reveal /login for Super Admin.
    // Default unauthorized redirect is ALWAYS /institute/login
    const loginUrl = new URL('/institution/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Verification
  const payload = await verifyToken(token);
  if (!payload || !payload.id) {
    if (isPublicPath(pathname)) return NextResponse.next();
    const res = NextResponse.redirect(new URL('/institution/login', request.url));
    res.cookies.delete('c2e_auth_token');
    return res;
  }

  const userRole = payload.role as string;
  const institutionId = payload.institution_id as string;
  const programId = payload.program_id as string;

  // 6. Support for Logged In users hitting public login pages
  if (isPublicPath(pathname) && token) {
    // If hitting /login or /institute/login, redirect to their dashboard
    if (pathname === '/login' || pathname === '/institution/login') {
        return NextResponse.redirect(new URL(ROLE_DASHBOARDS[userRole] || '/institution/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 7. Hidden Route Protection
  // Only Super Admin can hit /super-admin/*
  if (pathname.startsWith('/super-admin') && userRole !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/institution/login', request.url));
  }

  // Only Super Admin can hit /login (once logged in, they move to their dashboard)
  if (pathname === '/login' && userRole !== 'SUPER_ADMIN' && token) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[userRole] || '/institution/dashboard', request.url));
  }

  // 8. Role-Based Path Isolation (The "Zero-Trust" Wall)
  if (pathname.startsWith('/institution') && userRole !== 'INSTITUTE_ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[userRole], request.url));
  }

  if (pathname.startsWith('/program') && userRole !== 'PROGRAM_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'INSTITUTE_ADMIN') {
    return NextResponse.redirect(new URL(ROLE_DASHBOARDS[userRole], request.url));
  }

  // 9. Context Injection for Backend (Injecing x-headers)
  const requestHeaders = new Headers(request.headers);
  if (institutionId) requestHeaders.set('x-institution-id', institutionId);
  if (programId) requestHeaders.set('x-program-id', programId);
  requestHeaders.set('x-user-role', userRole);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach Security Headers (Previously from attachSecurityHeaders)
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
