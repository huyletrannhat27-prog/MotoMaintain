import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isConfigured } from '@/lib/config'

export async function updateSession(request: NextRequest) {
  if (!isConfigured) return NextResponse.next({ request })
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected routes
  const protectedRoutes = [
    '/dashboard',
    '/input',
    '/history',
    '/schedule',
    '/tips',
    '/stores',
    '/info',
    '/admin',
    '/vehicles',
    '/profile',
  ]

  const isProtected = protectedRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c))
    return response
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c))
    return response
  }

  return supabaseResponse
}
