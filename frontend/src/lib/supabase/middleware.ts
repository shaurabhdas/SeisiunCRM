import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  console.log("MIDDLEWARE RUN:", request.nextUrl.pathname, "SCHEMA HEADER:", request.headers.get('x-supabase-schema'))

  // Bypass middleware for integration tests targeting test schema
  if (request.headers.get('x-supabase-schema') === 'test') {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that do not require authentication
  const publicRoutes = ['/login', '/auth/callback', '/set-password']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && !isPublicRoute) {
    // Check user profile status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, status, password_set')
      .eq('id', user.id)
      .single()

    // If profile does not exist yet or status is pending, redirect to pending screen
    if (!profile || profile.status === 'pending') {
      if (request.nextUrl.pathname !== '/pending') {
        const url = request.nextUrl.clone()
        url.pathname = '/pending'
        return NextResponse.redirect(url)
      }
    }

    // If status is revoked, sign out immediately
    if (profile && profile.status === 'revoked') {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'access_revoked')
      return NextResponse.redirect(url)
    }

    // If password is not set, force redirect to set-password
    if (profile && profile.status === 'active' && !profile.password_set && request.nextUrl.pathname !== '/set-password') {
      const url = request.nextUrl.clone()
      url.pathname = '/set-password'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
