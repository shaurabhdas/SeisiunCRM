import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ws from 'ws'

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws as any }
  }
)

export async function PUT(request: Request) {
  try {
    const authUser = await requireAuth()
    const { full_name } = await request.json()

    if (!full_name || full_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Full name cannot be empty.' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const headerList = await headers()
    const schema = headerList.get('x-supabase-schema') || 'public'

    const supabase = createServerClient(
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

    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: full_name.trim(), updated_at: new Date().toISOString() })
      .eq('id', authUser.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth()
    const { action } = await request.json()

    if (action === 'sign_out_everywhere') {
      const { error } = await adminClient.auth.admin.signOut(authUser.id)
      if (error) {
        return NextResponse.json({ error: 'Failed to sign out everywhere' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
