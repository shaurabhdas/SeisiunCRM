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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, role } = body

  if (id === admin.id) {
    return NextResponse.json(
      { error: 'You cannot modify your own account.' },
      { status: 400 }
    )
  }

  if (action === 'assign_role') {
    if (!role || !['manager', 'rep'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be manager or rep.' },
        { status: 400 }
      )
    }

    const { error } = await adminClient
      .from('user_profiles')
      .update({ role, status: 'active' })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'revoke') {
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (profileError) {
      return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
    }

    const { error: signOutError } = await adminClient.auth.admin.signOut(id)
    if (signOutError) {
      return NextResponse.json(
        { error: 'Access revoked in database but session invalidation failed. User may remain logged in until token expires.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'restore') {
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ status: 'active' })
      .eq('id', id)

    if (profileError) {
      return NextResponse.json({ error: 'Failed to restore access' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'generate_link') {
    const { data: profile, error: profileErr } = await adminClient
      .from('user_profiles')
      .select('email')
      .eq('id', id)
      .single()

    if (profileErr || !profile?.email) {
      return NextResponse.json({ error: 'User profile email not found' }, { status: 404 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
      options: {
        redirectTo: `${siteUrl}/set-password`,
      }
    })

    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      actionLink: linkData.properties?.action_link
    })
  }

  if (action === 'reset_password') {
    const { password } = body
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(id, {
      password
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 }
    )
  }

  try {
    // 1. Set references in other tables to null to avoid foreign key violations
    await adminClient.from('leads').update({ assigned_rep_id: null, assigned_rep_name: null }).eq('assigned_rep_id', id)
    await adminClient.from('deals').update({ assigned_rep_id: null, assigned_rep_name: null }).eq('assigned_rep_id', id)
    await adminClient.from('lead_activities').update({ logged_by: null }).eq('logged_by', id)
    await adminClient.from('deal_activities').update({ logged_by: null }).eq('logged_by', id)
    await adminClient.from('lead_stage_history').update({ changed_by: null }).eq('changed_by', id)
    await adminClient.from('deal_stage_history').update({ changed_by: null }).eq('changed_by', id)

    // 2. Delete the user profile from user_profiles table
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    // 3. Delete the user from Supabase auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)
    if (authError) {
      return NextResponse.json({ error: 'Failed to delete user from authentication provider' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : JSON.stringify(err) }, { status: 500 })
  }
}

