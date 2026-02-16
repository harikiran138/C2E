import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import * as jose from 'jose';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isValidUrl = supabaseUrl.startsWith('http');

  const supabase = createServerClient(
    isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )


  const { data: { user } } = await supabase.auth.getUser()
  
  // [NEW] Custom Session Check
  let customUser: { id: string; email: string; role?: string; onboarding_status?: string } | null = null;
  const institutionToken = request.cookies.get('institution_token')?.value;
  
  if (institutionToken) {
    try {
        const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key');
        const { payload } = await jose.jwtVerify(institutionToken, secret);
        // If valid, we treat it as a logged-in user
        customUser = {
          id: payload.id as string,
          email: payload.email as string,
          role: payload.role as string | undefined,
          onboarding_status: payload.onboarding_status as string | undefined,
        };
        console.log('Middleware: Custom session valid for', customUser.email);
    } catch (e) {
        console.error('Middleware: Invalid custom token', e);
    }
  }

  // Prefer custom JWT session if present; fallback to Supabase user.
  const effectiveUser = customUser || (user ? { id: user.id, email: user.email || '' } : null);

  // 1. Protected routes check
  const isProtectedPath = request.nextUrl.pathname.startsWith('/institution/dashboard') ||
                          request.nextUrl.pathname.startsWith('/institution/onboarding') ||
                          request.nextUrl.pathname.startsWith('/institution/process') ||
                          request.nextUrl.pathname.startsWith('/institution/details') ||
                          request.nextUrl.pathname.startsWith('/institution/programs') ||
                          request.nextUrl.pathname.startsWith('/institution/peos') ||
                          request.nextUrl.pathname.startsWith('/institution/feedback')

  if (!effectiveUser && isProtectedPath) {
    return NextResponse.redirect(new URL('/institution/login', request.url))
  }

  // 2. Onboarding status check
  if (effectiveUser) {
    try {
      let effectiveStatus = customUser?.onboarding_status || 'PENDING';
      if (!customUser && user) {
        const { data: institution, error: dbError } = await supabase
          .from('institutions')
          .select('onboarding_status')
          .eq('id', user.id)
          .maybeSingle();

        if (!dbError && institution?.onboarding_status) {
          effectiveStatus = institution.onboarding_status;
        }
      }
      
      const isDashboardArea =
        request.nextUrl.pathname.startsWith('/institution/dashboard') ||
        request.nextUrl.pathname.startsWith('/institution/process') ||
        request.nextUrl.pathname.startsWith('/institution/details') ||
        request.nextUrl.pathname.startsWith('/institution/programs') ||
        request.nextUrl.pathname.startsWith('/institution/peos') ||
        request.nextUrl.pathname.startsWith('/institution/feedback');

      console.log(`Middleware Trace: User=${effectiveUser.email}, Status=${effectiveStatus}, Path=${request.nextUrl.pathname}`)

      if (isDashboardArea && effectiveStatus !== 'COMPLETED') {
        return NextResponse.redirect(new URL('/institution/onboarding', request.url))
      }

      if (request.nextUrl.pathname.startsWith('/institution/onboarding')) {
        if (effectiveStatus === 'COMPLETED') {
          return NextResponse.redirect(new URL('/institution/dashboard', request.url))
        }
      }
      
      if (request.nextUrl.pathname === '/institution/login') {
         if (effectiveStatus === 'COMPLETED') {
           return NextResponse.redirect(new URL('/institution/dashboard', request.url))
         } else {
           return NextResponse.redirect(new URL('/institution/onboarding', request.url))
         }
      }
    } catch (e) {
      console.error('Middleware Processing Exception:', e)
    }
  }

  return response

}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
