import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Bypass middleware for integration tests targeting the test schema.
  // Restricted to non-production so this can never be used against real
  // deployments — process.env.NODE_ENV is 'production' on every Vercel
  // deployment (including Preview), and 'development' under `next dev`,
  // which is what the local test suite runs against.
  if (process.env.NODE_ENV !== 'production' && request.headers.get('x-supabase-schema') === 'test') {
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

  // Mobile clients send no cookies, only a bearer token. Verify it here
  // (rather than blindly bypassing) since several API routes below rely on
  // this middleware as their only auth gate and have no requireAuth() call
  // of their own - a blind bypass would let any request bearing an
  // Authorization header through to those routes unauthenticated. A valid
  // token skips the cookie/profile-status redirect logic entirely since
  // that's built for HTML-navigable clients; status gating for bearer
  // requests happens in getAuthUser() and via the mobile app's own /api/me
  // check after login.
  const bearerMatch = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) {
    const { data: { user: bearerUser } } = await supabase.auth.getUser(bearerMatch[1])
    if (!bearerUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that do not require authentication
  const publicRoutes = ['/login', '/auth/callback', '/set-password', '/setup', '/api/setup']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && !isPublicRoute) {
    try {
      const setupCheckResponse = await fetch(
        `${request.nextUrl.origin}/api/setup`,
        { headers: { 'Cookie': request.headers.get('cookie') || '' } }
      )
      const setupData = await setupCheckResponse.json()

      if (setupData.setupRequired) {
        if (request.nextUrl.pathname !== '/setup') {
          const url = request.nextUrl.clone()
          url.pathname = '/setup'
          return NextResponse.redirect(url)
        }
        return supabaseResponse
      }
    } catch {
      // If setup check fails, fall through to normal login redirect
    }

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
