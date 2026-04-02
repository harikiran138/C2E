import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from './lib/auth';
import { checkRateLimit } from './lib/rate-limit';
import { getRoleDashboardPath } from './lib/auth-routing';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/institution/login',
  '/api/auth/super/login',
  '/api/auth/institute/login',
  '/api/auth/logout',
  '/api/auth/verify',
  '/api/program/login',
  '/api/institution/login',
  '/api/stakeholder/login',
  '/api/stakeholder/first-password',
  '/favicon.ico'
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return Array.from(PUBLIC_PATHS).some((path) => pathname.startsWith(`${path}/`));
}

/**
 * v16 Proxy Boundary (formerly Middleware)
 * Optimized for Zero-Trust performance
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Critical Early Exit: Static assets & Public Paths
  if (pathname.includes('.') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const isPublic = isPublicPath(pathname);

  // 2. High-Priority Rate Limiting for Auth Endpoints
  if (request.method === 'POST' && pathname.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    if (!checkRateLimit({ ip, limit: 20, windowMs: 60000 })) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  // 3. Identification (Cookie retrieval is slightly expensive)
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value || 
                 request.cookies.get('institution_token')?.value;
  
  // 4. Access Control Logic
  if (!token) {
    if (isPublic) return NextResponse.next();
    
    // v5.1 RULE: Redirect to secure login
    const loginUrl = new URL('/institution/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Verification (JWT decoding)
  const payload = await verifyToken(token);
  if (!payload || !payload.id) {
    if (isPublic) return NextResponse.next();
    
    const loginUrl = new URL('/institution/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    
    // Cleanup invalid tokens
    res.cookies.set(AUTH_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    res.cookies.set('institution_token', '', { maxAge: 0, path: '/' });
    return res;
  }

  const userRole = (payload.role as string).toUpperCase();
  const institutionId = payload.institution_id as string;
  const programId = payload.program_id as string;
  const dashboardPath = getRoleDashboardPath(userRole, programId);

  // 6. Support for Logged In users hitting public login pages
  if (isPublic) {
    if (pathname === '/institution/login') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    return NextResponse.next();
  }

  // 7. Role-Based "Zero-Trust" Wall
  
  // Super/Institute Logic
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/dashboard')) {
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  if (pathname.startsWith('/institution') && !pathname.startsWith('/institution/login')) {
    if (userRole !== 'INSTITUTE_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  if (pathname.startsWith('/program')) {
    if (userRole !== 'PROGRAM_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'INSTITUTE_ADMIN') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  // 8. Context Injection & Security Transformation
  const requestHeaders = new Headers(request.headers);
  if (institutionId) requestHeaders.set('x-institution-id', institutionId);
  if (programId) requestHeaders.set('x-program-id', programId);
  requestHeaders.set('x-user-role', userRole);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Optimize CSP: Combined and compressed
  const csp = `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data:; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; block-all-mixed-content; connect-src 'self' https://*.supabase.co https://*.supabase.in https://ncofwpuabtxddvdjljgj.supabase.co;`;
  
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

