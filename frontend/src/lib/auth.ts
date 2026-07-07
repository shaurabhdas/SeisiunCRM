import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export type AuthUser = {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'manager' | 'rep' | 'pending'
  status: 'active' | 'revoked' | 'pending'
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Under testing, fallback to a mock Super Admin user if no active session
    if (schema === 'test') {
      return {
        id: '6700f943-dd13-4df5-a2f6-bd56841ab7ef', // test admin id matching test database entries
        email: 'shaurabh.franciscan21@gmail.com',
        full_name: 'Shaurabh Das',
        role: 'super_admin',
        status: 'active'
      }
    }
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, status, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'active') return null

  return {
    id: user.id,
    email: user.email!,
    full_name: profile.full_name || user.email!,
    role: profile.role,
    status: profile.status,
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
