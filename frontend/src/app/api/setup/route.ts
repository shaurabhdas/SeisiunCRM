import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to check user status.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    setupRequired: !users || users.length === 0,
  })
}

export async function POST(request: Request) {
  const { secret, email, password, fullName } = await request.json()

  if (!process.env.SETUP_SECRET) {
    return NextResponse.json(
      { error: 'Setup secret is not configured on the server. Add SETUP_SECRET to your environment variables.' },
      { status: 500 }
    )
  }

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json(
      { error: 'Invalid setup secret. Check with your system administrator.' },
      { status: 403 }
    )
  }

  const { data: { users } } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  })

  if (users && users.length > 0) {
    return NextResponse.json(
      { error: 'Setup has already been completed. The system already has users.' },
      { status: 400 }
    )
  }

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: 'Email, password, and full name are all required.' },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  if (!/[A-Z]/.test(password)) {
    return NextResponse.json(
      { error: 'Password must contain at least one uppercase letter.' },
      { status: 400 }
    )
  }

  if (!/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: 'Password must contain at least one number.' },
      { status: 400 }
    )
  }

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) {
    return NextResponse.json(
      { error: `Failed to create account: ${createError.message}` },
      { status: 500 }
    )
  }

  const { error: profileError } = await adminClient
    .from('user_profiles')
    .upsert({
      id: userData.user.id,
      email: userData.user.email,
      full_name: fullName,
      role: 'super_admin',
      status: 'active',
      password_set: true,
    })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json(
      { error: 'Account created but profile setup failed. The account has been rolled back. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Super Admin account created. You can now sign in.',
  })
}
