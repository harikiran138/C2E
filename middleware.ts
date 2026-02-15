import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // 1. Protected routes check
  const isProtectedPath = request.nextUrl.pathname.startsWith('/institution/dashboard') ||
                          request.nextUrl.pathname.startsWith('/institution/onboarding') ||
                          request.nextUrl.pathname.startsWith('/institution/details') ||
                          request.nextUrl.pathname.startsWith('/institution/programs') ||
                          request.nextUrl.pathname.startsWith('/institution/peos') ||
                          request.nextUrl.pathname.startsWith('/institution/feedback')

  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL('/institution/login', request.url))
  }

  // 2. Onboarding status check
  if (user) {
    try {
      const { data: institution, error: dbError } = await supabase
        .from('institutions')
        .select('onboarding_status')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle to avoid errors if record doesn't exist yet

      if (dbError) {
        console.error('Middleware DB Error:', dbError)
        // If there's a DB error, we might still want to allow access if they are on a safe path, 
        // but for now let's just proceed to avoid blocking the user entirely
        return response
      }

      const status = institution?.onboarding_status
      const effectiveStatus = status || 'PENDING'
      const isDashboardArea =
        request.nextUrl.pathname.startsWith('/institution/dashboard') ||
        request.nextUrl.pathname.startsWith('/institution/details') ||
        request.nextUrl.pathname.startsWith('/institution/programs') ||
        request.nextUrl.pathname.startsWith('/institution/peos') ||
        request.nextUrl.pathname.startsWith('/institution/feedback');

      console.log(`Middleware Trace: User=${user.email}, Status=${effectiveStatus}, Path=${request.nextUrl.pathname}`)

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
