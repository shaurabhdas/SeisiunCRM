import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export type AuthUser = {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'manager' | 'rep' | 'pending'
  status: 'active' | 'revoked' | 'pending'
  password_set: boolean
}

async function getAuthUserClient() {
  const cookieStore = await cookies()
  const headerList = await headers()
  const schema = headerList.get('x-supabase-schema') || 'public'

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component context
          }
        },
      },
    }
  )
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const headerList = await headers()
  const schema = headerList.get('x-supabase-schema') || 'public'

  const supabase = await getAuthUserClient()

  // Mobile clients have no cookie session - they authenticate against Supabase
  // Auth directly and send the resulting access token as a bearer header.
  // Passing the token explicitly to getUser() verifies it statelessly against
  // Supabase's Auth server, bypassing the cookie storage adapter entirely.
  const bearerMatch = headerList.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  const { data: { user } } = bearerMatch
    ? await supabase.auth.getUser(bearerMatch[1])
    : await supabase.auth.getUser()

  if (!user) {
    // Under testing, fallback to a mock Super Admin user if no active session.
    // Restricted to non-production so this can never authenticate a real
    // deployment — see the matching check in lib/supabase/middleware.ts.
    if (schema === 'test' && process.env.NODE_ENV !== 'production') {
      return {
        id: '6700f943-dd13-4df5-a2f6-bd56841ab7ef', // test admin id matching test database entries
        email: 'shaurabh.franciscan21@gmail.com',
        full_name: 'Shaurabh Das',
        role: 'super_admin',
        status: 'active',
        password_set: true
      }
    }
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, status, full_name, password_set')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'active') return null

  return {
    id: user.id,
    email: user.email!,
    full_name: profile.full_name || user.email!,
    role: profile.role,
    status: profile.status,
    password_set: profile.password_set,
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export function isManagerOrAbove(role: string): boolean {
  return role === 'super_admin' || role === 'manager'
}

// True if the user is a manager/super_admin (always allowed) or the record's
// owner (assigned_rep_id for leads/deals, created_by for accounts).
export function canModifyRecord(user: AuthUser, ownerId: string | null | undefined): boolean {
  if (isManagerOrAbove(user.role)) return true
  return !!ownerId && ownerId === user.id
}
