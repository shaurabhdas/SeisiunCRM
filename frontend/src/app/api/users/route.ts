import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.status !== 'active') {
    return null
  }
  return user
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, status, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json(profiles)
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, full_name, role, mode, password } = await request.json()

  if (!email || !role) {
    return NextResponse.json(
      { error: 'Email and role are required' },
      { status: 400 }
    )
  }

  const validRoles = ['manager', 'rep']
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: 'Role must be manager or rep. Super Admin cannot be assigned via invite.' },
      { status: 400 }
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (mode === 'password') {
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }
    if (password.length > 15) {
      return NextResponse.json(
        { error: 'Password must be at most 15 characters long.' },
        { status: 400 }
      )
    }

    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' }
    })

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ role, status: 'active', full_name: full_name || '' })
      .eq('id', userData.user.id)

    if (profileError) {
      return NextResponse.json(
        { error: 'User created but role assignment failed. Check user_profiles manually.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, userId: userData.user.id, mode: 'password' }, { status: 201 })
  }

  // Mode: link (default) - Generate setup link without relying on Supabase SMTP
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: full_name || '' },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  })

  if (linkError) {
    return NextResponse.json(
      { error: linkError.message },
      { status: 500 }
    )
  }

  const { error: profileError } = await adminClient
    .from('user_profiles')
    .update({ role, status: 'active', full_name: full_name || '' })
    .eq('id', linkData.user.id)

  if (profileError) {
    return NextResponse.json(
      { error: 'User created but role assignment failed. Check user_profiles manually.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    userId: linkData.user.id,
    mode: 'link',
    actionLink: linkData.properties?.action_link
  }, { status: 201 })
}
