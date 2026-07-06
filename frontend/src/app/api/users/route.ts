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

  const { email, full_name, role } = await request.json()

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

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: full_name || '' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    }
  )

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message },
      { status: 500 }
    )
  }

  const { error: profileError } = await adminClient
    .from('user_profiles')
    .update({ role, status: 'active', full_name: full_name || '' })
    .eq('id', inviteData.user.id)

  if (profileError) {
    return NextResponse.json(
      { error: 'User invited but role assignment failed. Check user_profiles manually.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, userId: inviteData.user.id }, { status: 201 })
}
